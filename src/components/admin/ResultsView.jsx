import React from "react";
import { exportResultsToCSV } from "../../utils/exportUtils";

export function ResultsView({ roomCode, players, results, gameState }) {
  const getTimeVal = (r) => Number(r.time ?? r.completion_time ?? 0);
  const getNameStr = (r) => r.name || r.player_name || "Player";

  const sortedResults = [...results].sort((a, b) => getTimeVal(a) - getTimeVal(b));

  const handleExport = () => {
    exportResultsToCSV(roomCode, players, sortedResults, gameState);
  };

  return (
    <div className="results-view">
      <div className="data-panel glass-card">
        <div className="panel-header">
          <div className="panel-title-wrap">
            <h3>LIVE ROUND LEADERBOARD (Round {gameState.round || 1})</h3>
            <span className="panel-subtitle">Official verified solve times & scores</span>
          </div>

          <button
            className="btn btn-secondary"
            disabled={sortedResults.length === 0}
            onClick={handleExport}
          >
            📥 [ EXPORT CSV ]
          </button>
        </div>

        {/* REAL TOP WINNERS PODIUM BANNER */}
        {sortedResults.length > 0 ? (
          <div className="podium-container glass-card">
            {sortedResults[1] && (
              <div className="podium-place second">
                <div className="podium-avatar">🥈</div>
                <strong className="podium-name">{getNameStr(sortedResults[1])}</strong>
                <span className="podium-time">{getTimeVal(sortedResults[1]).toFixed(2)}s</span>
                <span className="podium-score">+{sortedResults[1].score || 80} pts</span>
              </div>
            )}

            <div className="podium-place first">
              <div className="crown">👑</div>
              <div className="podium-avatar">🥇</div>
              <strong className="podium-name">{getNameStr(sortedResults[0])}</strong>
              <span className="podium-time">{getTimeVal(sortedResults[0]).toFixed(2)}s</span>
              <span className="podium-score">+{sortedResults[0].score || 100} pts</span>
            </div>

            {sortedResults[2] && (
              <div className="podium-place third">
                <div className="podium-avatar">🥉</div>
                <strong className="podium-name">{getNameStr(sortedResults[2])}</strong>
                <span className="podium-time">{getTimeVal(sortedResults[2]).toFixed(2)}s</span>
                <span className="podium-score">+{sortedResults[2].score || 65} pts</span>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-podium-banner glass-card">
            <span className="banner-icon">🏆</span>
            <h3>No completions recorded yet for this round.</h3>
            <p>Leaderboard and top podium will populate in real time as participants complete their puzzle.</p>
          </div>
        )}

        {/* RESULTS LEADERBOARD TABLE */}
        <div className="table-responsive">
          <table className="modern-table">
            <thead>
              <tr>
                <th>RANK</th>
                <th>PLAYER</th>
                <th>SOLVE TIME</th>
                <th>POINTS</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {sortedResults.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-table-state">
                    <div className="empty-state-box">
                      <span className="empty-icon">📊</span>
                      <strong className="empty-title">No results recorded yet.</strong>
                      <p className="empty-desc">
                        Live results will appear automatically as players solve the round.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedResults.map((res, index) => (
                  <tr key={res.id || index} className="table-row">
                    <td className="col-rank">
                      {index === 0
                        ? "🥇 #1"
                        : index === 1
                        ? "🥈 #2"
                        : index === 2
                        ? "🥉 #3"
                        : `#${index + 1}`}
                    </td>
                    <td className="col-player">
                      <div className="player-cell">
                        <div className="player-avatar">
                          {getNameStr(res).slice(0, 2).toUpperCase()}
                        </div>
                        <span className="player-name">{getNameStr(res)}</span>
                      </div>
                    </td>
                    <td className="col-solve-time">
                      <strong>{getTimeVal(res).toFixed(2)}s</strong>
                    </td>
                    <td>
                      <span className="score-badge">+{res.score || 100} pts</span>
                    </td>
                    <td>
                      <span className="status-badge badge-completed">COMPLETED</span>
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
