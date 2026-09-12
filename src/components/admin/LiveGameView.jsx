import React from "react";

export function LiveGameView({
  gameState,
  players = [],
  results = [],
  onStartRound,
  onPause,
  onResume,
  onRestartRound,
  onEndRound,
  onNextRound,
  onResetGame
}) {
  const phases = ["LOBBY", "MEMORY", "COUNTDOWN", "PUZZLE", "RESULT", "FINISHED"];

  const currentPhaseIndex = Math.max(0, phases.indexOf(gameState.phase));
  const isImageSelected = Boolean(gameState.image);

  // Dynamic player status calculations
  const totalPlayers = players.length;
  const activePlayers = players.filter((p) => p.tournament_status !== "ELIMINATED");
  const activeCount = activePlayers.length;
  const winnerPlayer = gameState.finalWinner || players.find((p) => p.tournament_status === "WINNER");
  const isTournamentComplete = Boolean(winnerPlayer || gameState.phase === "FINAL_RESULTS");

  const completedCount = results.length;
  const solvingCount =
    gameState.phase === "PUZZLE"
      ? Math.max(0, activeCount - completedCount)
      : 0;
  const eliminatedCount = players.filter((p) => p.tournament_status === "ELIMINATED").length;

  const currentRoundWinner = results.length > 0 ? results[0] : null;

  return (
    <div className="live-game-view">
      {/* ROUND WINNER BANNER FOR ADMIN DASHBOARD */}
      {currentRoundWinner && (
        <div className="glass-card gold-glow animate-pop" style={{ padding: "20px 28px", marginBottom: "20px", borderColor: "#fbbf24", background: "rgba(245, 158, 11, 0.18)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <span className="status-badge-chip" style={{ background: "#fbbf24", color: "#000", fontWeight: 900, fontSize: "0.85rem", padding: "4px 12px", borderRadius: "999px" }}>
                🏆 ROUND {gameState.round} WINNER (FASTEST SOLVER)
              </span>
              <h2 style={{ fontSize: "1.8rem", color: "#fbbf24", margin: "8px 0 4px", fontWeight: 900 }}>
                👑 {currentRoundWinner.name || currentRoundWinner.player_name}
              </h2>
              <div style={{ display: "flex", gap: "16px", color: "#f8fafc", fontSize: "0.95rem", fontWeight: 700 }}>
                <span>⏱️ Solve Time: <strong style={{ color: "#34d399" }}>{Number(currentRoundWinner.time || currentRoundWinner.completion_time || 0).toFixed(2)}s</strong></span>
                <span>•</span>
                <span>🥇 Rank: <strong style={{ color: "#fbbf24" }}>#1 of {results.length} Completers</strong></span>
              </div>
            </div>
            <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
              <span style={{ fontSize: "2.5rem" }}>🥇</span>
              <span style={{ color: "#34d399", fontWeight: 800, fontSize: "0.85rem", background: "rgba(16, 185, 129, 0.2)", padding: "4px 10px", borderRadius: "8px" }}>
                ✓ VERIFIED FASTEST SOLVER
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TOURNAMENT COMPLETE WINNER BANNER FOR ADMIN */}
      {isTournamentComplete && winnerPlayer && !currentRoundWinner && (
        <div className="glass-card gold-glow animate-pop" style={{ padding: "24px 32px", marginBottom: "20px", borderColor: "#fbbf24", background: "rgba(245, 158, 11, 0.15)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <span className="status-badge-chip" style={{ background: "#fbbf24", color: "#000", fontWeight: 900, fontSize: "0.85rem", padding: "4px 12px", borderRadius: "999px" }}>
                🏆 TOURNAMENT COMPLETE
              </span>
              <h2 style={{ fontSize: "1.8rem", color: "#fbbf24", margin: "8px 0 4px", fontWeight: 900 }}>
                WINNER: {winnerPlayer.name || winnerPlayer.player_name}
              </h2>
              <div style={{ display: "flex", gap: "16px", color: "#cbd5e1", fontSize: "0.9rem" }}>
                <span>EMPLOYEE ID: <strong>{winnerPlayer.employee_id || winnerPlayer.employeeId || "N/A"}</strong></span>
                <span>•</span>
                <span>TCS UNIT: <strong>{winnerPlayer.tcs_unit || winnerPlayer.tcsUnit || "N/A"}</strong></span>
              </div>
            </div>
            <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "12px" }}>
              <div>
                <span style={{ fontSize: "2rem" }}>👑</span>
                <div style={{ color: "#34d399", fontWeight: 800, fontSize: "0.9rem" }}>CONGRATULATIONS!</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. PHASE PROGRESSION STEPPER CARD */}
      <div className="phase-stepper-card glass-card">
        <div className="card-header-row">
          <div className="header-title-group">
            <h2>🎮 LIVE GAME CONTROL</h2>
            <p className="header-subtitle">
              Round {gameState.round} of {gameState.totalRounds || 3} • Room: {gameState.roomCode || "EXPO26"}
            </p>
          </div>
          <div className="live-phase-pill-badge">
            <span className="pulse-dot"></span>
            <span>{gameState.phase || "LOBBY"} PHASE</span>
          </div>
        </div>

        <div className="phase-stepper-container">
          {phases.map((phase, idx) => {
            const isDone = idx < currentPhaseIndex;
            const isCurrent = phase === gameState.phase;
            return (
              <div
                key={phase}
                className={`step-item ${isCurrent ? "current" : isDone ? "done" : "pending"}`}
              >
                <div className="step-circle">
                  {isDone ? "✓" : idx + 1}
                </div>
                <span className="step-label">{phase}</span>
                {idx < phases.length - 1 && <div className={`step-connector ${isDone ? "filled" : ""}`} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. PLAYER METRICS SUMMARY CARDS */}
      <div className="live-stats-bar">
        <div className="stat-card cyan">
          <div className="stat-header">
            <span className="stat-label">ACTIVE PLAYERS</span>
            <span className="stat-icon">👥</span>
          </div>
          <div className="stat-val">{activeCount}</div>
          <span className="stat-footer">Advancing pool</span>
        </div>

        <div className="stat-card purple">
          <div className="stat-header">
            <span className="stat-label">SOLVING</span>
            <span className="stat-icon">🧩</span>
          </div>
          <div className="stat-val">{solvingCount}</div>
          <span className="stat-footer">Currently playing</span>
        </div>

        <div className="stat-card green">
          <div className="stat-header">
            <span className="stat-label">COMPLETED</span>
            <span className="stat-icon">🏆</span>
          </div>
          <div className="stat-val">{completedCount}</div>
          <span className="stat-footer">Finished round</span>
        </div>

        <div className="stat-card gold">
          <div className="stat-header">
            <span className="stat-label">ELIMINATED</span>
            <span className="stat-icon">❌</span>
          </div>
          <div className="stat-val">{eliminatedCount}</div>
          <span className="stat-footer">Knocked out</span>
        </div>
      </div>

      {/* 3. MAIN GAME CONTROL GRID (2 COLUMNS) */}
      <div className="live-grid-two-col">
        {/* LEFT COLUMN: TARGET IMAGE PREVIEW */}
        <div className="game-preview-card glass-card">
          <div className="card-header-row">
            <div className="header-title-group">
              <h3>TARGET IMAGE PREVIEW</h3>
              <span className="header-subtitle">Selected puzzle for active round</span>
            </div>
            {isImageSelected && (
              <span className="difficulty-badge">
                {gameState.pieces || 16} Pieces ({Math.sqrt(gameState.pieces || 16)}×{Math.sqrt(gameState.pieces || 16)})
              </span>
            )}
          </div>

          <div className="game-preview-holder">
            {isImageSelected ? (
              <>
                <img
                  src={gameState.image}
                  alt={gameState.imageName || "Active Game Image"}
                  className="preview-game-img"
                />
                <div className="preview-overlay-badge">
                  <span>🖼️ {gameState.imageName || "Active Puzzle Image"}</span>
                </div>
              </>
            ) : (
              <div className="no-image-selected-box">
                <span className="box-icon">🖼️</span>
                <strong>NO IMAGE SELECTED</strong>
                <small>Select an image in Round Config to begin</small>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: MAIN CONTROL ROOM */}
        <div className="control-room-card glass-card">
          <div className="card-header-row">
            <div className="header-title-group">
              <h3>MAIN CONTROL ROOM</h3>
              <span className="header-subtitle">Real-time round telemetry & controls</span>
            </div>
            <span className="status-ready-pill">● LIVE OPERATIONAL</span>
          </div>

          <div className="control-summary-grid">
            <div className="summary-item">
              <span className="label">ROOM</span>
              <strong className="value highlighted">{gameState.roomCode || "EXPO26"}</strong>
            </div>

            <div className="summary-item">
              <span className="label">STATUS</span>
              <strong className="value online">● {gameState.phase || "LOBBY"}</strong>
            </div>

            <div className="summary-item">
              <span className="label">ROUND</span>
              <strong className="value">
                {gameState.round} / {gameState.totalRounds || 3}
              </strong>
            </div>

            <div className="summary-item">
              <span className="label">ADVANCING POOL</span>
              <strong className="value">{activeCount} Players</strong>
            </div>

            <div className="summary-item">
              <span className="label">PUZZLE</span>
              <strong className="value">{gameState.pieces || 16} Pieces</strong>
            </div>

            <div className="summary-item">
              <span className="label">IMAGE</span>
              <strong className="value text-truncate">{gameState.imageName || "Not Selected"}</strong>
            </div>
          </div>

          {/* TIMER BOX */}
          <div className="stage-timer-box">
            <div className="timer-header-info">
              <span className="timer-phase-title">{gameState.phase} PHASE TIMER</span>
              <span className="timer-digital-readout">
                {(gameState.remainingSec || 0).toFixed(1)} <small>sec</small>
              </span>
            </div>
            <div className="timer-progress-bar">
              <div
                className="timer-fill"
                style={{
                  width: `${Math.min(
                    100,
                    ((gameState.remainingSec || 0) /
                      (gameState.phase === "MEMORY" ? gameState.memory || 20 : gameState.puzzle || 40)) *
                      100
                  )}%`
                }}
              />
            </div>
          </div>

          {/* ACTION BUTTONS PANEL */}
          <div className="control-buttons-panel">
            {!isTournamentComplete && (gameState.phase === "LOBBY" || gameState.phase === "WAITING" || gameState.phase === "RESULT") && (
              <>
                <div className="start-round-confirmation-card" style={{ background: "rgba(124, 92, 255, 0.15)", border: "1px solid rgba(124, 92, 255, 0.4)", borderRadius: "10px", padding: "10px 14px", marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ fontSize: "0.85rem" }}>
                    <span style={{ color: "#a78bfa", fontWeight: 800 }}>ROUND {gameState.round} SETUP: </span>
                    <strong style={{ color: "#ffffff" }}>{gameState.imageName || "No image"}</strong>
                    <span style={{ color: "#cbd5e1", marginLeft: "8px" }}>
                      ({gameState.pieces || 16} Pieces, {Math.round(Math.sqrt(gameState.pieces || 16))}×{Math.round(Math.sqrt(gameState.pieces || 16))})
                    </span>
                  </div>
                  <span style={{ fontSize: "0.75rem", background: isImageSelected ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)", color: isImageSelected ? "#34d399" : "#fca5a5", padding: "3px 8px", borderRadius: "6px", fontWeight: 700 }}>
                    {isImageSelected ? "✓ READY FOR BROADCAST" : "⚠️ NO IMAGE SELECTED"}
                  </span>
                </div>

                <button
                  className="btn btn-primary btn-lg main-cta-start-btn"
                  disabled={!isImageSelected || activeCount === 0}
                  onClick={onStartRound}
                >
                  ▶ START ROUND {gameState.round} ({activeCount} ADVANCING PLAYERS READY)
                </button>
              </>
            )}

            <div className="button-controls-grid">
              {gameState.isPaused ? (
                <button
                  className="btn btn-success btn-md"
                  disabled={gameState.phase === "LOBBY" || gameState.phase === "WAITING" || gameState.phase === "RESULT" || isTournamentComplete}
                  onClick={onResume}
                >
                  ▶ RESUME
                </button>
              ) : (
                <button
                  className="btn btn-warning btn-md"
                  disabled={gameState.phase === "LOBBY" || gameState.phase === "WAITING" || gameState.phase === "RESULT" || isTournamentComplete}
                  onClick={onPause}
                >
                  ⏸ PAUSE
                </button>
              )}

              <button
                className="btn btn-secondary btn-md"
                onClick={onRestartRound}
                disabled={gameState.phase === "LOBBY" || gameState.phase === "WAITING" || isTournamentComplete}
              >
                🔄 RESTART ROUND
              </button>

              <button
                className="btn btn-danger btn-md"
                onClick={onEndRound}
                disabled={gameState.phase === "LOBBY" || gameState.phase === "WAITING" || gameState.phase === "RESULT" || isTournamentComplete}
              >
                ⏹ END ROUND & EVALUATE
              </button>

              {!isTournamentComplete && (
                <button
                  className="btn btn-purple btn-md"
                  onClick={onNextRound}
                  disabled={gameState.round >= (gameState.totalRounds || 3)}
                >
                  ⏭ NEXT ROUND ({gameState.round + 1})
                </button>
              )}

              <button
                className="btn btn-danger btn-md"
                style={{ fontWeight: 800, background: "linear-gradient(135deg, #ef4444, #b91c1c)" }}
                onClick={() => {
                  if (window.confirm("Start a new game? This will finish the current game, clear room data, and allow fresh players to join.")) {
                    onResetGame && onResetGame();
                  }
                }}
              >
                🚀 START NEW GAME
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. LIVE ACTIVITY TELEMETRY FEED */}
      <div className="live-results-card glass-card">
        <div className="card-header-row">
          <div className="header-title-group">
            <h3>LIVE ACTIVITY FEED ({results.length})</h3>
            <span className="header-subtitle">Real-time solve telemetry & player leaderboard</span>
          </div>
          <span className="live-pill">● REAL-TIME SYNC</span>
        </div>

        <div className="submissions-list">
          {results.length === 0 ? (
            <div className="empty-submissions">
              <div className="empty-icon">⏳</div>
              <p>No live activity yet.</p>
              <small>Waiting for players to finish solving the puzzle in Round {gameState.round}...</small>
            </div>
          ) : (
            results.map((res, index) => (
              <div key={res.id || index} className="submission-item">
                <div className="submission-rank">
                  {index === 0
                    ? "🥇"
                    : index === 1
                    ? "🥈"
                    : index === 2
                    ? "🥉"
                    : `#${index + 1}`}
                </div>

                <div className="submission-info">
                  <strong className="player-name">{res.name || res.player_name}</strong>
                  <span className="submission-score">+{res.score || 100} pts</span>
                </div>

                <div className="submission-status-pill">
                  <span className="status-badge badge-completed">✓ Completed</span>
                </div>

                <div className="submission-time">
                  <strong>{Number(res.time ?? res.completion_time ?? 0).toFixed(2)}s</strong>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

