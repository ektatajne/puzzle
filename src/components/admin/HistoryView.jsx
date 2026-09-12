import React from "react";
import { exportResultsToCSV } from "../../utils/exportUtils";

export function HistoryView({ roomCode, players, results, gameHistory = [] }) {
  return (
    <div className="history-view">
      <div className="data-panel glass-card">
        <div className="panel-header">
          <div className="panel-title-wrap">
            <h3>GAME HISTORY & EVENT RECORDS</h3>
            <span className="panel-subtitle">Persistent session telemetry and TCS Expo records</span>
          </div>

          <button
            className="btn btn-secondary"
            disabled={gameHistory.length === 0 && results.length === 0}
            onClick={() => exportResultsToCSV(roomCode, players, results)}
          >
            📥 [ EXPORT ALL RESULTS CSV ]
          </button>
        </div>

        <div className="table-responsive">
          <table className="modern-table">
            <thead>
              <tr>
                <th>GAME ID</th>
                <th>ROOM</th>
                <th>DATE</th>
                <th>PLAYERS</th>
                <th>ROUNDS</th>
                <th>CHAMPION 🥇</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {gameHistory.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-table-state">
                    <div className="empty-state-box">
                      <span className="empty-icon">📜</span>
                      <strong className="empty-title">No completed games yet.</strong>
                      <p className="empty-desc">
                        Completed game history will persist here automatically after ending game sessions.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                gameHistory.map((game) => (
                  <tr key={game.id} className="table-row">
                    <td>
                      <strong>{game.id}</strong>
                    </td>
                    <td>
                      <span className="badge-room">{game.room_code || roomCode}</span>
                    </td>
                    <td>
                      {game.created_at ? new Date(game.created_at).toLocaleDateString() : "Today"}
                    </td>
                    <td>{game.total_players || 0}</td>
                    <td>{game.total_rounds || 3} Rounds</td>
                    <td className="winner-cell">🏆 {game.winner || "Pending"}</td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => exportResultsToCSV(game.room_code || roomCode, players, results)}
                      >
                        Export CSV
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
