import React, { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase, getPublicJoinUrl, isLocalhostUrl } from "../../config/supabase";
import { fetchActivePlayers, fetchRoundResults } from "../../utils/db";

export function BigScreenDisplay({ roomCode = "EXPO26" }) {
  const [gameState, setGameState] = useState({
    phase: "LOBBY", // LOBBY, ROUND_STARTING, MEMORY, COUNTDOWN, PUZZLE, RESULT, FINAL_RESULTS
    round: 1,
    totalRounds: 3,
    image: null,
    imageName: null,
    memory: 20,
    puzzle: 45,
    startAt: Date.now(),
    isPaused: false
  });

  const [players, setPlayers] = useState([]);
  const [results, setResults] = useState([]);
  const [remainingSec, setRemainingSec] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  // Queue for completion celebration popups
  const [completionQueue, setCompletionQueue] = useState([]);
  const [activeCelebration, setActiveCelebration] = useState(null);

  // Derive public player join URL (respects VITE_PUBLIC_APP_URL)
  const joinUrl = getPublicJoinUrl(roomCode);
  const isLocal = isLocalhostUrl(joinUrl);

  // Fullscreen toggle helper
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.warn("Fullscreen request error:", err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        });
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Fetch initial active players & round results snapshot from Supabase Postgres DB (scoped by gameId)
  // Fetch initial active players & round results snapshot from Supabase Postgres DB (scoped by gameId)
  const loadDbSnapshot = useCallback(async () => {
    const [dbPlayers, dbResults] = await Promise.all([
      fetchActivePlayers(roomCode, gameState.gameId),
      fetchRoundResults(roomCode, gameState.round || null, gameState.gameId)
    ]);
    if (dbPlayers) {
      setPlayers(dbPlayers);
      const champWinner = dbPlayers.find((p) => p.tournament_status === "WINNER");
      if (champWinner) {
        setGameState((prev) => ({
          ...prev,
          phase: "FINAL_RESULTS",
          finalWinner: champWinner
        }));
      }
    }
    if (dbResults && dbResults.length > 0) {
      setResults((prev) => {
        const map = new Map();
        prev.forEach((r) => {
          const k = (r.player_id || r.id || r.name || "").toString().toLowerCase();
          if (k) map.set(k, r);
        });
        dbResults.forEach((r) => {
          const k = (r.player_id || r.id || r.name || "").toString().toLowerCase();
          if (k) map.set(k, r);
        });
        return Array.from(map.values()).sort((a, b) => Number(a.time || a.completion_time || 0) - Number(b.time || b.completion_time || 0));
      });
    }
  }, [roomCode, gameState.gameId, gameState.round]);

  useEffect(() => {
    loadDbSnapshot();
  }, [loadDbSnapshot]);

  // Handle celebration queue progression (display each for 2.5 seconds)
  useEffect(() => {
    if (activeCelebration || completionQueue.length === 0) return;

    const nextCelebration = completionQueue[0];
    setActiveCelebration(nextCelebration);
    setCompletionQueue((prev) => prev.slice(1));

    const timer = setTimeout(() => {
      setActiveCelebration(null);
    }, 2500);

    return () => clearTimeout(timer);
  }, [completionQueue, activeCelebration]);

  // Helper to push celebration to queue
  const triggerCelebration = useCallback((resObj) => {
    if (!resObj || !resObj.name) return;
    setCompletionQueue((prev) => {
      const isDup = prev.some((item) => item.id === resObj.id || (item.player_id && item.player_id === resObj.player_id));
      if (isDup) return prev;
      return [...prev, resObj];
    });
  }, []);

  // Supabase Realtime Postgres Changes & Broadcast listeners
  useEffect(() => {
    if (!supabase) return;

    // 1. Broadcast channel for instantaneous socket state updates
    const broadcastChannel = supabase.channel(`memory-rush-${roomCode}`, {
      config: { presence: { key: "big-screen-display" } }
    });

    broadcastChannel.on("presence", { event: "sync" }, () => {
      setIsConnected(true);
    });

    broadcastChannel.on("broadcast", { event: "join" }, ({ payload }) => {
      setPlayers((prev) => {
        if (prev.some((p) => p.id === payload.id)) {
          return prev.map((p) => (p.id === payload.id ? { ...p, connected: true, status: "WAITING" } : p));
        }
        return [...prev, { ...payload, status: "WAITING", connected: true, total_score: 0 }];
      });
    });

    broadcastChannel.on("broadcast", { event: "finish" }, ({ payload }) => {
      const solveTime = Number(payload.time || payload.completion_time || 0);
      const nameStr = payload.name || payload.player_name || "Player";
      const scoreVal = payload.score || 80;

      const newResObj = {
        id: payload.id || `res-${Date.now()}`,
        player_id: payload.player_id || payload.id,
        name: nameStr,
        player_name: nameStr,
        time: solveTime,
        completion_time: solveTime,
        score: scoreVal,
        rank: payload.rank || 1
      };

      setResults((prev) => {
        const pIdLower = (newResObj.player_id || "").toString().toLowerCase();
        const pNameLower = (newResObj.name || "").toString().toLowerCase();
        if (prev.some((r) => {
          const rId = (r.player_id || r.id || "").toString().toLowerCase();
          const rName = (r.player_name || r.name || "").toString().toLowerCase();
          return (rId && rId === pIdLower) || (rName && rName === pNameLower);
        })) return prev;

        return [...prev, newResObj].sort((a, b) => Number(a.time || a.completion_time || 0) - Number(b.time || b.completion_time || 0));
      });

      setPlayers((prev) =>
        prev.map((p) => {
          const pId = (p.id || "").toString().toLowerCase();
          const targetId = (newResObj.player_id || "").toString().toLowerCase();
          const pName = (p.name || "").toString().toLowerCase();
          const targetName = (newResObj.name || "").toString().toLowerCase();

          if ((pId && pId === targetId) || (pName && pName === targetName)) {
            return { ...p, status: "COMPLETED" };
          }
          return p;
        })
      );

      triggerCelebration(newResObj);
    });

    broadcastChannel.on("broadcast", { event: "game" }, ({ payload }) => {
      setGameState(payload);
      if (payload.phase === "MEMORY" || payload.phase === "ROUND_STARTING") {
        setResults([]);
        setCompletionQueue([]);
        setActiveCelebration(null);
      }
    });

    broadcastChannel.on("broadcast", { event: "tournament_evaluation" }, ({ payload }) => {
      if (payload && payload.finalWinner) {
        setGameState((prev) => ({
          ...prev,
          phase: "FINAL_RESULTS",
          finalWinner: payload.finalWinner
        }));
      }
    });

    broadcastChannel.subscribe((status) => {
      setIsConnected(status === "SUBSCRIBED");
    });

    // 2. Postgres Changes listener for `players` DB table
    const dbPlayersChannel = supabase.channel(`db-bigscreen-players-${roomCode}`);

    dbPlayersChannel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "players", filter: `room_code=eq.${roomCode}` },
      async () => {
        const freshPlayers = await fetchActivePlayers(roomCode, gameState.gameId);
        if (freshPlayers) {
          setPlayers(freshPlayers);
          const champWinner = freshPlayers.find((p) => p.tournament_status === "WINNER");
          if (champWinner) {
            setGameState((prev) => ({
              ...prev,
              phase: "FINAL_RESULTS",
              finalWinner: champWinner
            }));
          }
        }
      }
    );

    dbPlayersChannel.subscribe();

    // 3. Postgres Changes listener for `round_results` DB table
    const dbResultsChannel = supabase.channel(`db-bigscreen-results-${roomCode}`);

    dbResultsChannel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "round_results" },
      async (payload) => {
        if (payload.eventType === "INSERT") {
          const solveTime = Number(payload.new.completion_time || payload.new.time || 0);
          const nameStr = payload.new.player_name || payload.new.name || "Player";
          const resObj = {
            ...payload.new,
            time: solveTime,
            name: nameStr
          };

          setResults((prev) => {
            if (prev.some((r) => r.id === resObj.id)) return prev;
            return [...prev, resObj].sort((a, b) => a.time - b.time);
          });

          setPlayers((prev) =>
            prev.map((p) => (p.id === resObj.player_id ? { ...p, status: "COMPLETED" } : p))
          );

          triggerCelebration(resObj);
        }
      }
    );

    dbResultsChannel.subscribe();

    return () => {
      supabase.removeChannel(broadcastChannel);
      supabase.removeChannel(dbPlayersChannel);
      supabase.removeChannel(dbResultsChannel);
    };
  }, [roomCode, triggerCelebration]);

  // Phase Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      if (!gameState.startAt) return;
      const now = Date.now();
      const elapsed = Math.max(0, (now - gameState.startAt) / 1000);
      setElapsedSec(elapsed);

      let durationSec = 30;
      if (gameState.phase === "MEMORY") durationSec = gameState.memory || 20;
      else if (gameState.phase === "PUZZLE") durationSec = gameState.puzzle || 45;
      else if (gameState.phase === "ROUND_STARTING") durationSec = 2;
      else if (gameState.phase === "COUNTDOWN") durationSec = 3;

      const endMs = gameState.startAt + durationSec * 1000;
      setRemainingSec(Math.max(0, (endMs - now) / 1000));
    }, 100);

    return () => clearInterval(timer);
  }, [gameState]);

  // Deterministic Projected Score calculation (Display only - never saved to DB!)
  const getProjectedScore = (elapsedSeconds, totalDuration = 45) => {
    const maxScore = 100;
    const minScore = 25;
    const ratio = Math.min(1, Math.max(0, elapsedSeconds / totalDuration));
    return Math.max(minScore, Math.round(maxScore - ratio * (maxScore - minScore)));
  };

  // Compute live combined telemetry leaderboard
  const processedPlayerIds = new Set();
  const liveLeaderboard = [];

  players.forEach((player) => {
    const pIdLower = (player.id || "").toString().toLowerCase();
    const pNameLower = (player.name || "").toString().toLowerCase();

    const playerResult = results.find((r) => {
      const rId = (r.player_id || r.id || "").toString().toLowerCase();
      const rName = (r.player_name || r.name || "").toString().toLowerCase();
      return (rId && rId === pIdLower) || (rName && rName === pNameLower);
    });

    if (playerResult || player.status === "COMPLETED") {
      if (playerResult) processedPlayerIds.add((playerResult.player_id || playerResult.id || "").toString().toLowerCase());
      processedPlayerIds.add(pIdLower);
      liveLeaderboard.push({
        id: player.id,
        name: player.name,
        status: "COMPLETED",
        score: playerResult?.score || 100,
        time: Number(playerResult?.time || playerResult?.completion_time || 0),
        isOfficial: true,
        rank: playerResult?.rank || 1
      });
    } else if (gameState.phase === "PUZZLE") {
      liveLeaderboard.push({
        id: player.id,
        name: player.name,
        status: player.connected ? "PLAYING" : "DISCONNECTED",
        score: getProjectedScore(elapsedSec, gameState.puzzle || 45),
        time: null,
        isOfficial: false,
        rank: null
      });
    } else {
      liveLeaderboard.push({
        id: player.id,
        name: player.name,
        status: player.tournament_status === "ELIMINATED" ? "ELIMINATED" : "WAITING",
        score: 0,
        time: null,
        isOfficial: false,
        rank: null
      });
    }
  });

  results.forEach((r) => {
    const rKey = (r.player_id || r.id || "").toString().toLowerCase();
    const rName = (r.player_name || r.name || "").toString().toLowerCase();
    if ((rKey && !processedPlayerIds.has(rKey)) || (rName && !processedPlayerIds.has(rName))) {
      liveLeaderboard.push({
        id: r.player_id || r.id,
        name: r.name || r.player_name || "Player",
        status: "COMPLETED",
        score: r.score || 100,
        time: Number(r.time || r.completion_time || 0),
        isOfficial: true,
        rank: r.rank || 1
      });
    }
  });

  liveLeaderboard.sort((a, b) => {
    if (a.status === "COMPLETED" && b.status === "COMPLETED") return a.time - b.time;
    if (a.status === "COMPLETED") return -1;
    if (b.status === "COMPLETED") return 1;
    if (a.status === "PLAYING" && b.status === "PLAYING") return b.score - a.score;
    if (a.status === "PLAYING") return -1;
    if (b.status === "PLAYING") return 1;
    return 0;
  });

  const completedCount = results.length;
  const solvingCount = Math.max(0, players.length - completedCount);

  return (
    <div className={`big-screen-stage ${isFullscreen ? "is-fullscreen" : ""}`}>
      {/* CELEBRATION TOAST OVERLAY QUEUE */}
      {activeCelebration && (
        <div className="celebration-overlay-modal animate-pop">
          <div className="celebration-card glass-card">
            <div className="celebration-icon">🎉</div>
            <h2 className="celebration-title">PUZZLE COMPLETED!</h2>
            <div className="celebration-player-name">{activeCelebration.name || activeCelebration.player_name}</div>
            <div className="celebration-stats-row">
              <div className="celeb-stat">
                <span className="label">TIME</span>
                <span className="value">{Number(activeCelebration.time || activeCelebration.completion_time).toFixed(2)}s</span>
              </div>
              <div className="celeb-stat">
                <span className="label">SCORE</span>
                <span className="value official-val">+{activeCelebration.score || 100} PTS</span>
              </div>
            </div>
            <div className="official-verify-badge">OFFICIAL VERIFIED RESULT</div>
          </div>
        </div>
      )}

      {/* TOP TV STAGE HEADER */}
      <header className="stage-header">
        <div className="stage-brand-group">
          <span className="logo-icon">🧩</span>
          <div>
            <h1 className="stage-logo-title">MEMORY RUSH</h1>
            <span className="stage-event-tag">TCS EEE EXPO 2026</span>
          </div>
        </div>

        <div className="stage-header-center">
          <div className="phase-pill-tag">
            PHASE • {gameState.phase.replace("_", " ")}
          </div>
          <div className="room-code-badge">
            ROOM: <strong>{roomCode}</strong>
          </div>
        </div>

        <div className="stage-header-actions">
          <div className={`stage-connection-status ${isConnected ? "online" : "reconnecting"}`}>
            <span className="status-dot"></span>
            <span>{isConnected ? "REALTIME ONLINE" : "RECONNECTING..."}</span>
          </div>

          <button className="stage-fullscreen-btn btn-secondary" onClick={toggleFullscreen}>
            {isFullscreen ? "Exit Fullscreen" : "ENTER FULLSCREEN ⛶"}
          </button>
        </div>
      </header>

      {/* LOBBY / SCAN TO PLAY STAGE */}
      {(gameState.phase === "LOBBY" || gameState.phase === "WAITING") && (
        <div className="stage-content stage-lobby-layout">
          <div className="lobby-hero-banner">
            <h1 className="stage-hero-heading">AI MEMORY CHALLENGE</h1>
            <p className="stage-hero-sub">Scan the QR code with your phone camera to join the live competition</p>
          </div>

          <div className="lobby-center-grid">
            <div className="stage-qr-card glass-card">
              <div className="qr-border-glow">
                <QRCodeSVG value={joinUrl} size={300} level="H" includeMargin={true} />
              </div>
              <span className="join-url-label">
                Join at: <strong>{joinUrl}</strong>
                {isLocal && (
                  <span className="status-badge-chip badge-warning" style={{ marginLeft: "10px", fontSize: "0.75rem" }}>
                    ⚠️ LOCALHOST (Open display via Network IP)
                  </span>
                )}
              </span>
              <div className="join-instructions-pills">
                <span>1. Scan QR</span>
                <span>•</span>
                <span>2. Enter Name</span>
                <span>•</span>
                <span>3. Reconstruct AI Image</span>
              </div>
            </div>

            <div className="lobby-players-telemetry glass-card">
              <div className="counter-box-header">
                <span className="counter-title">PLAYERS JOINED</span>
                <div className="counter-big-val animate-pulse-text">{players.length}</div>
              </div>

              <div className="joined-players-scroll-wall">
                {players.length === 0 ? (
                  <div className="empty-players-notice">
                    <span className="radar-ping"></span>
                    <p>Waiting for first player to scan QR...</p>
                  </div>
                ) : (
                  <div className="joined-players-grid">
                    {players.map((p, idx) => (
                      <div key={p.id || idx} className="player-joined-chip animate-pop">
                        <span className="chip-avatar">{p.name.substring(0, 2).toUpperCase()}</span>
                        <span className="chip-name">{p.name}</span>
                        <span className="chip-ready">✓ READY</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="lobby-footer-notice">
                <span>Waiting for host to launch Round {gameState.round}...</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ROUND STARTING PRE-REVEAL STAGE */}
      {gameState.phase === "ROUND_STARTING" && (
        <div className="stage-content stage-round-starting">
          <div className="starting-hero-card glass-card">
            <span className="round-badge">ROUND {gameState.round}</span>
            <h1 className="starting-title">GET READY...</h1>
            <p className="starting-sub">Memory Phase is about to begin. Prepare your visual memory!</p>
            <div className="pulsing-radar-ring"></div>
          </div>
        </div>
      )}

      {/* MEMORY STAGE */}
      {gameState.phase === "MEMORY" && (
        <div className="stage-content stage-memory-layout">
          <div className="memory-stage-header">
            <div className="stage-badge">ROUND {gameState.round} • MEMORY PHASE</div>
            <h1 className="stage-hero-heading">MEMORIZE THIS IMAGE</h1>
            <p className="stage-hero-sub">Study the AI image details carefully before it disappears!</p>
          </div>

          <div className="memory-frame-centered glass-card">
            {gameState.image ? (
              <img src={gameState.image} alt="Target Memory Asset" className="memory-stage-image" />
            ) : (
              <div className="memory-frame-placeholder">
                <h2>No Image Selected by Host</h2>
              </div>
            )}
            <div className="memory-timer-floating-badge">
              <span className="time-val">{Math.ceil(remainingSec)}</span>
              <span className="time-unit">SECONDS</span>
            </div>
          </div>
        </div>
      )}

      {/* COUNTDOWN STAGE */}
      {gameState.phase === "COUNTDOWN" && (
        <div className="stage-content stage-countdown-layout">
          <div className="countdown-card glass-card">
            <h2 className="times-up-label">TIME'S UP!</h2>
            <h1 className="get-ready-label">GET READY</h1>
            <div className="big-countdown-number animate-pop">
              {Math.ceil(remainingSec)}
            </div>
            <span className="go-label">GO! RECONSTRUCT THE PUZZLE ON YOUR PHONE</span>
          </div>
        </div>
      )}

      {/* PUZZLE STAGE (LIVE COMPETITION SCOREBOARD) */}
      {gameState.phase === "PUZZLE" && (
        <div className="stage-content stage-puzzle-layout">
          {/* STATS TELEMETRY BAR */}
          <div className="stage-telemetry-bar glass-card">
            <div className="tele-item">
              <span className="tele-label">PLAYERS JOINED</span>
              <span className="tele-val">{players.length}</span>
            </div>
            <div className="tele-divider"></div>
            <div className="tele-item">
              <span className="tele-label">COMPLETED</span>
              <span className="tele-val green-val">{completedCount}</span>
            </div>
            <div className="tele-divider"></div>
            <div className="tele-item">
              <span className="tele-label">STILL SOLVING</span>
              <span className="tele-val amber-val">{solvingCount}</span>
            </div>
            <div className="tele-divider"></div>
            <div className="tele-item main-timer">
              <span className="tele-label">PUZZLE TIMER</span>
              <span className="tele-val timer-val">{remainingSec.toFixed(1)}s</span>
            </div>
          </div>

          {/* MAIN LIVE SCOREBOARD */}
          <div className="stage-leaderboard-panel glass-card">
            <div className="panel-title-row">
              <h2>🏆 LIVE COMPETITION LEADERBOARD</h2>
              <span className="live-update-badge">● LIVE TELEMETRY UPDATES</span>
            </div>

            <div className="stage-leaderboard-table">
              {liveLeaderboard.length === 0 ? (
                <div className="empty-board-msg">
                  <p>Waiting for players to begin solving...</p>
                </div>
              ) : (
                liveLeaderboard.map((item, index) => (
                  <div key={item.id || index} className={`leader-row-card ${item.isOfficial ? "is-completed" : "is-playing"}`}>
                    <div className="row-rank-col">
                      {index === 0 ? "🥇 #1" : index === 1 ? "🥈 #2" : index === 2 ? "🥉 #3" : `#${index + 1}`}
                    </div>

                    <div className="row-player-col">
                      <span className="player-avatar">{item.name.substring(0, 2).toUpperCase()}</span>
                      <strong className="player-name-text">{item.name}</strong>
                    </div>

                    <div className="row-status-col">
                      {item.status === "COMPLETED" && <span className="status-chip badge-completed">✓ COMPLETED</span>}
                      {item.status === "PLAYING" && <span className="status-chip badge-playing animate-pulse">PLAYING</span>}
                      {item.status === "WAITING" && <span className="status-chip badge-waiting">WAITING</span>}
                      {item.status === "DISCONNECTED" && <span className="status-chip badge-disconnected">OFFLINE</span>}
                    </div>

                    <div className="row-score-col">
                      {item.isOfficial ? (
                        <div className="score-badge official-chip">
                          <span className="score-num">{item.score} PTS</span>
                          <span className="score-type">OFFICIAL</span>
                        </div>
                      ) : item.status === "PLAYING" ? (
                        <div className="score-badge projected-chip">
                          <span className="score-num">~{item.score} PTS</span>
                          <span className="score-type">PROJECTED</span>
                        </div>
                      ) : (
                        <span className="waiting-score-text">WAITING</span>
                      )}
                    </div>

                    <div className="row-time-col">
                      {item.time ? `${item.time.toFixed(2)}s` : item.status === "PLAYING" ? "Solving..." : "—"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ROUND COMPLETE / RESULT STAGE */}
      {(gameState.phase === "RESULT" || gameState.phase === "ROUND_COMPLETE") && (
        <div className="stage-content stage-result-layout">
          <div className="result-hero-header">
            <span className="stage-badge">ROUND {gameState.round} COMPLETE</span>
            <h1 className="stage-hero-heading">ROUND {gameState.round} RESULTS</h1>
          </div>

          {results.length > 0 ? (
            <>
              <div className="podium-container glass-card">
                {results[1] && (
                  <div className="podium-pillar pillar-2">
                    <div className="podium-medal">🥈</div>
                    <div className="podium-name">{results[1].name || results[1].player_name}</div>
                    <div className="podium-time">{Number(results[1].time || results[1].completion_time).toFixed(1)}s</div>
                    <div className="podium-score">+{results[1].score || 80} PTS OFFICIAL</div>
                  </div>
                )}

                <div className="podium-pillar pillar-1">
                  <div className="podium-crown">👑</div>
                  <div className="podium-medal">🥇</div>
                  <div className="podium-name">{results[0].name || results[0].player_name}</div>
                  <div className="podium-time">{Number(results[0].time || results[0].completion_time).toFixed(1)}s</div>
                  <div className="podium-score gold">+{results[0].score || 100} PTS OFFICIAL</div>
                </div>

                {results[2] && (
                  <div className="podium-pillar pillar-3">
                    <div className="podium-medal">🥉</div>
                    <div className="podium-name">{results[2].name || results[2].player_name}</div>
                    <div className="podium-time">{Number(results[2].time || results[2].completion_time).toFixed(1)}s</div>
                    <div className="podium-score">+{results[2].score || 65} PTS OFFICIAL</div>
                  </div>
                )}
              </div>

              {/* FULL COMPLETED LEADERBOARD LIST */}
              {results.length > 3 && (
                <div className="stage-leaderboard-panel glass-card" style={{ marginTop: "20px" }}>
                  <div className="panel-title-row">
                    <h3>📊 ALL COMPLETED PLAYERS ({results.length})</h3>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "10px", marginTop: "10px" }}>
                    {results.slice(3).map((res, idx) => (
                      <div key={res.id || idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontWeight: 900, color: "#a78bfa" }}>#{idx + 4}</span>
                          <strong style={{ color: "#ffffff" }}>{res.name || res.player_name}</strong>
                        </div>
                        <span style={{ color: "#34d399", fontWeight: 800 }}>{Number(res.time || res.completion_time).toFixed(1)}s</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="empty-podium-box glass-card">
              <h3>No completions recorded for Round {gameState.round}</h3>
            </div>
          )}

          {/* TIMED OUT / ELIMINATED SECTION */}
          {(() => {
            const uncompleted = players.filter((p) => {
              const pIdLower = (p.id || "").toString().toLowerCase();
              const pNameLower = (p.name || "").toString().toLowerCase();
              if (p.status === "COMPLETED") return false;
              return !results.some((r) => {
                const rId = (r.player_id || r.id || "").toString().toLowerCase();
                const rName = (r.player_name || r.name || "").toString().toLowerCase();
                return (rId && rId === pIdLower) || (rName && rName === pNameLower);
              });
            });
            if (uncompleted.length === 0) return null;
            return (
              <div className="glass-card" style={{ marginTop: "20px", padding: "16px 24px", borderColor: "rgba(239, 68, 68, 0.4)", background: "rgba(239, 68, 68, 0.08)" }}>
                <h4 style={{ color: "#f87171", margin: "0 0 10px 0", fontSize: "0.95rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px" }}>
                  ⏰ TIME EXPIRED / ELIMINATED ({uncompleted.length})
                </h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {uncompleted.map((p, idx) => (
                    <span key={p.id || idx} style={{ background: "rgba(239, 68, 68, 0.2)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#fca5a5", padding: "4px 12px", borderRadius: "16px", fontSize: "0.85rem", fontWeight: 600 }}>
                      {p.name} (Time Expired)
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

          <div className="result-footer-banner">
            <span>WAITING FOR HOST TO START NEXT ROUND...</span>
          </div>
        </div>
      )}

      {/* FINAL GAME COMPLETE STAGE */}
      {gameState.phase === "FINAL_RESULTS" && (
        <div className="stage-content stage-result-layout animate-pop">
          <div className="result-hero-header">
            <span className="stage-badge" style={{ background: "rgba(245, 158, 11, 0.25)", color: "#fbbf24", border: "1px solid rgba(245, 158, 11, 0.6)", fontSize: "14px", padding: "8px 20px" }}>
              🏆 TCS EXPO KNOCKOUT CHAMPIONSHIP
            </span>
            <h1 className="stage-hero-heading" style={{ color: "#fbbf24", fontSize: "3.2rem", textShadow: "0 0 30px rgba(251, 191, 36, 0.5)" }}>
              OVERALL TOURNAMENT WINNER
            </h1>
          </div>

          {(() => {
            const champ = gameState.finalWinner || players.find((p) => p.tournament_status === "WINNER") || liveLeaderboard[0];
            const champResult = results.find(
              (r) => r.player_id === champ?.id || r.player_name?.toLowerCase() === champ?.name?.toLowerCase() || r.id === champ?.id
            ) || (champ?.completion_time ? champ : null);

            const winningTimeText = champResult && (champResult.completion_time || champResult.time)
              ? `${Number(champResult.completion_time || champResult.time).toFixed(2)}s`
              : champ?.completion_time
              ? `${Number(champ.completion_time).toFixed(2)}s`
              : "Completed";

            return (
              <div className="podium-container glass-card gold-glow" style={{ padding: "48px 60px", maxWidth: "800px", width: "100%", margin: "0 auto", textAlign: "center", border: "2px solid #fbbf24" }}>
                <div style={{ fontSize: "6rem", marginBottom: "12px" }}>👑</div>
                <h1 style={{ fontSize: "3.5rem", color: "#fbbf24", fontWeight: 900, letterSpacing: "1px", marginBottom: "16px" }}>
                  {champ?.name || champ?.player_name || "Champion"}
                </h1>
                
                <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "16px", marginTop: "20px", fontSize: "1.1rem" }}>
                  <div className="status-badge" style={{ background: "rgba(255, 255, 255, 0.08)", color: "#f8fafc", padding: "10px 20px", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.15)" }}>
                    EMPLOYEE ID: <strong style={{ color: "#00d2ff" }}>{champ?.employee_id || champ?.employeeId || "N/A"}</strong>
                  </div>
                  <div className="status-badge" style={{ background: "rgba(124, 92, 255, 0.2)", color: "#c084fc", padding: "10px 20px", borderRadius: "12px", border: "1px solid rgba(124, 92, 255, 0.4)" }}>
                    TCS UNIT: <strong style={{ color: "#e9d5ff" }}>{champ?.tcs_unit || champ?.tcsUnit || "N/A"}</strong>
                  </div>
                  <div className="status-badge" style={{ background: "rgba(16, 185, 129, 0.2)", color: "#34d399", padding: "10px 20px", borderRadius: "12px", border: "1px solid rgba(16, 185, 129, 0.4)" }}>
                    WINNING TIME: <strong style={{ color: "#6ee7b7" }}>⏱ {winningTimeText}</strong>
                  </div>
                </div>

                <div style={{ marginTop: "32px", fontSize: "1.6rem", color: "#fbbf24", fontWeight: 900, letterSpacing: "2px" }}>
                  🏆 FINAL TOURNAMENT CHAMPION • CONGRATULATIONS! 🏆
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

