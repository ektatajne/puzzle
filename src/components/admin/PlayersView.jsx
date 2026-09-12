import React, { useState } from "react";

export function PlayersView({
  players,
  results,
  selectedPlayer,
  onSelectPlayer,
  onCloseDrawer,
  onDisconnectPlayer,
  onResetPlayer,
  onRemovePlayer
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("TIME"); // TIME, RANK, NAME
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'DISCONNECT'|'RESET'|'REMOVE', player }

  const filteredAndSortedPlayers = players
    .filter((player) => {
      const q = searchTerm.toLowerCase();
      const empIdStr = (player.employee_id || player.employeeId || "").toLowerCase();
      const tcsUnitStr = (player.tcs_unit || player.tcsUnit || "").toLowerCase();
      const matchesSearch =
        player.name.toLowerCase().includes(q) ||
        empIdStr.includes(q) ||
        tcsUnitStr.includes(q);
      const matchesStatus = statusFilter === "ALL" || player.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const resA = results.find((r) => r.id === a.id || r.player_id === a.id);
      const resB = results.find((r) => r.id === b.id || r.player_id === b.id);

      if (sortBy === "TIME") {
        const timeA = resA ? resA.time : 999999;
        const timeB = resB ? resB.time : 999999;
        return timeA - timeB;
      }
      if (sortBy === "RANK") {
        const rankA = resA ? resA.rank : 999;
        const rankB = resB ? resB.rank : 999;
        return rankA - rankB;
      }
      if (sortBy === "NAME") {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

  // Calculate real metrics for selected player
  const playerResult = selectedPlayer
    ? results.find((r) => r.id === selectedPlayer.id || r.player_id === selectedPlayer.id)
    : null;

  return (
    <div className="players-view">
      {/* FILTER & CONTROL BAR */}
      <div className="data-panel glass-card">
        <div className="panel-header">
          <div className="panel-title-wrap">
            <h3>PLAYER MANAGEMENT ({players.length} Registered)</h3>
            <span className="panel-subtitle">Live status telemetry & player profile drawer</span>
          </div>

          <div className="panel-controls">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search name, Emp ID, or TCS Unit..."
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

            <select
              className="filter-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="TIME">Sort by Solve Time</option>
              <option value="RANK">Sort by Rank</option>
              <option value="NAME">Sort by Name</option>
            </select>
          </div>
        </div>

        {/* FULL DATA TABLE */}
        <div className="table-responsive">
          <table className="modern-table">
            <thead>
              <tr>
                <th>#</th>
                <th>PLAYER</th>
                <th>EMP ID</th>
                <th>TCS UNIT</th>
                <th>STATUS</th>
                <th>JOINED</th>
                <th>TIME</th>
                <th>RANK</th>
                <th>CONNECTION</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedPlayers.length === 0 ? (
                <tr>
                  <td colSpan="10" className="empty-table-state">
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
                          : "Try adjusting your search criteria."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedPlayers.map((player, idx) => {
                  const res = results.find((r) => r.id === player.id || r.player_id === player.id);
                  const empId = player.employee_id || player.employeeId || "—";
                  const unit = player.tcs_unit || player.tcsUnit || "—";
                  return (
                    <tr
                      key={player.id}
                      className={`table-row ${selectedPlayer?.id === player.id ? "row-selected" : ""}`}
                      onClick={() => onSelectPlayer(player)}
                    >
                      <td className="col-rank">{idx + 1}</td>
                      <td className="col-player">
                        <div className="player-cell">
                          <div className="player-avatar">{player.name.slice(0, 2).toUpperCase()}</div>
                          <span className="player-name">{player.name}</span>
                        </div>
                      </td>
                      <td className="font-mono text-sm font-semibold text-slate-300">{empId}</td>
                      <td className="text-sm text-slate-300 font-medium">{unit}</td>
                      <td>
                        <span className={`status-badge badge-${(res || player.status === "COMPLETED" ? "COMPLETED" : player.status || "WAITING").toLowerCase()}`}>
                          {res || player.status === "COMPLETED" ? "COMPLETED" : player.status || "WAITING"}
                        </span>
                      </td>
                      <td>
                        {player.joinedAt || player.joined_at
                          ? new Date(player.joinedAt || player.joined_at).toLocaleTimeString()
                          : "Just now"}
                      </td>
                      <td className="col-solve-time">
                        {res ? `${res.time.toFixed(2)}s` : player.status === "COMPLETED" ? "Submitted" : "—"}
                      </td>
                      <td>
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
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPlayer(player);
                          }}
                        >
                          View Details
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

      {/* PLAYER DETAIL SIDE DRAWER */}
      {selectedPlayer && (
        <div className="drawer-overlay" onClick={onCloseDrawer}>
          <div className="drawer-content glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>PLAYER PROFILE</h2>
              <button className="drawer-close-btn" onClick={onCloseDrawer}>
                ✕
              </button>
            </div>

            <div className="profile-hero">
              <div className="profile-avatar-lg">
                {selectedPlayer.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="profile-info">
                <h3>{selectedPlayer.name}</h3>
                <span className="player-id">EMP ID: {selectedPlayer.employee_id || selectedPlayer.employeeId || "N/A"}</span>
                <span className="player-id" style={{ display: "block", marginTop: "2px", color: "#a78bfa" }}>
                  UNIT: {selectedPlayer.tcs_unit || selectedPlayer.tcsUnit || "N/A"}
                </span>
                <div className="profile-chips" style={{ marginTop: "6px" }}>
                  <span className={`status-badge badge-${(selectedPlayer.status || "WAITING").toLowerCase()}`}>
                    {selectedPlayer.status || "WAITING"}
                  </span>
                  <span className={`connection-chip-sm ${selectedPlayer.connected ? "online" : "offline"}`}>
                    {selectedPlayer.connected ? "Online" : "Offline"}
                  </span>
                </div>
              </div>
            </div>

            <div className="profile-stats-grid">
              <div className="profile-stat-box">
                <span className="label">Total Score</span>
                <strong className="value">{playerResult?.score || selectedPlayer.total_score || 0} pts</strong>
              </div>
              <div className="profile-stat-box">
                <span className="label">Solve Time</span>
                <strong className="value">{playerResult?.time ? `${playerResult.time.toFixed(2)}s` : "—"}</strong>
              </div>
              <div className="profile-stat-box">
                <span className="label">Current Rank</span>
                <strong className="value">{playerResult?.rank ? `#${playerResult.rank}` : "—"}</strong>
              </div>
            </div>

            <div className="round-history-section">
              <h4>Round Performance</h4>
              {playerResult ? (
                <div className="history-item">
                  <span>Current Active Round</span>
                  <strong>{playerResult.time.toFixed(2)}s</strong>
                  <span className={`rank-tag rank-${playerResult.rank}`}>Rank #{playerResult.rank}</span>
                </div>
              ) : (
                <div className="history-empty-note">
                  No rounds completed yet for this player.
                </div>
              )}
            </div>

            {/* DRAWER ACTION BUTTONS */}
            <div className="drawer-actions">
              <button
                className="btn btn-warning"
                onClick={() => setConfirmAction({ type: "DISCONNECT", player: selectedPlayer })}
              >
                [ DISCONNECT PLAYER ]
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => setConfirmAction({ type: "RESET", player: selectedPlayer })}
              >
                [ RESET PLAYER ]
              </button>

              <button
                className="btn btn-danger"
                onClick={() => setConfirmAction({ type: "REMOVE", player: selectedPlayer })}
              >
                [ REMOVE PLAYER ]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {confirmAction && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <h3>Confirm {confirmAction.type}</h3>
            <p>
              Are you sure you want to {confirmAction.type.toLowerCase()} player{" "}
              <strong>{confirmAction.player.name}</strong>?
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setConfirmAction(null)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  if (confirmAction.type === "DISCONNECT") onDisconnectPlayer(confirmAction.player.id);
                  if (confirmAction.type === "RESET") onResetPlayer(confirmAction.player.id);
                  if (confirmAction.type === "REMOVE") onRemovePlayer(confirmAction.player.id);
                  setConfirmAction(null);
                  onCloseDrawer();
                }}
              >
                Confirm {confirmAction.type}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
