import React from "react";

export function AnalyticsView({ players, results, images, gameHistory = [] }) {
  const hasData = players.length > 0 || results.length > 0 || gameHistory.length > 0;

  const totalPlayers = players.length;
  const totalGames = gameHistory.length;
  const fastestTime = results[0]?.time ? `${results[0].time.toFixed(2)}s` : null;

  if (!hasData) {
    return (
      <div className="analytics-view">
        <div className="data-panel glass-card">
          <div className="empty-state-box large-empty-box">
            <span className="empty-icon">📈</span>
            <strong className="empty-title">No analytics data available yet.</strong>
            <p className="empty-desc">
              Play your first live game session at the TCS Expo booth to generate real-time metrics and participation charts.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-view">
      <div className="metrics-grid">
        <div className="metric-card cyan">
          <div className="metric-header">
            <span className="metric-title">TOTAL PARTICIPANTS</span>
            <span className="metric-icon">👥</span>
          </div>
          <div className="metric-value">{totalPlayers}</div>
          <div className="metric-footer">Real-time room registrants</div>
        </div>

        <div className="metric-card purple">
          <div className="metric-header">
            <span className="metric-title">TOTAL GAMES PLAYED</span>
            <span className="metric-icon">🎮</span>
          </div>
          <div className="metric-value">{totalGames}</div>
          <div className="metric-footer">Expo session sessions</div>
        </div>

        <div className="metric-card green">
          <div className="metric-header">
            <span className="metric-title">FASTEST RECORD</span>
            <span className="metric-icon">⚡</span>
          </div>
          <div className="metric-value">{fastestTime || "—"}</div>
          <div className="metric-footer">Current round solve time record</div>
        </div>

        <div className="metric-card blue">
          <div className="metric-header">
            <span className="metric-title">AVAILABLE IMAGES</span>
            <span className="metric-icon">🖼️</span>
          </div>
          <div className="metric-value">{images.length}</div>
          <div className="metric-footer">AI Theme library assets</div>
        </div>
      </div>

      <div className="analytics-charts-grid">
        <div className="chart-card glass-card">
          <h3>ROUND COMPLETION STATUS</h3>
          <p className="chart-subtitle">Real-time completion telemetry</p>
          <div className="analytics-summary-box">
            <div className="summary-stat-row">
              <span>Total Room Participants:</span>
              <strong>{players.length} Players</strong>
            </div>
            <div className="summary-stat-row">
              <span>Completed Current Round:</span>
              <strong>{results.length} Players</strong>
            </div>
            <div className="summary-stat-row">
              <span>Completion Rate:</span>
              <strong>
                {players.length > 0
                  ? `${Math.round((results.length / players.length) * 100)}%`
                  : "0%"}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
