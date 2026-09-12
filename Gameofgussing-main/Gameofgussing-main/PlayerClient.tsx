import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, update, get, onDisconnect, set, remove } from 'firebase/database';
import { firebaseConfig } from './firebaseConfig';
import type { Player } from './types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

type PlayerLocalState = 'CONNECTING' | 'JOINING' | 'WAITING' | 'PROMPTING' | 'SUBMITTED' | 'RESULTS' | 'GAME_NOT_FOUND';

// Helper to get or create a player ID for the browser session
const getPlayerId = (): string => {
  let playerId = localStorage.getItem('playerId');
  if (!playerId) {
    playerId = `player_${crypto.randomUUID()}`;
    localStorage.setItem('playerId', playerId);
  }
  return playerId;
};


const PlayerClient: React.FC<{ gameId: string }> = ({ gameId }) => {
  const [localState, setLocalState] = useState<PlayerLocalState>('CONNECTING');
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('playerName') || '');
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const playerId = useMemo(() => getPlayerId(), []);
  const gameRef = useMemo(() => ref(database, `games/${gameId}`), [gameId]);
  const playerRef = useMemo(() => ref(database, `games/${gameId}/players/${playerId}`), [gameId, playerId]);
  
  useEffect(() => {
    let unsubscribe: () => void;
    
    // Check if game exists
    get(gameRef).then((snapshot) => {
      if (!snapshot.exists()) {
        setLocalState('GAME_NOT_FOUND');
        return;
      }
      
      // Listen for game state changes
      unsubscribe = onValue(gameRef, (snap) => {
        const gameData = snap.val();
        if (!gameData) {
          setLocalState('GAME_NOT_FOUND');
          return;
        }
        
        const playerExists = gameData.players && gameData.players[playerId];
        
        if (!playerExists) {
          setLocalState('JOINING');
        } else {
          switch (gameData.gameState) {
            case 'LOBBY':
              setLocalState('WAITING');
              break;
            case 'PROMPTING':
              setLocalState(gameData.players[playerId].submitted ? 'SUBMITTED' : 'PROMPTING');
              break;
            case 'ANALYZING':
              setLocalState('SUBMITTED');
              break;
            case 'RESULTS':
              setLocalState('RESULTS');
              break;
          }
        }
      });
    }).catch(err => {
        console.error("Error connecting to game:", err);
        setError("Could not connect to the server.");
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [gameId, playerId, gameRef]);

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setError('Please enter your name.');
      return;
    }
    setError(null);
    localStorage.setItem('playerName', playerName);

    const newPlayer: Player = {
      id: playerId,
      name: playerName.trim(),
      prompt: '',
      submitted: false,
      result: null,
      generatedImage: null
    };

    try {
      await set(playerRef, newPlayer);
      // If the player disconnects (e.g., closes tab), remove them from the game.
      await onDisconnect(playerRef).remove();
    } catch (err) {
      console.error(err);
      setError('Could not join the game. Please try again.');
    }
  };
  
  const handleSubmitPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setError('Please enter a prompt.');
      return;
    }
    setError(null);
    
    try {
      await update(playerRef, { prompt: prompt.trim(), submitted: true });
    } catch (err) {
      console.error(err);
      setError('Could not submit prompt. Please try again.');
    }
  };

  const renderContent = () => {
    switch (localState) {
      case 'CONNECTING':
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-300">Connecting...</h2>
            <p className="text-slate-400 mt-2">Attempting to join the game session.</p>
          </div>
        );
      case 'GAME_NOT_FOUND':
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-400">Game Not Found</h2>
            <p className="text-slate-400 mt-2">The game session ({gameId}) could not be found. It may have ended or the link is incorrect.</p>
          </div>
        );
      case 'JOINING':
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-cyan-300">Join Game</h2>
            <p className="text-slate-400 mt-2 mb-6">Enter your name to join the battle!</p>
            <form onSubmit={handleJoinGame} className="space-y-4">
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Your Name"
                className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
                aria-label="Your Name"
                autoFocus
              />
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                Join
              </button>
            </form>
          </div>
        );
      case 'WAITING':
        return (
          <div className="text-center animate-fade-in">
            <h2 className="text-2xl font-bold text-green-400">You're in, {playerName}!</h2>
            <p className="text-slate-400 mt-2">Look at the main screen. The game will begin shortly...</p>
          </div>
        );
      case 'PROMPTING':
        return (
          <div className="text-center animate-fade-in">
            <h2 className="text-2xl font-bold text-cyan-300">Describe the Image!</h2>
            <p className="text-slate-400 mt-2 mb-6">Look at the main screen and write a prompt to generate the image you see.</p>
            <form onSubmit={handleSubmitPrompt} className="space-y-4">
               <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Write your descriptive prompt here..."
                className="w-full h-40 p-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all resize-none"
                aria-label="Image Prompt"
                autoFocus
              />
              <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                Submit Prompt
              </button>
            </form>
          </div>
        );
      case 'SUBMITTED':
      case 'RESULTS':
          return (
            <div className="text-center animate-fade-in">
              <h2 className="text-2xl font-bold text-green-400">
                {localState === 'SUBMITTED' ? 'Prompt Submitted!' : 'Game Over!'}
              </h2>
              <p className="text-slate-400 mt-2">
                {localState === 'SUBMITTED' 
                  ? 'Your prompt has been received. Check the main screen for the results!' 
                  : 'The results are on the main screen. Thanks for playing!'}
              </p>
            </div>
          );
    }
  };

  return (
    <div className="w-full max-w-md bg-slate-800/50 border border-slate-700 rounded-xl shadow-lg p-8">
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center mb-6" role="alert">
          <p>{error}</p>
        </div>
      )}
      {renderContent()}
    </div>
  );
};

export default PlayerClient;