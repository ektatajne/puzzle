import React, { useState } from "react";

export function DashboardView({
  gameState,
  players,
  results,
  onPause,
  onResume,
  onEndRound,
  onStartRound,
  onSelectPlayer,
  onRemovePlayer,
  onNavigateTab,
  onResetGame
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const onlineCount = players.filter((p) => p.connected).length;
  const completedCount = results.length;
  const playingCount = players.filter((p) => p.status === "PLAYING" || p.status === "MEMORIZING").length;

  const filteredPlayers = players.filter((player) => {
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || player.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const isImageSelected = Boolean(gameState.image);

  return (
    <div className="dashboard-view">
      {/* METRIC CARDS GRID */}
      <div className="metrics-grid">
        <div className="metric-card cyan">
          <div className="metric-header">
            <span className="metric-title">PLAYERS ONLINE</span>
            <span className="metric-icon">🟢</span>
          </div>
          <div className="metric-value">{onlineCount}</div>
          <div className="metric-footer">{players.length} Total Registered</div>
        </div>

        <div className="metric-card purple">
          <div className="metric-header">
            <span className="metric-title">TOTAL PLAYERS</span>
            <span className="metric-icon">👥</span>
          </div>
          <div className="metric-value">{players.length}</div>
          <div className="metric-footer">In Room {gameState.roomCode || "EXPO26"}</div>
        </div>

        <div className="metric-card blue">
          <div className="metric-header">
            <span className="metric-title">CURRENT ROUND</span>
            <span className="metric-icon">🎮</span>
          </div>
          <div className="metric-value">
            {gameState.round} <span className="metric-sub">/ {gameState.totalRounds || 1}</span>
          </div>
          <div className="metric-footer">Phase: {gameState.phase}</div>
        </div>

        <div className="metric-card green">
          <div className="metric-header">
            <span className="metric-title">COMPLETED</span>
            <span className="metric-icon">🏆</span>
          </div>
          <div className="metric-value">{completedCount}</div>
          <div className="metric-footer">{playingCount} Currently Solving</div>
        </div>
      </div>

      {/* LIVE GAME STATUS CONTROL BANNER */}
      <div className="live-status-banner glass-card">
        <div className="banner-left">
          <div className="phase-indicator">
            <span className="phase-badge">{gameState.phase} PHASE</span>
            <h2>ROUND {gameState.round}</h2>
            <p className="image-name-tag">
              Current Image:{" "}
              <strong>{gameState.imageName || "No image selected"}</strong>{" "}
              {isImageSelected && `(${gameState.pieces || 16} Pieces)`}
            </p>
          </div>
        </div>

        <div className="banner-center">
          <div className="timer-display">
            <span className="timer-label">Time Remaining</span>
            <span className="timer-value">{(gameState.remainingSec || 0).toFixed(1)}s</span>
          </div>
          <div className="banner-image-preview">
            {isImageSelected ? (
              <img src={gameState.image} alt="Active Puzzle" />
            ) : (
              <div className="no-image-placeholder">No Image Selected</div>
            )}
          </div>
        </div>

        <div className="banner-actions" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {gameState.phase === "LOBBY" || gameState.phase === "WAITING" || gameState.phase === "RESULT" || gameState.phase === "FINAL_RESULTS" ? (
            <>
              <button
                className="btn btn-primary btn-lg pulse-glow"
                onClick={onStartRound}
              >
                ▶ START ROUND {gameState.round}
              </button>

              <button
                className="btn btn-success btn-lg pulse-glow"
                onClick={() => {
                  if (window.confirm("Start a new game? This will clear the room and allow new players to scan and join.")) {
                    if (onResetGame) onResetGame();
                  }
                }}
                style={{ background: "#10b981", borderColor: "#059669", color: "#ffffff", fontWeight: 900 }}
              >
                🚀 START NEW GAME
              </button>
            </>
          ) : (
            <>
              {gameState.isPaused ? (
                <button className="btn btn-success" onClick={onResume}>
                  ▶ RESUME
                </button>
              ) : (
                <button className="btn btn-warning" onClick={onPause}>
                  ⏸ PAUSE
                </button>
              )}
              <button className="btn btn-danger" onClick={onEndRound}>
                ⏹ END ROUND
              </button>
              <button
                className="btn btn-success"
                onClick={() => {
                  if (window.confirm("Start a new game? This will clear the room and allow new players to scan and join.")) {
                    if (onResetGame) onResetGame();
                  }
                }}
                style={{ background: "#10b981", borderColor: "#059669", color: "#ffffff", fontWeight: 800 }}
              >
                🚀 NEW GAME
              </button>
            </>
          )}
        </div>
      </div>

      {!isImageSelected && (
        <div className="warning-banner-bar">
          ⚠️ Select a game image from the Image Library or Round Config before starting this round.
        </div>
      )}

      {/* LIVE PLAYERS DATA PANEL */}
      <div className="data-panel glass-card">
        <div className="panel-header">
          <div className="panel-title-wrap">
            <h3>LIVE PLAYERS ({players.length})</h3>
            <span className="panel-subtitle">Real-time status monitor of booth participants</span>
          </div>

          <div className="panel-controls">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search player name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="WAITING">WAITING</option>
              <option value="MEMORIZING">MEMORIZING</option>
              <option value="PLAYING">PLAYING</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="DISCONNECTED">DISCONNECTED</option>
            </select>

            <button className="btn btn-secondary btn-sm" onClick={() => onNavigateTab("players")}>
              View Full Table ↗
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="modern-table">
            <thead>
              <tr>
                <th>#</th>
                <th>PLAYER</th>
                <th>STATUS</th>
                <th>JOINED</th>
                <th>ROUND</th>
                <th>TIME</th>
                <th>RANK</th>
                <th>CONNECTION</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan="9" className="empty-table-state">
                    <div className="empty-state-box">
                      <span className="empty-icon">👥</span>
                      <strong className="empty-title">
                        {players.length === 0
                          ? "No players have joined yet."
                          : "No players found matching current search filter."}
                      </strong>
                      <p className="empty-desc">
                        {players.length === 0
                          ? "Visitors scan the QR code on the Big Screen TV to join the room."
                          : "Try clearing your search query or status filter."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((player, idx) => {
                  const res = results.find((r) => r.id === player.id || r.player_id === player.id);
                  const isCompleted = player.status === "COMPLETED" || Boolean(res);

                  return (
                    <tr
                      key={player.id}
                      className={`table-row ${isCompleted ? "row-completed" : ""}`}
                      onClick={() => onSelectPlayer(player)}
                    >
                      <td className="col-rank">{idx + 1}</td>
                      <td className="col-player">
                        <div className="player-cell">
                          <div className="player-avatar">{player.name.slice(0, 2).toUpperCase()}</div>
                          <span className="player-name">{player.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge badge-${(player.status || "WAITING").toLowerCase()}`}>
                          {player.status || "WAITING"}
                        </span>
                      </td>
                      <td className="col-time">
                        {player.joinedAt
                          ? new Date(player.joinedAt).toLocaleTimeString()
                          : "Just now"}
                      </td>
                      <td>Round {gameState.round}</td>
                      <td className="col-solve-time">
                        {res ? `${res.time.toFixed(2)}s` : isCompleted ? "Submitted" : "—"}
                      </td>
                      <td className="col-rank-badge">
                        {res?.rank ? (
                          <span className={`rank-tag rank-${res.rank}`}>#{res.rank}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <span className={`connection-dot ${player.connected ? "online" : "offline"}`}>
                          {player.connected ? "● Online" : "○ Offline"}
                        </span>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button
                          className="btn btn-icon btn-sm"
                          title="Inspect Player Profile"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPlayer(player);
                          }}
                          style={{ marginRight: "6px" }}
                        >
                          👁️
                        </button>
                        <button
                          className="btn btn-danger-outline btn-sm"
                          title="Remove Player from Room"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onRemovePlayer) onRemovePlayer(player.id);
                          }}
                        >
                          🗑️ Remove
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
