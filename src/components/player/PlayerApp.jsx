import React, { useState, useEffect, useRef } from "react";
import { ImagePuzzleBoard } from "./ImagePuzzleBoard";
import { createPuzzlePieces, isPuzzleSolved } from "../../utils/puzzleEngine";
import { supabase, TCS_UNITS } from "../../config/supabase";
import { joinPlayerInDb, saveRoundResultInDb, fetchActivePlayers, fetchRoundResults, fetchActiveGameStateFromDb } from "../../utils/db";
import { safeRandomUUID } from "../../utils/uuid";

export function PlayerApp({ roomCode = "EXPO26" }) {
  const SESSION_KEY = `memoryrush_session_${roomCode}`;

  // Read stored session from localStorage across browser refreshes
  const getInitialSession = () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      // If URL explicitly requests a fresh join form or reset
      if (urlParams.get("new") === "1" || urlParams.get("reset") === "1" || urlParams.get("fresh") === "1") {
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(`mr_player_${roomCode}`);
        return null;
      }

      const stored = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(`mr_player_${roomCode}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}
    return null;
  };

  const initialSession = getInitialSession();

  const [playerId, setPlayerId] = useState(() => initialSession?.id || null);
  const [name, setName] = useState(() => initialSession?.name || "");
  const [joined, setJoined] = useState(() => Boolean(initialSession?.id && initialSession?.name));
  const [nameError, setNameError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Realtime room state & personal player telemetry
  const [roomPlayerCount, setRoomPlayerCount] = useState(1);
  const [roomPlayers, setRoomPlayers] = useState([]);
  const [gameState, setGameState] = useState({
    phase: "LOBBY",
    round: 1,
    image: null,
    memory: 20,
    puzzle: 45,
    pieces: 16,
    startAt: Date.now()
  });

  const channelRef = useRef(null);
  const hasSubmittedResultRef = useRef(false);
  const puzzleInitializedRoundRef = useRef(null);

  const [pieces, setPieces] = useState([]);
  const [moveCount, setMoveCount] = useState(0);
  const [remainingSec, setRemainingSec] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [myRank, setMyRank] = useState(null);
  const [myScore, setMyScore] = useState(null);
  const [solveTimeRecord, setSolveTimeRecord] = useState(null);
  const [roundLeaderboard, setRoomLeaderboard] = useState([]);
  const [tournamentStatus, setTournamentStatus] = useState("ACTIVE"); // ACTIVE, ELIMINATED, WINNER
  const [eliminatedInRound, setEliminatedInRound] = useState(null);
  const [roundResultData, setRoundResultData] = useState(null);
  const [roundCompleters, setRoundCompleters] = useState([]);
  const [selectedTileIdx, setSelectedTileIdx] = useState(null);
  const [showPeekModal, setShowPeekModal] = useState(false);

  // Auto-fetch round_results to compute authoritative rank & total completers for Round Result screen
  useEffect(() => {
    async function updatePlayerRoundResult() {
      if (!joined || !playerId) return;

      try {
        const currentR = gameState.round || 1;
        const dbResults = await fetchRoundResults(roomCode, currentR, gameState.gameId);

        if (dbResults && dbResults.length > 0) {
          // Sort completed results by time ascending (fastest first) - EXACT same logic as RankingView.jsx
          const sorted = [...dbResults].sort(
            (a, b) => Number(a.completion_time || a.time || 0) - Number(b.completion_time || b.time || 0)
          );
          setRoundCompleters(sorted);
          const pIdLower = playerId.toString().toLowerCase();

          const myIndex = sorted.findIndex((r) => {
            const rId = r.player_id || r.id;
            return rId && rId.toString().toLowerCase() === pIdLower;
          });

          if (myIndex !== -1) {
            const myRow = sorted[myIndex];
            setRoundResultData({
              rank: myIndex + 1,
              solveTime: Number(myRow.completion_time || myRow.time || solveTimeRecord || 0),
              totalCompleters: sorted.length,
              roundNum: currentR
            });
            setMyRank(myIndex + 1);
            setSolveTimeRecord(Number(myRow.completion_time || myRow.time || solveTimeRecord || 0));
          }
        }
      } catch (err) {
        console.warn("Error updating player round result:", err);
      }
    }

    updatePlayerRoundResult();
  }, [roomCode, playerId, joined, gameState.round, gameState.phase, gameState.gameId]);

  // Auto-load active players in room from DB snapshot (scoped strictly to current gameId)
  useEffect(() => {
    async function loadActiveRoomPlayers() {
      try {
        const active = await fetchActivePlayers(roomCode, gameState.gameId);
        if (active && active.length >= 0) {
          setRoomPlayers(active);
          setRoomPlayerCount(active.length);
          const me = active.find((p) => p.id === playerId);
          if (me?.tournament_status) {
            setTournamentStatus(me.tournament_status);
            if (me.eliminated_in_round) setEliminatedInRound(me.eliminated_in_round);
          }
        }
      } catch (e) {
        console.warn("Error loading active room players:", e);
      }
    }
    loadActiveRoomPlayers();
  }, [roomCode, playerId, gameState.gameId]);

  // Session validation and auto-reconnect on initial page load/refresh
  useEffect(() => {
    async function validateAndReconnectSession() {
      if (!initialSession?.id || !initialSession?.name) return;

      try {
        const activeGame = await fetchActiveGameStateFromDb(roomCode);
        const currentGameId = activeGame?.gameId || gameState.gameId;

        // If stored session belongs to a different game session (admin reset or started new game), prompt for new name entry
        if (initialSession.gameId && currentGameId && initialSession.gameId !== currentGameId) {
          console.log("Game session ID changed. Clearing old session for new game.");
          localStorage.removeItem(SESSION_KEY);
          sessionStorage.removeItem(`mr_player_${roomCode}`);
          setJoined(false);
          setPlayerId(null);
          setName("");
          return;
        }

        // Unconditionally preserve player identity & joined state for current game
        setJoined(true);
        setPlayerId(initialSession.id);
        setName(initialSession.name);

        // Re-sync player record in DB
        await joinPlayerInDb({
          roomCode,
          name: initialSession.name,
          employeeId: initialSession.employeeId || "",
          tcsUnit: initialSession.tcsUnit || "",
          playerId: initialSession.id,
          gameId: currentGameId
        });

        const activePlayers = await fetchActivePlayers(roomCode, currentGameId);
        const playerRecord = activePlayers ? activePlayers.find((p) => p.id === initialSession.id) : null;

        if (playerRecord && playerRecord.tournament_status) {
          setTournamentStatus(playerRecord.tournament_status);
          if (playerRecord.eliminated_in_round) setEliminatedInRound(playerRecord.eliminated_in_round);
        }

        // Check if player has already submitted a result for current round
        const dbResults = await fetchRoundResults(roomCode, gameState.round, currentGameId);
        const myResult = dbResults ? dbResults.find((r) => r.player_id === initialSession.id || r.id === initialSession.id) : null;
        if (myResult) {
          setIsCompleted(true);
          setTournamentStatus("ACTIVE");
          hasSubmittedResultRef.current = true;
          setMyRank(myResult.rank);
          setMyScore(myResult.score);
          setSolveTimeRecord(Number(myResult.time || myResult.completion_time));
        }
      } catch (err) {
        console.warn("Session reconnect notice:", err);
      }
    }

    validateAndReconnectSession();
  }, [roomCode, gameState.gameId]);

  // Initial and fallback game state synchronization from Postgres
  useEffect(() => {
    async function syncGameFromDb() {
      try {
        const dbState = await fetchActiveGameStateFromDb(roomCode);
        if (dbState && dbState.startAt) {
          setGameState((prev) => {
            if (!prev.startAt || dbState.startAt > prev.startAt || dbState.phase !== prev.phase) {
              return dbState;
            }
            return prev;
          });
        }
      } catch (e) {
        console.warn("syncGameFromDb error:", e);
      }
    }
    syncGameFromDb();
  }, [roomCode, gameState.gameId]);

  // Periodic fallback check during active play phases to protect against dropped socket messages
  useEffect(() => {
    const activePhases = ["ROUND_STARTING", "MEMORY", "COUNTDOWN", "PUZZLE"];
    if (!activePhases.includes(gameState.phase)) return;

    const interval = setInterval(async () => {
      const dbState = await fetchActiveGameStateFromDb(roomCode);
      if (dbState && dbState.startAt) {
        setGameState(dbState);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [roomCode, gameState.phase]);

  // Subscribe to real-time channel & presence
  useEffect(() => {
    if (!supabase) return;

    const channelKey = playerId || `visitor-${Date.now()}`;
    const channel = supabase.channel(`memory-rush-${roomCode}`, {
      config: { presence: { key: channelKey } }
    });
    channelRef.current = channel;

    // Presence tracking for real online count & player list (scoped by gameId)
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const rawList = Object.values(state).flatMap((s) => s);
      const currentGameId = gameState.gameId;
      const valid = rawList.filter((p) => p && p.name && (!currentGameId || !p.gameId || p.gameId === currentGameId));
      if (valid.length > 0) {
        setRoomPlayerCount(valid.length);
        setRoomPlayers((prev) => {
          const map = new Map();
          [...prev, ...valid].forEach((item) => map.set(item.id || item.name, item));
          return Array.from(map.values());
        });
      } else {
        setRoomPlayerCount(0);
      }
    });

    channel.on("broadcast", { event: "join" }, ({ payload }) => {
      const currentGameId = gameState.gameId;
      if (payload?.gameId && currentGameId && payload.gameId !== currentGameId) return;
      setRoomPlayerCount((prev) => prev + 1);
      if (payload && payload.name) {
        setRoomPlayers((prev) => {
          if (prev.some((p) => p.id === payload.id || p.name === payload.name)) return prev;
          return [...prev, payload];
        });
      }
    });

    channel.on("broadcast", { event: "game" }, ({ payload }) => {
      setGameState((prevGame) => {
        // Reset local completion/result state if moving to a new round
        if (!prevGame || payload.round > prevGame.round) {
          setIsCompleted(false);
          setMyRank(null);
          setMyScore(null);
          setSolveTimeRecord(null);
          setMoveCount(0);
          hasSubmittedResultRef.current = false;
          puzzleInitializedRoundRef.current = null;
        }
        return payload;
      });

      const pIdLower = playerId ? playerId.toString().toLowerCase() : "";
      if (payload.finalWinner) {
        const wId = payload.finalWinner.id ? payload.finalWinner.id.toString().toLowerCase() : "";
        const wPId = payload.finalWinner.player_id ? payload.finalWinner.player_id.toString().toLowerCase() : "";
        if (pIdLower && (wId === pIdLower || wPId === pIdLower)) {
          setTournamentStatus("WINNER");
        }
      }

      if (payload.phase === "PUZZLE" && playerId && tournamentStatus !== "ELIMINATED") {
        const pKey = `mr_puzzle_${roomCode}_${payload.round}_${playerId}`;
        let restored = null;
        try {
          const raw = localStorage.getItem(pKey);
          if (raw) restored = JSON.parse(raw);
        } catch (e) {}

        if (restored && restored.pieces && restored.pieces.length > 0) {
          setPieces(restored.pieces);
          if (typeof restored.moveCount === "number") setMoveCount(restored.moveCount);
          if (restored.isCompleted) setIsCompleted(true);
          if (restored.solveTime) setSolveTimeRecord(restored.solveTime);
          puzzleInitializedRoundRef.current = payload.round;
        } else if (puzzleInitializedRoundRef.current !== payload.round) {
          // Deterministic seeded shuffle per player: gameId + roundId + playerId
          const seedStr = `${roomCode}-${payload.round}-${playerId}`;
          const newPieces = createPuzzlePieces(payload.pieces || 16, seedStr);
          setPieces(newPieces);
          setMoveCount(0);
          puzzleInitializedRoundRef.current = payload.round;
          try {
            localStorage.setItem(pKey, JSON.stringify({ pieces: newPieces, moveCount: 0, isCompleted: false }));
          } catch (e) {}
        }
      }
    });

    // Handle knockout tournament elimination & winner broadcasts
    channel.on("broadcast", { event: "tournament_evaluation" }, ({ payload }) => {
      if (!playerId || !payload) return;
      const { advancingPlayers, eliminatedPlayers, finalWinner } = payload;
      const pIdLower = playerId.toString().toLowerCase();

      const isMeWinner = finalWinner && (
        (finalWinner.id && finalWinner.id.toString().toLowerCase() === pIdLower) ||
        (finalWinner.player_id && finalWinner.player_id.toString().toLowerCase() === pIdLower)
      );

      const isMeEliminated = eliminatedPlayers && eliminatedPlayers.some((p) => {
        const id1 = p.id ? p.id.toString().toLowerCase() : "";
        const id2 = p.player_id ? p.player_id.toString().toLowerCase() : "";
        return (id1 && id1 === pIdLower) || (id2 && id2 === pIdLower);
      });

      const isMeAdvancing = advancingPlayers && advancingPlayers.some((p) => {
        const id1 = p.id ? p.id.toString().toLowerCase() : "";
        const id2 = p.player_id ? p.player_id.toString().toLowerCase() : "";
        return (id1 && id1 === pIdLower) || (id2 && id2 === pIdLower);
      });

      if (isMeWinner) {
        setTournamentStatus("WINNER");
      } else if (isMeEliminated) {
        setTournamentStatus("ELIMINATED");
        setEliminatedInRound(payload.roundNumber || gameState.round || 1);
      } else if (isMeAdvancing) {
        setTournamentStatus("ACTIVE");
      }
    });

    // Handle personal & room finish events
    channel.on("broadcast", { event: "finish" }, ({ payload }) => {
      if (!payload) return;
      const resObj = {
        ...payload,
        name: payload.name || payload.player_name,
        player_name: payload.name || payload.player_name,
        time: Number(payload.time || payload.completion_time || 0),
        completion_time: Number(payload.time || payload.completion_time || 0)
      };

      setRoomLeaderboard((prev) => {
        if (prev.some((item) => item.id === resObj.id || (item.player_id === resObj.player_id && item.player_id))) return prev;
        return [...prev, resObj].sort((a, b) => a.time - b.time);
      });

      setRoundCompleters((prev) => {
        if (prev.some((item) => item.id === resObj.id || (item.player_id === resObj.player_id && item.player_id))) return prev;
        return [...prev, resObj].sort((a, b) => a.time - b.time);
      });

      // Strict filter: Only mark completed if the event matches THIS player's ID!
      if (playerId && (resObj.id === playerId || resObj.player_id === playerId)) {
        setIsCompleted(true);
        if (resObj.rank) setMyRank(resObj.rank);
        if (resObj.score) setMyScore(resObj.score);
        if (resObj.time) setSolveTimeRecord(resObj.time);
      }
    });

    channel.on("broadcast", { event: "result" }, ({ payload }) => {
      if (playerId && (payload.id === playerId || payload.player_id === playerId)) {
        setIsCompleted(true);
        setMyRank(payload.rank);
        setMyScore(payload.score);
        if (payload.time || payload.completion_time) setSolveTimeRecord(payload.time || payload.completion_time);
      }
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED" && joined && playerId) {
        await channel.track({ id: playerId, name: name, gameId: gameState.gameId, joinedAt: new Date().toISOString() });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode, playerId, joined, name, gameState.gameId]);

  // Fallback piece initialization when entering PUZZLE phase if pieces state is empty
  useEffect(() => {
    if (gameState.phase === "PUZZLE" && playerId && tournamentStatus !== "ELIMINATED" && pieces.length === 0) {
      const currentRound = gameState.round || 1;
      const seedStr = `${roomCode}-${currentRound}-${playerId}`;
      const newPieces = createPuzzlePieces(gameState.pieces || 16, seedStr);
      setPieces(newPieces);
      setMoveCount(0);
      puzzleInitializedRoundRef.current = currentRound;
    }
  }, [gameState.phase, gameState.round, gameState.pieces, playerId, roomCode, pieces.length, tournamentStatus]);

  // Server authoritative timer calculation
  useEffect(() => {
    if (isCompleted && solveTimeRecord !== null) return;

    const timer = setInterval(() => {
      if (!gameState.startAt) return;
      let durationSec = gameState.puzzle || 45;
      if (gameState.phase === "ROUND_STARTING") durationSec = 2;
      if (gameState.phase === "MEMORY") durationSec = gameState.memory || 20;
      if (gameState.phase === "COUNTDOWN") durationSec = 3;

      const endMs = gameState.startAt + durationSec * 1000;
      setRemainingSec(Math.max(0, (endMs - Date.now()) / 1000));
    }, 100);
    return () => clearInterval(timer);
  }, [gameState, isCompleted, solveTimeRecord]);

  // Join form submission
  const handleJoin = async (e) => {
    e?.preventDefault();
    setNameError("");

    const trimmedName = name.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setNameError("Please enter your name (minimum 2 characters).");
      return;
    }
    if (trimmedName.length > 20) {
      setNameError("Name cannot exceed 20 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const newPlayerId = playerId || safeRandomUUID();

      // 1. Database insert
      const result = await joinPlayerInDb({
        roomCode,
        name: trimmedName,
        playerId: newPlayerId,
        gameId: gameState.gameId
      });

      if (!result) {
        setNameError("Failed to join room. Please try again.");
        setIsSubmitting(false);
        return;
      }

      const confirmedPlayerId = result.id || newPlayerId;

      // 2. Store player session locally ONLY AFTER confirmed DB creation
      const sessionData = {
        id: confirmedPlayerId,
        name: trimmedName,
        roomCode,
        gameId: gameState.gameId
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      sessionStorage.setItem(`mr_player_${roomCode}`, JSON.stringify(sessionData));

      // 3. Realtime Broadcast & Presence tracking
      if (channelRef.current) {
        await channelRef.current.send({
          type: "broadcast",
          event: "join",
          payload: {
            id: confirmedPlayerId,
            name: trimmedName,
            gameId: gameState.gameId,
            joinedAt: new Date().toISOString()
          }
        });
        await channelRef.current.track({
          id: confirmedPlayerId,
          name: trimmedName,
          gameId: gameState.gameId,
          joinedAt: new Date().toISOString()
        });
      }

      // 4. Update UI states IMMEDIATELY to transition to Lobby without waiting for websocket
      setPlayerId(confirmedPlayerId);
      setName(trimmedName);
      setJoined(true);
      setIsSubmitting(false);

      // 5. Send Realtime Broadcast & Presence tracking asynchronously in background
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "join",
          payload: {
            id: confirmedPlayerId,
            name: trimmedName,
            gameId: gameState.gameId,
            joinedAt: new Date().toISOString()
          }
        }).catch(() => {});

        channelRef.current.track({
          id: confirmedPlayerId,
          name: trimmedName,
          gameId: gameState.gameId,
          joinedAt: new Date().toISOString()
        }).catch(() => {});
      }
    } catch (err) {
      console.error("Join error:", err);
      setNameError("Failed to join room. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleSwapPieces = async (i, j) => {
    if (isCompleted || gameState.phase !== "PUZZLE" || !playerId || remainingSec <= 0 || tournamentStatus === "ELIMINATED") return;

    const newPieces = [...pieces];
    [newPieces[i], newPieces[j]] = [newPieces[j], newPieces[i]];
    const newMoveCount = moveCount + 1;
    setPieces(newPieces);
    setMoveCount(newMoveCount);

    const isSolved = isPuzzleSolved(newPieces);
    const pKey = `mr_puzzle_${roomCode}_${gameState.round || 1}_${playerId}`;

    try {
      localStorage.setItem(
        pKey,
        JSON.stringify({
          pieces: newPieces,
          moveCount: newMoveCount,
          isCompleted: isSolved,
          solveTime: solveTimeRecord
        })
      );
    } catch (e) {}

    if (isSolved && !hasSubmittedResultRef.current) {
      hasSubmittedResultRef.current = true;
      const solveTime = Math.max(0.1, (Date.now() - (gameState.startAt || Date.now())) / 1000);
      const currentRoundNum = gameState.round || 1;

      // 1. Instantly set local completion state & stop timer
      setIsCompleted(true);
      setSolveTimeRecord(solveTime);

      try {
        localStorage.setItem(
          pKey,
          JSON.stringify({
            pieces: newPieces,
            moveCount: newMoveCount,
            isCompleted: true,
            solveTime: solveTime
          })
        );
      } catch (e) {}

      const myResultObj = {
        id: safeRandomUUID(),
        player_id: playerId,
        name: name,
        player_name: name,
        round_number: currentRoundNum,
        time: solveTime,
        completion_time: solveTime,
        moves: newMoveCount,
        score: 100,
        completedAt: new Date().toISOString()
      };

      setRoomLeaderboard((prev) => {
        const filtered = prev.filter((item) => item.player_id !== playerId && item.id !== playerId);
        return [...filtered, myResultObj].sort((a, b) => (a.time || a.completion_time) - (b.time || b.completion_time));
      });

      setRoundCompleters((prev) => {
        const filtered = prev.filter((item) => item.player_id !== playerId && item.id !== playerId);
        return [...filtered, myResultObj].sort((a, b) => (a.time || a.completion_time) - (b.time || b.completion_time));
      });

      // 2. Instantly broadcast finish event so host & display know immediately
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "finish",
          payload: myResultObj
        });
      }

      // 3. Persist authoritative result in Supabase Postgres DB
      const authResult = await saveRoundResultInDb({
        playerId,
        playerName: name,
        roomCode,
        roundNumber: currentRoundNum,
        time: solveTime
      });

      if (authResult) {
        if (authResult.rank) setMyRank(authResult.rank);
        if (authResult.score) setMyScore(authResult.score);
        if (authResult.completion_time || authResult.time) {
          setSolveTimeRecord(authResult.completion_time || authResult.time);
        }
      }
    }
  };

  // Authoritative State Machine Evaluator for Player App Screen
  const derivePlayerStatus = () => {
    if (!joined || !playerId) return "unjoined";

    // 0. GAME FINISHED / NEW GAME STARTED OVERRIDE
    if (gameState.phase === "FINISHED" || gameState.isGameEnded) {
      return "game_ended";
    }

    // 1. FINAL WINNER OVERRIDE
    if (
      tournamentStatus === "WINNER" ||
      gameState.finalWinner?.id === playerId ||
      gameState.finalWinner?.player_id === playerId
    ) {
      return "tournament_winner";
    }

    // Local storage completion check guard
    const checkLocalCompleted = () => {
      if (isCompleted || (solveTimeRecord !== null && solveTimeRecord > 0) || roundResultData) return true;
      try {
        const pKey = `mr_puzzle_${roomCode}_${gameState.round || 1}_${playerId}`;
        const raw = localStorage.getItem(pKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.isCompleted) return true;
        }
      } catch (e) {}
      return false;
    };

    const playerIsCompleted = checkLocalCompleted();

    // 2. PUZZLE SOLVED / COMPLETED OVERRIDE (COMPLETERS MUST NEVER SHOW ELIMINATED!)
    if (playerIsCompleted) {
      if (
        gameState.phase === "RESULT" ||
        gameState.phase === "ROUND_COMPLETE" ||
        gameState.phase === "FINAL_RESULTS"
      ) {
        return "round_result";
      }
      return "completed_waiting";
    }

    // 3. ELIMINATED (Only for non-completers)
    if (tournamentStatus === "ELIMINATED") {
      return "eliminated";
    }

    // 4. TIMER EXPIRED IN PUZZLE PHASE FOR NON-COMPLETERS
    if (gameState.phase === "PUZZLE" && remainingSec <= 0 && gameState.startAt > 0) {
      return "did_not_finish";
    }

    // 5. RESULT / ROUND COMPLETE PHASE FOR NON-COMPLETERS
    if (
      gameState.phase === "RESULT" ||
      gameState.phase === "ROUND_COMPLETE" ||
      gameState.phase === "FINAL_RESULTS"
    ) {
      return "did_not_finish";
    }

    // 6. PUZZLE PHASE PLAYING STATUS
    if (gameState.phase === "PUZZLE") {
      return "playing";
    }

    // 7. PRE-REVEAL / MEMORY / COUNTDOWN PHASES
    if (gameState.phase === "ROUND_STARTING") return "get_ready";
    if (gameState.phase === "MEMORY") return "memorizing";
    if (gameState.phase === "COUNTDOWN") return "countdown";

    // 8. LOBBY / WAITING BETWEEN ROUNDS
    if (gameState.phase === "LOBBY" || gameState.phase === "WAITING") {
      if (gameState.round > 1 && (tournamentStatus === "ACTIVE" || tournamentStatus === "ADVANCED")) {
        return "advancing";
      }
      return "in_lobby";
    }

    return "in_lobby";
  };

  const effectiveStatus = derivePlayerStatus();

  // 1. MOBILE JOIN FORM (UNJOINED VISITORS)
  if (effectiveStatus === "unjoined") {
    return (
      <div className="player-mobile-shell">
        <div className="mobile-join-content">
          <div className="app-brand-block">
            <span className="brand-logo-emoji">🧩</span>
            <h1 className="brand-title">MEMORY RUSH</h1>
            <p className="brand-subtitle">AI MEMORY & PUZZLE CHALLENGE</p>
          </div>

          <div className="mobile-card glass-card">
            <div className="card-header-block">
              <h2>READY TO PLAY?</h2>
              <p>Enter your details to join the challenge.</p>
            </div>

            <form onSubmit={handleJoin} className="player-join-form">
              {nameError && (
                <div
                  className="error-alert-banner"
                  style={{
                    background: "rgba(239, 68, 68, 0.2)",
                    border: "1px solid rgba(239, 68, 68, 0.5)",
                    color: "#fca5a5",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    marginBottom: "14px"
                  }}
                >
                  ⚠️ {nameError}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="player-name-input">FULL NAME *</label>
                <input
                  id="player-name-input"
                  type="text"
                  autoFocus
                  maxLength={20}
                  placeholder="Enter your name..."
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError("");
                  }}
                />
              </div>

              <button
                type="submit"
                className="btn-join-challenge"
                disabled={isSubmitting}
                style={{ marginTop: "10px" }}
              >
                {isSubmitting ? (
                  <>
                    <span className="btn-spinner-sm" />
                    <span>JOINING...</span>
                  </>
                ) : (
                  <span>JOIN THE CHALLENGE</span>
                )}
              </button>
            </form>

            <div className="card-footer-note">
              <span>No password required • TCS Booth Event</span>
            </div>
          </div>

          {/* GAME INSTRUCTIONS CARD */}
          <div className="mobile-card glass-card" style={{ marginTop: "16px", padding: "18px 20px", borderRadius: "16px", background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(124, 92, 255, 0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <span style={{ fontSize: "1.2rem" }}>📖</span>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#a78bfa", margin: 0, letterSpacing: "1px" }}>HOW TO PLAY</h3>
            </div>
            <div className="instructions-list" style={{ display: "flex", flexDirection: "column", gap: "10px", textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "0.85rem", color: "#e2e8f0" }}>
                <span style={{ background: "rgba(124, 92, 255, 0.25)", color: "#a78bfa", fontWeight: 900, borderRadius: "50%", width: "22px", height: "22px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.75rem" }}>1</span>
                <div>
                  <strong style={{ color: "#ffffff" }}>🧠 MEMORIZE:</strong> Look closely at the target picture during the 20-sec Memory Phase.
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "0.85rem", color: "#e2e8f0" }}>
                <span style={{ background: "rgba(124, 92, 255, 0.25)", color: "#a78bfa", fontWeight: 900, borderRadius: "50%", width: "22px", height: "22px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.75rem" }}>2</span>
                <div>
                  <strong style={{ color: "#ffffff" }}>🧩 SWAP TILES:</strong> Tap any tile to highlight it, then tap another tile to swap them into place.
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "0.85rem", color: "#e2e8f0" }}>
                <span style={{ background: "rgba(124, 92, 255, 0.25)", color: "#a78bfa", fontWeight: 900, borderRadius: "50%", width: "22px", height: "22px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "0.75rem" }}>3</span>
                <div>
                  <strong style={{ color: "#ffffff" }}>⚡ BEAT THE TIMER:</strong> Complete the image as fast as possible before time runs out to claim victory!
                </div>
              </div>
            </div>
          </div>

          <div className="subtle-room-footer">
            <span>ROOM • {roomCode}</span>
          </div>
        </div>
      </div>
    );
  }

  // 1.5. GAME ENDED SCREEN (Shown on player phone when admin resets/starts new game)
  if (effectiveStatus === "game_ended") {
    return (
      <div className="player-mobile-shell center-wrapper">
        <div className="mobile-card glass-card result-card animate-pop" style={{ borderColor: "rgba(124, 92, 255, 0.5)", textAlign: "center", padding: "32px 24px" }}>
          <div className="success-check-icon" style={{ background: "rgba(124, 92, 255, 0.2)", border: "2px solid rgba(124, 92, 255, 0.6)", color: "#a78bfa", fontSize: "2.5rem" }}>
            🏁
          </div>
          <h1 className="joined-title" style={{ color: "#a78bfa" }}>GAME ENDED</h1>
          <h2 style={{ color: "#ffffff", marginTop: "4px", fontSize: "1.2rem" }}>Thanks for playing, {name}!</h2>
          
          <div style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", padding: "14px", margin: "16px 0", fontSize: "0.9rem", color: "#cbd5e1", lineHeight: "1.5" }}>
            The host has ended this game session. Please scan the <strong>new QR Code</strong> on the Big Screen or tap below to play a new game.
          </div>

          <button
            className="btn btn-primary btn-lg"
            style={{ width: "100%", fontWeight: 900, background: "linear-gradient(135deg, #7c5cff, #00d2ff)" }}
            onClick={() => {
              localStorage.removeItem(SESSION_KEY);
              sessionStorage.removeItem(`mr_player_${roomCode}`);
              setJoined(false);
              setPlayerId(null);
              setName("");
            }}
          >
            🚀 JOIN NEW GAME
          </button>
        </div>
      </div>
    );
  }

  // 2. FINAL TOURNAMENT WINNER CHAMPION SCREEN
  if (effectiveStatus === "tournament_winner") {
    return (
      <div className="player-mobile-shell center-wrapper">
        <div className="mobile-card glass-card result-card gold-glow" style={{ borderColor: "rgba(245, 158, 11, 0.6)" }}>
          <div className="success-check-icon gold-glow" style={{ fontSize: "3rem" }}>
            👑
          </div>
          <h1 className="joined-title" style={{ color: "#fbbf24", letterSpacing: "2px" }}>TOURNAMENT CHAMPION!</h1>
          <h2 style={{ color: "#ffffff", marginTop: "4px" }}>{name}</h2>
          <span className="room-code-badge" style={{ background: "rgba(245, 158, 11, 0.2)", border: "1px solid rgba(245, 158, 11, 0.5)", color: "#fef08a" }}>
            #1 OVERALL WINNER
          </span>

          <div style={{ marginTop: "16px", padding: "12px", background: "rgba(15, 23, 42, 0.6)", borderRadius: "10px", textAlign: "left", fontSize: "0.85rem" }}>
            <div style={{ color: "#94a3b8" }}>EMPLOYEE ID: <strong style={{ color: "#f8fafc" }}>{employeeId || "N/A"}</strong></div>
            <div style={{ color: "#94a3b8", marginTop: "4px" }}>TCS UNIT: <strong style={{ color: "#a78bfa" }}>{tcsUnit || "N/A"}</strong></div>
          </div>

          <p style={{ color: "#34d399", fontWeight: 700, marginTop: "16px", fontSize: "0.95rem" }}>
            🏆 You defeated all opponents to win the TCS EEE Expo 2026 Memory Rush Challenge!
          </p>
        </div>
      </div>
    );
  }

  // 3. ELIMINATED PLAYER SCREEN
  if (effectiveStatus === "eliminated") {
    return (
      <div className="player-mobile-shell center-wrapper">
        <div className="mobile-card glass-card result-card" style={{ borderColor: "rgba(239, 68, 68, 0.5)" }}>
          <div className="success-check-icon" style={{ background: "rgba(239, 68, 68, 0.2)", border: "2px solid rgba(239, 68, 68, 0.6)", color: "#f87171" }}>
            ❌
          </div>
          <h1 className="joined-title" style={{ color: "#f87171" }}>TIME'S UP</h1>
          <h2>YOU ARE ELIMINATED</h2>
          <p style={{ color: "#cbd5e1", fontSize: "0.9rem", marginTop: "8px", lineHeight: "1.4" }}>
            Puzzle was not completed within the time limit for <strong>Round {eliminatedInRound || gameState.round}</strong>.
          </p>
          <div className="connection-status-pill" style={{ marginTop: "24px" }}>
            <span className="dot offline" />
            <span>SPECTATOR MODE • ROOM {roomCode}</span>
          </div>
        </div>
      </div>
    );
  }

  // 3.4. TIME'S UP — DID NOT FINISH SCREEN (Shown when round ends and player didn't complete in time)
  if (effectiveStatus === "did_not_finish") {
    return (
      <div className="player-mobile-shell center-wrapper">
        <div className="mobile-card glass-card result-card animate-pop" style={{ borderColor: "rgba(239, 68, 68, 0.5)" }}>
          <div
            className="success-check-icon"
            style={{
              background: "rgba(239, 68, 68, 0.2)",
              border: "2px solid rgba(239, 68, 68, 0.6)",
              color: "#f87171",
              fontSize: "2.5rem"
            }}
          >
            ⏰
          </div>

          <h1 className="joined-title" style={{ color: "#f87171" }}>
            TIME'S UP
          </h1>

          <p style={{ fontSize: "1.05rem", fontWeight: 700, color: "#f8fafc", margin: "8px 0 14px" }}>
            YOU ARE ELIMINATED
          </p>

          <div
            style={{
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "12px",
              padding: "12px 16px",
              marginBottom: "16px",
              fontSize: "0.9rem",
              color: "#cbd5e1",
              lineHeight: "1.4"
            }}
          >
            Puzzle was not completed within the time limit.
          </div>

          {roundCompleters.length > 0 && (
            <div style={{ marginTop: "12px", textAlign: "left", width: "100%" }}>
              <div style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 800, letterSpacing: "1px", marginBottom: "8px", textTransform: "uppercase" }}>
                🏆 ROUND {gameState.round} LEADERBOARD ({roundCompleters.length} COMPLETED)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "160px", overflowY: "auto" }}>
                {roundCompleters.map((res, idx) => (
                  <div
                    key={res.id || idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      fontSize: "0.85rem"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: 900, color: idx === 0 ? "#fbbf24" : idx === 1 ? "#cbd5e1" : idx === 2 ? "#cd7f32" : "#94a3b8" }}>
                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                      </span>
                      <strong style={{ color: "#ffffff" }}>{res.name || res.player_name}</strong>
                    </div>
                    <strong style={{ color: "#34d399", fontWeight: 800 }}>
                      {Number(res.completion_time || res.time || 0).toFixed(2)}s
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
            <p style={{ color: "#a78bfa", fontWeight: 700, fontSize: "0.9rem" }}>
              Waiting for host to start next round...
            </p>
          </div>

          <div className="loader-spinner-purple" style={{ margin: "16px auto 0" }} />
        </div>
      </div>
    );
  }

  // 3.5. PER-ROUND RESULT SCREEN (Shown at round end for all players who completed)
  if (effectiveStatus === "round_result") {
    const rankNum = roundResultData?.rank || myRank || 1;
    const timeSec = roundResultData?.solveTime || solveTimeRecord || 0;
    const isFirstPlace = rankNum === 1;

    return (
      <div className="player-mobile-shell center-wrapper">
        <div
          className="mobile-card glass-card result-card animate-pop"
          style={{
            borderColor: isFirstPlace
              ? "rgba(245, 158, 11, 0.6)"
              : "rgba(124, 92, 255, 0.5)"
          }}
        >
          <div
            className="success-check-icon"
            style={{
              background: isFirstPlace
                ? "rgba(245, 158, 11, 0.2)"
                : "rgba(124, 92, 255, 0.2)",
              border: isFirstPlace
                ? "2px solid rgba(245, 158, 11, 0.6)"
                : "2px solid rgba(124, 92, 255, 0.6)",
              color: isFirstPlace ? "#fbbf24" : "#a78bfa",
              fontSize: "2.5rem"
            }}
          >
            {isFirstPlace ? "🏆" : "🥇"}
          </div>

          <h1 className="joined-title" style={{ color: isFirstPlace ? "#fbbf24" : "#a78bfa" }}>
            ROUND {gameState.round || 1} COMPLETE
          </h1>

          <div style={{ margin: "12px 0 16px" }}>
            <span style={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: 700, letterSpacing: "1px" }}>YOU FINISHED</span>
            <div style={{ fontSize: "2.8rem", fontWeight: 900, color: isFirstPlace ? "#fbbf24" : "#ffffff", margin: "4px 0" }}>
              #{rankNum}
            </div>
            {isFirstPlace && (
              <span className="room-code-badge" style={{ background: "rgba(245, 158, 11, 0.2)", color: "#fef08a", border: "1px solid rgba(245, 158, 11, 0.5)", fontSize: "0.8rem", padding: "4px 12px" }}>
                ⚡ FASTEST COMPLETION
              </span>
            )}
          </div>

          <div className="result-stats-row">
            <div className="result-stat-box">
              <span className="stat-label">SOLVE TIME</span>
              <strong className="stat-val" style={{ color: "#34d399" }}>
                {Number(timeSec).toFixed(2)}s
              </strong>
            </div>
            <div className="result-stat-box">
              <span className="stat-label">YOUR RANK</span>
              <strong className="stat-val" style={{ color: isFirstPlace ? "#fbbf24" : "#a78bfa" }}>
                #{rankNum}
              </strong>
            </div>
          </div>

          {roundCompleters.length > 0 && (
            <div style={{ marginTop: "16px", textAlign: "left", width: "100%" }}>
              <div style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 800, letterSpacing: "1px", marginBottom: "8px", textTransform: "uppercase" }}>
                🏆 ROUND LEADERBOARD ({roundCompleters.length} COMPLETED)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "160px", overflowY: "auto" }}>
                {roundCompleters.map((res, idx) => {
                  const isMe = res.player_id === playerId || res.id === playerId;
                  return (
                    <div
                      key={res.id || idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        background: isMe ? "rgba(124, 92, 255, 0.25)" : "rgba(255, 255, 255, 0.05)",
                        border: isMe ? "1px solid rgba(124, 92, 255, 0.5)" : "1px solid rgba(255, 255, 255, 0.08)",
                        fontSize: "0.85rem"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontWeight: 900, color: idx === 0 ? "#fbbf24" : idx === 1 ? "#cbd5e1" : idx === 2 ? "#cd7f32" : "#94a3b8" }}>
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                        </span>
                        <strong style={{ color: "#ffffff" }}>{res.name || res.player_name}</strong>
                        {isMe && <span style={{ fontSize: "0.7rem", color: "#a78bfa", fontWeight: 800 }}>(YOU)</span>}
                      </div>
                      <strong style={{ color: "#34d399", fontWeight: 800 }}>
                        {Number(res.completion_time || res.time || 0).toFixed(2)}s
                      </strong>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
            <p style={{ color: "#a78bfa", fontWeight: 700, fontSize: "0.9rem" }}>
              ✓ Confirmed advancing to next round!
            </p>
          </div>

          <div className="loader-spinner-purple" style={{ margin: "16px auto 0" }} />
        </div>
      </div>
    );
  }

  // 4. COMPLETED WAITING FOR ROUND END SCREEN (IMMEDIATE SOLVED SCREEN)
  if (effectiveStatus === "completed_waiting") {
    const timeDisplaySec = Number(solveTimeRecord || 0).toFixed(2);

    return (
      <div className="player-mobile-shell center-wrapper">
        <div className="mobile-card glass-card result-card animate-pop" style={{ borderColor: "rgba(16, 185, 129, 0.6)" }}>
          <div className="success-check-icon gold-glow" style={{ background: "rgba(16, 185, 129, 0.2)", border: "2px solid rgba(16, 185, 129, 0.6)", color: "#34d399", fontSize: "2.5rem" }}>
            ✅
          </div>
          <h1 className="joined-title" style={{ color: "#34d399" }}>
            PUZZLE COMPLETE
          </h1>
          <p style={{ fontSize: "1.1rem", fontWeight: 700, color: "#f8fafc", margin: "6px 0 12px" }}>
            Well done, {name}.
          </p>

          <div
            style={{
              background: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              borderRadius: "14px",
              padding: "16px",
              margin: "12px 0 16px",
              textAlign: "center"
            }}
          >
            <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase" }}>
              COMPLETED IN
            </span>
            <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "#34d399", margin: "4px 0" }}>
              {timeDisplaySec}s
            </div>
            <p style={{ color: "#cbd5e1", fontSize: "0.85rem", margin: "4px 0 0", fontWeight: 600 }}>
              Your result has been recorded.
            </p>
          </div>

          <div style={{ background: "rgba(124, 92, 255, 0.15)", border: "1px solid rgba(124, 92, 255, 0.3)", borderRadius: "12px", padding: "12px 16px", marginBottom: "16px" }}>
            {myRank ? (
              <div>
                <span style={{ fontSize: "0.75rem", color: "#a78bfa", fontWeight: 800, letterSpacing: "1px" }}>LIVE RANKING</span>
                <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#fbbf24" }}>RANK #{myRank}</div>
              </div>
            ) : (
              <div style={{ color: "#a78bfa", fontWeight: 700, fontSize: "0.9rem" }}>
                ⏳ Waiting for final ranking...
              </div>
            )}
          </div>

          <p className="sub-hint" style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
            Great job! Waiting for other players to finish...
          </p>
          <div className="loader-spinner-purple" style={{ margin: "16px auto 0" }} />
        </div>
      </div>
    );
  }

  // 5. ADVANCING TO NEXT ROUND SCREEN
  if (effectiveStatus === "advancing") {
    return (
      <div className="player-mobile-shell center-wrapper">
        <div className="mobile-card glass-card result-card animate-pop" style={{ borderColor: "rgba(124, 92, 255, 0.5)" }}>
          <div className="success-check-icon" style={{ background: "rgba(124, 92, 255, 0.2)", border: "2px solid rgba(124, 92, 255, 0.6)", color: "#a78bfa", fontSize: "2.5rem" }}>
            🎉
          </div>
          <h1 className="joined-title" style={{ color: "#a78bfa" }}>YOU'RE THROUGH!</h1>
          <p style={{ fontSize: "1.05rem", fontWeight: 700, color: "#f8fafc", margin: "10px 0 16px" }}>
            You're through! Waiting for Round {gameState.round + 1} to start...
          </p>
          <div className="result-stats-row">
            {solveTimeRecord !== null && (
              <div className="result-stat-box">
                <span className="stat-label">LAST ROUND TIME</span>
                <strong className="stat-val" style={{ color: "#34d399" }}>{Number(solveTimeRecord).toFixed(2)}s</strong>
              </div>
            )}
            <div className="result-stat-box">
              <span className="stat-label">STATUS</span>
              <strong className="stat-val" style={{ color: "#a78bfa" }}>✓ ADVANCED</strong>
            </div>
          </div>
          <div className="loader-spinner-purple" style={{ margin: "20px auto 0" }} />
        </div>
      </div>
    );
  }

  // 6. ROUND STARTING PRE-REVEAL STAGE
  if (effectiveStatus === "get_ready") {
    return (
      <div className="player-mobile-shell center-wrapper">
        <div className="countdown-card glass-card animate-pop">
          <span className="countdown-phase-tag">ROUND {gameState.round}</span>
          <h2>GET READY!</h2>
          <p className="sub-hint">The memory image will appear in a moment...</p>
          <div className="loader-spinner-purple" style={{ margin: "20px auto 0" }} />
        </div>
      </div>
    );
  }

  // 7. MEMORY PHASE
  if (effectiveStatus === "memorizing") {
    const isUrgent = remainingSec <= 5;
    return (
      <div className="player-mobile-shell memory-screen">
        <header className="mobile-header">
          <span className="room-tag">ROOM • {roomCode}</span>
          <span className="round-tag">ROUND {gameState.round}</span>
        </header>

        <div className="memory-banner">
          <span className="badge-memorize">🧠 MEMORIZE THE IMAGE</span>
          <h2>Look closely at the details!</h2>
          <p className="sub-hint">Remember as much detail as you can before it disappears.</p>
        </div>

        <div className="memory-image-holder glass-card">
          {gameState.image ? (
            <img src={gameState.image} alt="Memory Target" className="memory-target-img" />
          ) : (
            <div className="no-image-text">No Image Selected</div>
          )}
        </div>

        <div className={`timer-ring-container ${isUrgent ? "timer-urgent" : ""}`}>
          <div className="timer-ring-value">{Math.ceil(remainingSec)}</div>
          <span className="timer-ring-label">SECONDS REMAINING</span>
        </div>
      </div>
    );
  }

  // 8. COUNTDOWN TRANSITION PHASE
  if (effectiveStatus === "countdown") {
    return (
      <div className="player-mobile-shell countdown-screen center-wrapper">
        <div className="countdown-card glass-card">
          <span className="countdown-phase-tag">TIME'S UP!</span>
          <h2>GET READY...</h2>
          <div className="big-countdown-number animate-pop">
            {Math.ceil(remainingSec) > 0 ? Math.ceil(remainingSec) : "GO!"}
          </div>
          <p>The image is gone! Rebuild it from memory!</p>
        </div>
      </div>
    );
  }

  // 9. ACTIVE PUZZLE SOLVING PHASE
  if (effectiveStatus === "playing") {
    return (
      <div className="player-mobile-shell puzzle-screen">
        <header className="mobile-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexShrink: 0, minHeight: "48px" }}>
          <span className="player-name-tag" style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "100px" }}>👤 {name}</span>
          <span className="round-tag">ROUND {gameState.round}</span>
          <span className={`live-timer-chip ${remainingSec <= 10 ? "timer-danger" : ""}`} style={{ fontVariantNumeric: "tabular-nums", minWidth: "76px", textAlign: "center", display: "inline-block" }}>
            ⏱️ {remainingSec.toFixed(1)}s
          </span>
          {gameState.image && (
            <button
              onClick={() => setShowPeekModal(true)}
              style={{
                background: "rgba(124, 92, 255, 0.25)",
                border: "1px solid rgba(124, 92, 255, 0.5)",
                color: "#a78bfa",
                borderRadius: "8px",
                padding: "4px 8px",
                fontSize: "0.75rem",
                fontWeight: 800,
                cursor: "pointer"
              }}
            >
              👁️ PEEK
            </button>
          )}
        </header>

        <div className="puzzle-header-title" style={{ minHeight: "54px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
            <span className="puzzle-badge">🧠 REBUILD THE IMAGE</span>
            <span className="puzzle-badge" style={{ background: "rgba(0, 210, 255, 0.15)", color: "#00d2ff", border: "1px solid rgba(0, 210, 255, 0.3)" }}>
              {gameState.pieces || 16} PIECES
            </span>
          </div>
          {selectedTileIdx !== null ? (
            <div className="animate-pop" style={{ background: "rgba(0, 210, 255, 0.2)", border: "1px solid rgba(0, 210, 255, 0.6)", color: "#00d2ff", padding: "4px 12px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 800, margin: "2px auto 0", width: "fit-content" }}>
              ✨ Tile #{selectedTileIdx + 1} Selected — Tap another tile to swap!
            </div>
          ) : (
            <p className="puzzle-sub-hint" style={{ color: "#cbd5e1", fontSize: "0.8rem", margin: "2px 0 0" }}>
              🖐️ Drag & drop tiles onto each other to swap, or tap tiles to select!
            </p>
          )}
        </div>

        <ImagePuzzleBoard
          image={gameState.image}
          pieces={pieces}
          onSwapPieces={handleSwapPieces}
          onSelectTile={(idx) => setSelectedTileIdx(idx)}
          disabled={isCompleted || remainingSec <= 0 || tournamentStatus === "ELIMINATED"}
        />

        {/* PEEK TARGET IMAGE HINT MODAL */}
        {showPeekModal && (
          <div className="modal-overlay" onClick={() => setShowPeekModal(false)}>
            <div className="modal-content glass-card animate-pop" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center", padding: "20px", maxWidth: "90vw", width: "360px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <h3 style={{ margin: 0, color: "#a78bfa", fontSize: "1rem", fontWeight: 800 }}>🖼️ TARGET IMAGE REFERENCE</h3>
                <button onClick={() => setShowPeekModal(false)} style={{ background: "transparent", border: "none", color: "#cbd5e1", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
              </div>
              <div style={{ width: "100%", aspectRatio: "1", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255, 255, 255, 0.2)", marginBottom: "14px", background: "#000" }}>
                <img src={gameState.image} alt="Target Reference" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
              <button className="btn btn-primary" onClick={() => setShowPeekModal(false)} style={{ width: "100%", fontWeight: 800 }}>
                CLOSE PEEK & CONTINUE
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 10. IN LOBBY ("✓ YOU'RE IN!")
  return (
    <div className="player-mobile-shell">
      <div className="mobile-card glass-card player-joined-card">
        <div className="success-check-icon">✓</div>
        <h1 className="joined-title">YOU'RE IN!</h1>
        <h2 className="welcome-name">Welcome, {name}</h2>
        <span className="room-code-badge">ROOM • {roomCode}</span>

        <div className="live-joined-counter-box">
          <span className="counter-label">PLAYERS JOINED</span>
          <span className="counter-number">{Math.max(roomPlayerCount, roomPlayers.length)}</span>
        </div>

        <div className="joined-lobby-players-wall" style={{ marginTop: "16px", marginBottom: "16px" }}>
          <span className="lobby-wall-title" style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 700, letterSpacing: "1px", display: "block", marginBottom: "8px" }}>
            PLAYERS IN LOBBY ({Math.max(roomPlayerCount, roomPlayers.length)})
          </span>
          <div className="lobby-chips-grid" style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", maxHeight: "160px", overflowY: "auto" }}>
            {roomPlayers.length > 0 ? (
              roomPlayers.map((p, idx) => (
                <div
                  key={p.id || idx}
                  className="lobby-player-chip"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: p.id === playerId ? "rgba(124, 92, 255, 0.25)" : "rgba(255, 255, 255, 0.07)",
                    border: p.id === playerId ? "1px solid rgba(124, 92, 255, 0.6)" : "1px solid rgba(255, 255, 255, 0.12)",
                    padding: "6px 12px",
                    borderRadius: "20px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: "#f8fafc"
                  }}
                >
                  <span className="chip-avatar" style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.15)", padding: "2px 6px", borderRadius: "10px" }}>
                    {p.name ? p.name.substring(0, 2).toUpperCase() : "PL"}
                  </span>
                  <span>{p.name}</span>
                  {p.id === playerId && <span style={{ fontSize: "0.7rem", color: "#a78bfa" }}>(YOU)</span>}
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }}></span>
                </div>
              ))
            ) : (
              <div key="you-chip" className="lobby-player-chip" style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(124, 92, 255, 0.25)", border: "1px solid rgba(124, 92, 255, 0.6)", padding: "6px 12px", borderRadius: "20px", fontSize: "0.85rem", fontWeight: 600, color: "#f8fafc" }}>
                <span className="chip-avatar" style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.15)", padding: "2px 6px", borderRadius: "10px" }}>
                  {name.substring(0, 2).toUpperCase()}
                </span>
                <span>{name} (YOU)</span>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }}></span>
              </div>
            )}
          </div>
        </div>

        <p className="all-set-text">You're all set.</p>
        <p className="waiting-host-note">Waiting for the host to start the challenge...</p>

        <button
          onClick={() => {
            localStorage.removeItem(SESSION_KEY);
            sessionStorage.removeItem(`mr_player_${roomCode}`);
            setJoined(false);
            setPlayerId(null);
            setName("");
          }}
          style={{
            margin: "12px auto 16px",
            display: "block",
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            color: "#e2e8f0",
            padding: "8px 16px",
            borderRadius: "20px",
            fontSize: "0.8rem",
            fontWeight: "700",
            cursor: "pointer"
          }}
        >
          ✏️ EDIT NAME / RE-REGISTER
        </button>

        <div className="connection-status-pill">
          <span className="dot online" />
          <span>CONNECTED</span>
        </div>
      </div>
    </div>
  );
}
