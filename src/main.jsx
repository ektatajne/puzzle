import React, { useState, useEffect, useCallback, useRef } from "react";
import { createRoot } from "react-dom/client";
import { supabase, DEFAULT_AI_IMAGES } from "./config/supabase";
import { ToastProvider, useToast } from "./components/common/Toast";
import { AdminLayout } from "./components/admin/AdminLayout";
import { PlayerApp } from "./components/player/PlayerApp";
import { BigScreenDisplay } from "./components/display/BigScreenDisplay";
import { fetchActivePlayers, fetchRoundResults, removePlayerFromDb, resetRoomPlayersInDb, evaluateTournamentRound, saveGameImageInDb, updateActiveGameStateInDb } from "./utils/db";
import { compressImageFile } from "./utils/puzzleEngine";
import "./style.css";


function RootApp() {
  const pathname = window.location.pathname.toLowerCase();
  const queryParams = new URLSearchParams(window.location.search);

  const isAdmin = pathname.startsWith("/admin") || queryParams.get("admin") === "1";
  const isDisplay = pathname.startsWith("/display") || queryParams.get("display") === "1";
  const roomCode = (queryParams.get("room") || "EXPO26").toUpperCase();

  const { addToast } = useToast();

  // NO FAKE PLAYERS OR HARDCODED DEMO DATA - REAL REALTIME & DATABASE STATE ONLY
  const [images, setImages] = useState(DEFAULT_AI_IMAGES);
  const [activeImage, setActiveImage] = useState(DEFAULT_AI_IMAGES[0]);

  const [gameState, setGameState] = useState({
    roomCode: roomCode,
    phase: "LOBBY", // LOBBY, ROUND_STARTING, MEMORY, COUNTDOWN, PUZZLE, RESULT, FINAL_RESULTS, FINISHED
    round: 1,
    totalRounds: 1,
    image: DEFAULT_AI_IMAGES[0]?.public_url || null,
    imageName: DEFAULT_AI_IMAGES[0]?.name || "Friendly AI Robot",
    pieces: 16,
    difficulty: "MEDIUM",
    memory: 20,
    puzzle: 45,
    startAt: Date.now(),
    isPaused: false,
    finalWinner: null
  });

  const [players, setPlayers] = useState([]);
  const [results, setResults] = useState([]);
  const [gameHistory, setGameHistory] = useState([]);

  // Ref tracking for active gameState and round timers
  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const roundTimeoutsRef = useRef([]);

  const clearAllRoundTimeouts = () => {
    if (roundTimeoutsRef.current) {
      roundTimeoutsRef.current.forEach((id) => clearTimeout(id));
      roundTimeoutsRef.current = [];
    }
  };

  // Tournament Elimination Evaluator
  const finishAndEvaluateRound = useCallback(async (roundNum) => {
    // Evaluation Guard 1: Verify target round matches current active round
    if (gameStateRef.current && Number(gameStateRef.current.round) !== Number(roundNum)) {
      console.log(`[Evaluation Guard] Skipping evaluation for round ${roundNum} because active round is ${gameStateRef.current.round}`);
      return;
    }

    // 1. Brief 500ms stabilization window for any in-flight completion broadcast or DB insert to land
    await new Promise((r) => setTimeout(r, 500));

    // Evaluation Guard 2: Re-verify after stabilization delay
    if (gameStateRef.current && Number(gameStateRef.current.round) !== Number(roundNum)) {
      console.log(`[Evaluation Guard] Skipping post-delay evaluation for round ${roundNum} because active round changed`);
      return;
    }

    // 2. Fetch fresh DB records & snapshot
    const dbResults = await fetchRoundResults(roomCode, roundNum);
    const freshPlayers = await fetchActivePlayers(roomCode);
    const activeSnapshot = freshPlayers.length > 0 ? freshPlayers : players;

    // 3. Robustly merge DB results AND in-memory socket broadcast results
    const mergedMap = new Map();

    (results || []).forEach((r) => {
      if (!r) return;
      const key = r.player_id || r.id || r.player_name || r.name;
      if (key) {
        mergedMap.set(key.toString().toLowerCase(), {
          ...r,
          time: Number(r.completion_time || r.time || 0),
          round_number: r.round_number || roundNum
        });
      }
    });

    (dbResults || []).forEach((r) => {
      if (!r) return;
      const key = r.player_id || r.id || r.player_name || r.name;
      if (key) {
        mergedMap.set(key.toString().toLowerCase(), {
          ...r,
          time: Number(r.completion_time || r.time || 0),
          round_number: r.round_number || roundNum
        });
      }
    });

    const combinedResults = Array.from(mergedMap.values());

    const evaluation = await evaluateTournamentRound({
      roomCode,
      roundNumber: roundNum,
      allPlayers: activeSnapshot,
      roundResults: combinedResults
    });

    const { advancingPlayers, eliminatedPlayers, finalWinner } = evaluation;

    setPlayers((prev) =>
      prev.map((p) => {
        const pId = (p.id || p.player_id || "").toString().toLowerCase();
        const pName = (p.name || p.player_name || "").toString().toLowerCase();

        const isCompletedPlayer = combinedResults.some((r) => {
          const rId = (r.player_id || r.id || "").toString().toLowerCase();
          const rName = (r.player_name || r.name || "").toString().toLowerCase();
          return (rId && rId === pId) || (rName && rName === pName);
        });

        const isWinner = finalWinner && (
          (finalWinner.id && finalWinner.id.toString().toLowerCase() === pId) ||
          (finalWinner.player_id && finalWinner.player_id.toString().toLowerCase() === pId) ||
          (finalWinner.name && finalWinner.name.toString().toLowerCase() === pName)
        );

        const isEliminated = !isCompletedPlayer && eliminatedPlayers.some((e) => {
          const eId = (e.id || e.player_id || "").toString().toLowerCase();
          const eName = (e.name || e.player_name || "").toString().toLowerCase();
          return (eId && eId === pId) || (eName && eName === pName);
        });

        if (isWinner) return { ...p, status: "COMPLETED", tournament_status: "WINNER" };
        if (isCompletedPlayer) return { ...p, status: "COMPLETED", tournament_status: p.tournament_status === "WINNER" ? "WINNER" : "ACTIVE" };
        if (isEliminated) return { ...p, status: "ELIMINATED", tournament_status: "ELIMINATED", eliminated_in_round: roundNum };
        return { ...p, tournament_status: "ACTIVE" };
      })
    );

    const isFinal = Boolean(finalWinner);
    const nextPhase = isFinal ? "FINAL_RESULTS" : "RESULT";

    const resultPayload = {
      ...gameState,
      phase: nextPhase,
      round: roundNum,
      finalWinner: finalWinner || null,
      advancingCount: advancingPlayers.length,
      eliminatedCount: eliminatedPlayers.length,
      startAt: Date.now()
    };

    setGameState(resultPayload);

    if (supabase) {
      const channel = supabase.channel(`memory-rush-${roomCode}`);
      await channel.send({ type: "broadcast", event: "game", payload: resultPayload });
      await channel.send({ type: "broadcast", event: "tournament_evaluation", payload: evaluation });
    }

    if (isFinal && finalWinner) {
      addToast(`👑 TOURNAMENT CHAMPION: ${finalWinner.name || finalWinner.player_name}!`, "trophy");
    } else {
      addToast(`Round ${roundNum} finished! ${advancingPlayers.length} advanced, ${eliminatedPlayers.length} eliminated.`, "info");
    }
  }, [roomCode, players, results, gameState, addToast]);

  // Fetch or create initial active game ID from Supabase
  useEffect(() => {
    async function initGameSession() {
      const activeGame = await getOrCreateActiveGame(roomCode);
      if (activeGame?.id) {
        setGameState((prev) => {
          if (activeGame.game_state && activeGame.game_state.startAt) {
            return { ...activeGame.game_state, gameId: activeGame.id, roomCode };
          }
          return { ...prev, gameId: activeGame.id };
        });
      }
    }
    initGameSession();
  }, [roomCode]);

  // Fetch active images from Supabase Postgres if connected
  useEffect(() => {
    async function loadImages() {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from("game_images")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          const merged = [
            ...data,
            ...DEFAULT_AI_IMAGES.filter((def) => !data.some((d) => d.public_url === def.public_url))
          ];
          setImages(merged);
        }
      } catch (e) {
        console.log("Using local AI starter images.");
      }
    }
    loadImages();
  }, []);

  // Fetch persistent player list & results snapshot from Supabase Postgres DB (scoped strictly by gameId)
  useEffect(() => {
    async function loadDbSnapshot() {
      const [dbPlayers, dbResults] = await Promise.all([
        fetchActivePlayers(roomCode, gameState.gameId),
        fetchRoundResults(roomCode, null, gameState.gameId)
      ]);
      if (dbPlayers) setPlayers(dbPlayers);
      if (dbResults) setResults(dbResults);
    }
    loadDbSnapshot();
  }, [roomCode, gameState.gameId]);

  // Fetch persistent game history from Supabase Postgres if available
  useEffect(() => {
    async function loadHistory() {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from("games")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data) {
          setGameHistory(data);
        }
      } catch (e) {
        console.log("History fetch error, starting clean.");
      }
    }
    loadHistory();
  }, []);

  // Supabase Realtime Postgres Changes & Broadcast listeners
  useEffect(() => {
    if (!supabase) return;

    // 1. Broadcast channel for instantaneous socket events
    const broadcastChannel = supabase.channel(`memory-rush-${roomCode}`);

    broadcastChannel.on("broadcast", { event: "join" }, ({ payload }) => {
      setPlayers((prev) => {
        if (prev.some((p) => p.id === payload.id)) {
          return prev.map((p) => (p.id === payload.id ? { ...p, connected: true, status: "WAITING" } : p));
        }
        addToast(`Real player joined: ${payload.name}`, "info");
        return [...prev, { ...payload, status: "WAITING", connected: true, total_score: 0, tournament_status: "ACTIVE" }];
      });
    });

    broadcastChannel.on("broadcast", { event: "finish" }, ({ payload }) => {
      const solveTime = Number(payload.time || payload.completion_time || 0);

      setResults((prev) => {
        if (prev.some((r) => r.id === payload.id || (r.player_id === payload.player_id && r.player_id))) return prev;

        const updatedList = [...prev, { ...payload, time: solveTime, completion_time: solveTime }].sort(
          (a, b) => Number(a.time || a.completion_time || 0) - Number(b.time || b.completion_time || 0)
        );

        const myIndex = updatedList.findIndex(
          (r) => r.id === payload.id || (r.player_id === payload.player_id && r.player_id)
        );
        const derivedRank = myIndex !== -1 ? myIndex + 1 : updatedList.length;
        const scoreEarned = derivedRank === 1 ? 100 : derivedRank === 2 ? 80 : derivedRank === 3 ? 65 : 50;

        const newRes = {
          ...payload,
          rank: derivedRank,
          score: scoreEarned,
          time: solveTime,
          completion_time: solveTime
        };

        broadcastChannel.send({ type: "broadcast", event: "result", payload: newRes });

        if (derivedRank === 1) {
          addToast(`🏆 ${payload.name || payload.player_name} finished #1 in ${solveTime.toFixed(2)}s!`, "trophy");
        } else {
          addToast(`✓ ${payload.name || payload.player_name} finished in ${solveTime.toFixed(2)}s`, "success");
        }

        return updatedList.map((item, idx) => ({
          ...item,
          rank: idx + 1,
          score: idx === 0 ? 100 : idx === 1 ? 80 : idx === 2 ? 65 : 50
        }));
      });

      setPlayers((prev) =>
        prev.map((p) => {
          const pId = (p.id || "").toString().toLowerCase();
          const targetId = (payload.player_id || payload.id || "").toString().toLowerCase();
          const pName = (p.name || "").toString().toLowerCase();
          const targetName = (payload.name || payload.player_name || "").toString().toLowerCase();

          if ((pId && pId === targetId) || (pName && pName === targetName)) {
            return {
              ...p,
              status: "COMPLETED",
              tournament_status: p.tournament_status === "WINNER" ? "WINNER" : "ACTIVE"
            };
          }
          return p;
        })
      );
    });

    broadcastChannel.subscribe();

    // 2. Postgres Changes listener for `players` DB reconciliation
    const dbPlayersChannel = supabase.channel(`db-players-${roomCode}`);

    dbPlayersChannel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "players", filter: `room_code=eq.${roomCode}` },
      (payload) => {
        if (payload.eventType === "INSERT") {
          setPlayers((prev) => {
            if (prev.some((p) => p.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        } else if (payload.eventType === "UPDATE") {
          setPlayers((prev) =>
            prev.map((p) => (p.id === payload.new.id ? { ...p, ...payload.new } : p))
          );
        } else if (payload.eventType === "DELETE") {
          setPlayers((prev) => prev.filter((p) => p.id !== payload.old.id));
        }
      }
    );

    dbPlayersChannel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        const freshPlayers = await fetchActivePlayers(roomCode);
        if (freshPlayers && freshPlayers.length >= 0) setPlayers(freshPlayers);
      }
    });

    // 3. Postgres Changes listener for `round_results` DB reconciliation
    const dbResultsChannel = supabase.channel(`db-results-${roomCode}`);

    dbResultsChannel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "round_results" },
      (payload) => {
        if (payload.eventType === "INSERT") {
          setResults((prev) => {
            if (prev.some((r) => r.id === payload.new.id)) return prev;
            const solveTime = Number(payload.new.completion_time || payload.new.time || 0);
            const nameStr = payload.new.player_name || payload.new.name || "Player";
            addToast(`✓ ${nameStr} completed puzzle in ${solveTime.toFixed(2)}s!`, "success");
            const newObj = {
              ...payload.new,
              time: solveTime,
              name: nameStr
            };
            return [...prev, newObj].sort((a, b) => (a.time || a.completion_time) - (b.time || b.completion_time));
          });
        }
      }
    );

    dbResultsChannel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        const freshResults = await fetchRoundResults(roomCode);
        if (freshResults && freshResults.length >= 0) setResults(freshResults);
      }
    });

    return () => {
      supabase.removeChannel(broadcastChannel);
      supabase.removeChannel(dbPlayersChannel);
      supabase.removeChannel(dbResultsChannel);
    };
  }, [roomCode, addToast]);

  // Realtime Broadcast helper
  const broadcastGameState = useCallback(async (newState) => {
    setGameState(newState);
    if (!supabase) return;
    updateActiveGameStateInDb(roomCode, newState);
    const channel = supabase.channel(`memory-rush-${roomCode}`);
    await channel.send({ type: "broadcast", event: "game", payload: newState });
  }, [roomCode]);

  // Admin Image Selection & Upload
  const handleSelectImage = (img, pieces) => {
    if (!img) return;
    setActiveImage(img);
    const selectedPieces = pieces || gameState.pieces || 16;
    const updatedState = {
      ...gameState,
      image: img.public_url,
      imageName: img.name,
      pieces: selectedPieces
    };
    broadcastGameState(updatedState);
    addToast(`Selected image: ${img.name} (${selectedPieces} Pieces)`, "info");
  };

  const handleUploadImage = async ({ name, category, description, file, fallbackDataUrl }) => {
    let publicUrl = fallbackDataUrl;
    let filePath = "";

    if (file) {
      const compressedDataUrl = await compressImageFile(file, 800, 800, 0.85);
      if (compressedDataUrl) publicUrl = compressedDataUrl;
    }

    if (supabase && file) {
      try {
        filePath = `expo_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: uploadErr } = await supabase.storage.from("game-images").upload(filePath, file);
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("game-images").getPublicUrl(filePath);
          if (urlData?.publicUrl) publicUrl = urlData.publicUrl;
        }
      } catch (e) {
        console.warn("Storage upload fallback to compressed Data URL.");
      }
    }

    // Insert row into `game_images` Postgres table
    const dbRecord = await saveGameImageInDb({
      name,
      category,
      description,
      storagePath: filePath,
      publicUrl
    });

    const newImgObj = dbRecord || {
      id: `custom-${Date.now()}`,
      name,
      category,
      description,
      public_url: publicUrl,
      times_used: 0,
      is_active: true,
      created_at: new Date().toISOString()
    };

    setImages((prev) => [newImgObj, ...prev.filter((img) => img.id !== newImgObj.id && img.public_url !== newImgObj.public_url)]);
    handleSelectImage(newImgObj, gameState.pieces || 16);
    addToast("Image uploaded and selected for round!", "success");
  };

  const handleDeleteImage = (id) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
    if (activeImage?.id === id) {
      setActiveImage(null);
      setGameState((prev) => ({ ...prev, image: null, imageName: null }));
    }
    addToast("Image removed", "info");
  };

  // Start Round with exact phase stepper sequence
  const handleStartRound = () => {
    clearAllRoundTimeouts();

    const selectedImg = gameState.image || DEFAULT_AI_IMAGES[0]?.public_url;
    const selectedName = gameState.imageName || DEFAULT_AI_IMAGES[0]?.name || "Friendly AI Robot";
    const currentRoundToRun = gameState.round;

    setResults([]);
    const preRevealMs = 2000;
    const memoryMs = (gameState.memory || 20) * 1000;
    const countdownMs = 3000;
    const puzzleMs = (gameState.puzzle || 45) * 1000;

    // STEP 1: ROUND_STARTING (2s pre-reveal)
    const startingPayload = {
      ...gameState,
      image: selectedImg,
      imageName: selectedName,
      phase: "ROUND_STARTING",
      startAt: Date.now(),
      isPaused: false
    };

    setPlayers((prev) => prev.map((p) => (p.tournament_status === "ELIMINATED" ? p : { ...p, status: "GET_READY" })));
    broadcastGameState(startingPayload);
    addToast(`Round ${currentRoundToRun} starting... Get ready!`, "info");

    // STEP 2: MEMORY PHASE (20s)
    const t1 = setTimeout(() => {
      const memoryPayload = {
        ...startingPayload,
        phase: "MEMORY",
        startAt: Date.now()
      };
      setPlayers((prev) => prev.map((p) => (p.tournament_status === "ELIMINATED" ? p : { ...p, status: "MEMORIZING" })));
      broadcastGameState(memoryPayload);
      addToast("🧠 MEMORIZE THE IMAGE!", "success");
    }, preRevealMs);
    roundTimeoutsRef.current.push(t1);

    // STEP 3: COUNTDOWN TRANSITION (3s: 3..2..1 GO!)
    const t2 = setTimeout(() => {
      const countdownPayload = {
        ...startingPayload,
        phase: "COUNTDOWN",
        startAt: Date.now()
      };
      broadcastGameState(countdownPayload);
    }, preRevealMs + memoryMs);
    roundTimeoutsRef.current.push(t2);

    // STEP 4: PUZZLE PHASE (45s)
    const t3 = setTimeout(() => {
      const puzzlePayload = {
        ...startingPayload,
        phase: "PUZZLE",
        startAt: Date.now()
      };
      setPlayers((prev) => prev.map((p) => (p.tournament_status === "ELIMINATED" ? p : { ...p, status: "PLAYING" })));
      broadcastGameState(puzzlePayload);
      addToast("🧩 MEMORY OVER! REBUILD THE IMAGE!", "warning");
    }, preRevealMs + memoryMs + countdownMs);
    roundTimeoutsRef.current.push(t3);

    // STEP 5: RESULT PHASE & TOURNAMENT EVALUATION (Only fires if round hasn't changed or been manually closed)
    const t4 = setTimeout(() => {
      setGameState((prev) => {
        if (prev.phase === "PUZZLE" && Number(prev.round) === Number(currentRoundToRun)) {
          finishAndEvaluateRound(currentRoundToRun);
        }
        return prev;
      });
    }, preRevealMs + memoryMs + countdownMs + puzzleMs);
    roundTimeoutsRef.current.push(t4);
  };

  const handlePause = () => {
    const updated = { ...gameState, isPaused: true };
    broadcastGameState(updated);
    addToast("Round paused", "warning");
  };

  const handleResume = () => {
    const updated = { ...gameState, isPaused: false };
    broadcastGameState(updated);
    addToast("Round resumed", "info");
  };

  const handleRestartRound = () => {
    clearAllRoundTimeouts();
    handleStartRound();
  };

  const handleEndRound = () => {
    clearAllRoundTimeouts();
    finishAndEvaluateRound(gameState.round);
    addToast("Round ended by host. Evaluating tournament eliminations...", "warning");
  };

  const handleNextRound = () => {
    clearAllRoundTimeouts();
    const nextR = gameState.round + 1;
    const activePlayers = players.filter((p) => p.tournament_status !== "ELIMINATED");
    setResults([]);
    const updated = {
      ...gameState,
      round: nextR,
      phase: "LOBBY",
      startAt: Date.now()
    };
    setGameState(updated);
    broadcastGameState(updated);
    addToast(`Advanced to Round ${nextR} with ${activePlayers.length} players!`, "info");
  };

  const handleSaveRoundConfig = (config) => {
    setGameState((prev) => ({ ...prev, ...config }));
    addToast("Round configuration saved!", "success");
  };

  const handleDisconnectPlayer = (id) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, connected: false, status: "DISCONNECTED" } : p)));
    addToast("Player marked offline", "warning");
  };

  const handleResetPlayer = (id) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, status: "WAITING" } : p)));
    addToast("Player state reset", "info");
  };

  const handleRemovePlayer = async (id) => {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
    await removePlayerFromDb(id);
    addToast("Player removed from room", "danger");
  };

  const handleResetGame = async () => {
    clearAllRoundTimeouts();

    // 1. Generate a fresh new room code (e.g. EXPO27, EXPO42, EXPO88)
    const randomNum = Math.floor(10 + Math.random() * 90);
    const currentRoom = gameState.roomCode || roomCode || "EXPO26";
    const newRoomCode = `EXPO${randomNum}`;

    // 2. Broadcast GAME_FINISHED to old room channel so all connected players on their phone see "GAME ENDED"
    if (supabase) {
      try {
        const oldChannel = supabase.channel(`memory-rush-${currentRoom}`);
        await oldChannel.send({
          type: "broadcast",
          event: "game",
          payload: { ...gameState, phase: "FINISHED", isGameEnded: true }
        });
      } catch (e) {}
    }

    setPlayers([]);
    setResults([]);

    // 3. Mark old game finished & create new active game with newRoomCode in DB
    const newGame = await resetRoomPlayersInDb(newRoomCode);
    const newGameId = newGame?.id || safeRandomUUID();

    // 4. Update browser URL params so room code updates seamlessly
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("room", newRoomCode);
      window.history.pushState({}, "", url.toString());
    } catch (e) {}

    const resetState = {
      ...gameState,
      roomCode: newRoomCode,
      gameId: newGameId,
      phase: "LOBBY",
      round: 1,
      finalWinner: null
    };

    setGameState(resetState);
    if (supabase) {
      const newChannel = supabase.channel(`memory-rush-${newRoomCode}`);
      await newChannel.send({ type: "broadcast", event: "game", payload: resetState });
    }
    updateActiveGameStateInDb(newRoomCode, resetState);
    addToast(`New game created! New Room Code: ${newRoomCode}. New QR Code generated.`, "success");
  };

  const handleOpenDisplay = () => {
    window.open(`/display?room=${roomCode}`, "_blank");
  };

  if (isAdmin) {
    return (
      <AdminLayout
        gameState={gameState}
        players={players}
        results={results}
        images={images}
        activeImage={activeImage}
        gameHistory={gameHistory}
        onSelectImage={handleSelectImage}
        onUploadImage={handleUploadImage}
        onDeleteImage={handleDeleteImage}
        onStartRound={handleStartRound}
        onPause={handlePause}
        onResume={handleResume}
        onRestartRound={handleRestartRound}
        onEndRound={handleEndRound}
        onNextRound={handleNextRound}
        onSaveRoundConfig={handleSaveRoundConfig}
        onDisconnectPlayer={handleDisconnectPlayer}
        onResetPlayer={handleResetPlayer}
        onRemovePlayer={handleRemovePlayer}
        onResetGame={handleResetGame}
        onOpenDisplay={handleOpenDisplay}
      />
    );
  }

  if (isDisplay) {
    return <BigScreenDisplay roomCode={roomCode} />;
  }

  return <PlayerApp roomCode={roomCode} />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ToastProvider>
      <RootApp />
    </ToastProvider>
  </React.StrictMode>
);
