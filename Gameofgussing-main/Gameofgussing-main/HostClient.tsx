import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, update, onDisconnect } from 'firebase/database';
import { firebaseConfig } from './firebaseConfig';
import type { ImageTask, Difficulty, Player } from './types';
import { IMAGE_PROMPTS } from './constants';
import { analyzePrompt, generateImage } from './services/geminiService';
import PromptCard from './components/PromptCard';
import ResultsDisplay from './components/ResultsDisplay';
import DifficultySelector from './components/DifficultySelector';
import Lobby from './components/Lobby';

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

type GameState = 'LOBBY' | 'PROMPTING' | 'ANALYZING' | 'RESULTS';

interface GameData {
  gameState: GameState;
  difficulty: Difficulty;
  currentTask: ImageTask;
  targetImage: string | null;
  players: Record<string, Player>;
  winners: string[];
}

const getRandomTask = (difficulty: Difficulty): ImageTask => {
  const taskPool = IMAGE_PROMPTS[difficulty];
  return taskPool[Math.floor(Math.random() * taskPool.length)];
};

const HostClient: React.FC = () => {
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  
  const gameId = useMemo(() => crypto.randomUUID(), []);
  const gameRef = useMemo(() => ref(database, `games/${gameId}`), [gameId]);
  
  const joinUrl = useMemo(() => {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('gameId', gameId);
    return url.href;
  }, [gameId]);

  const isLocalhost = useMemo(() => window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1', []);

  // Effect to create and sync game state
  useEffect(() => {
    const initialDifficulty: Difficulty = 'Medium';
    const initialTask = getRandomTask(initialDifficulty);
    const initialGameState: GameData = {
      gameState: 'LOBBY',
      difficulty: initialDifficulty,
      currentTask: initialTask,
      targetImage: null,
      players: {},
      winners: [],
    };

    set(gameRef, initialGameState).catch(err => {
      console.error("Firebase write error:", err);
      setError("Could not connect to the database. Please check your Firebase configuration.");
    });
    
    const unsubscribe = onValue(gameRef, (snapshot) => {
      if (snapshot.exists()) {
        setGameData(snapshot.val());
      } else {
        setGameData(null);
      }
    }, (error) => {
      console.error(error);
      setError("Error listening to game state. The connection may have been lost.");
    });
    
    // Clean up on component unmount
    return () => {
      unsubscribe();
      set(gameRef, null); // Optional: remove game from DB when host leaves
    };
  }, [gameRef]);


  const analyzeAndSetResults = useCallback(async () => {
    if (!gameData || !gameData.players) return;
    
    setIsBusy(true);
    await update(gameRef, { gameState: 'ANALYZING' });
    setError(null);
    
    const currentPlayers = Object.values(gameData.players);

    try {
      const analysisPromises = currentPlayers.map(player =>
        analyzePrompt(gameData.currentTask.prompt, player.prompt)
      );
      const imageGenerationPromises = currentPlayers.map(player =>
        generateImage(player.prompt)
      );

      const [analysisResults, imageResults] = await Promise.all([
        Promise.all(analysisPromises),
        Promise.all(imageGenerationPromises)
      ]);

      let highestAccuracy = 0;
      const updatedPlayersData: Record<string, Player> = {};
      
      currentPlayers.forEach((player, index) => {
        const accuracy = analysisResults[index].accuracy;
        if (accuracy > highestAccuracy) {
          highestAccuracy = accuracy;
        }
        updatedPlayersData[player.id] = {
          ...player,
          result: analysisResults[index],
          generatedImage: `data:image/png;base64,${imageResults[index]}`,
        };
      });
      
      const newWinners = Object.values(updatedPlayersData)
        .filter(p => p.result && p.result.accuracy === highestAccuracy)
        .map(p => p.name);

      await update(gameRef, { 
        players: updatedPlayersData,
        winners: newWinners,
        gameState: 'RESULTS'
      });

    } catch (err) {
      console.error(err);
      setError('Failed to analyze prompts. Please check your API key and try again.');
      await update(gameRef, { gameState: 'PROMPTING' }); // Revert state
    } finally {
      setIsBusy(false);
    }
  }, [gameData, gameRef]);
  
  // Effect to automatically trigger analysis when all players have submitted
  useEffect(() => {
    if (gameData?.gameState === 'PROMPTING' && gameData.players) {
      const playersList = Object.values(gameData.players);
      if (playersList.length > 0 && playersList.every(p => p.submitted)) {
        analyzeAndSetResults();
      }
    }
  }, [gameData, analyzeAndSetResults]);

  const handleStartGame = async () => {
    if (!gameData?.players || Object.keys(gameData.players).length === 0) {
      setError("Wait for players to join before starting the game.");
      return;
    }
    setError(null);
    setIsBusy(true);

    try {
      await update(gameRef, { gameState: 'PROMPTING' });
      const imageData = await generateImage(gameData.currentTask.prompt);
      await update(gameRef, { targetImage: `data:image/png;base64,${imageData}` });
    } catch (err) {
      console.error(err);
      setError('Failed to generate the mission image. Please try again.');
      await update(gameRef, { gameState: 'LOBBY' }); // Revert state
    } finally {
      setIsBusy(false);
    }
  };

  const handleResetGame = () => {
    if (!gameData) return;
    const nextTask = getRandomTask(gameData.difficulty);
    const playersReset = Object.entries(gameData.players).reduce((acc, [id, player]) => {
      acc[id] = { ...player, prompt: '', result: null, generatedImage: null, submitted: false };
      return acc;
    }, {} as Record<string, Player>);

    update(gameRef, {
      currentTask: nextTask,
      players: playersReset,
      targetImage: null,
      winners: [],
      gameState: 'LOBBY',
    });
  };

  const handleDifficultyChange = (newDifficulty: Difficulty) => {
    if (!gameData || gameData.difficulty === newDifficulty) return;
    const nextTask = getRandomTask(newDifficulty);
    update(gameRef, {
      difficulty: newDifficulty,
      currentTask: nextTask,
    });
  };
  
  if (!gameData) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold">Connecting to game server...</h2>
        <p className="text-slate-400 mt-2">Please wait.</p>
        {error && <p className="text-red-400 mt-4">{error}</p>}
      </div>
    );
  }

  const { gameState, difficulty, players, winners, targetImage, currentTask } = gameData;
  const isGameBusy = isBusy || gameState === 'ANALYZING';
  const playersList = players ? Object.values(players) : [];

  const renderGameState = () => {
    switch(gameState) {
      case 'LOBBY':
        return (
          <Lobby 
            players={playersList}
            onStartGame={handleStartGame}
            joinUrl={joinUrl}
            isLocalhost={isLocalhost}
          />
        );
      case 'PROMPTING':
      case 'ANALYZING':
        return (
          <>
            <PromptCard 
              image={targetImage} 
              isLoading={!targetImage}
              taskTitle={currentTask.title}
            />
            <div className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-4">
              <h3 className="text-xl font-bold text-center text-slate-200">
                {gameState === 'ANALYZING' ? 'Analyzing Prompts...' : 'Waiting for Players to Submit...'}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {playersList.map(player => (
                  <div key={player.id} className={`p-3 rounded-lg text-center border-2 transition-all ${player.submitted ? 'bg-green-500/10 border-green-500/50' : 'bg-slate-700/50 border-slate-600'}`}>
                    <p className="font-semibold text-slate-200 truncate">{player.name}</p>
                    <p className={`text-sm font-medium ${player.submitted ? 'text-green-400' : 'text-slate-400'}`}>{player.submitted ? 'Submitted ✓' : 'Typing...'}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        );
      case 'RESULTS':
        return (
          <>
            <PromptCard 
              image={targetImage} 
              isLoading={false}
              taskTitle={currentTask.title}
            />
            <ResultsDisplay 
              players={playersList}
              winners={winners}
              isLoading={false} 
              onNextTask={handleResetGame} 
            />
          </>
        );
    }
  }

  return (
    <div className="w-full max-w-4xl space-y-8">
      <DifficultySelector
        selectedDifficulty={difficulty}
        onSelectDifficulty={handleDifficultyChange}
        disabled={isGameBusy || gameState !== 'LOBBY'}
      />
      
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center" role="alert">
          <p>{error}</p>
        </div>
      )}

      {renderGameState()}
    </div>
  );
};

export default HostClient;