import React, { useState } from "react";

export function TournamentHistoryView({ roomCode = "EXPO26", players = [], results = [], gameState = {} }) {
  const [selectedRoundFilter, setSelectedRoundFilter] = useState("ALL");

  // Find final tournament champion
  const champion = players.find(
    (p) => p.tournament_status === "WINNER" || (gameState.finalWinner && (p.id === gameState.finalWinner.id || p.id === gameState.finalWinner.player_id))
  ) || gameState.finalWinner;

  // Group round_results by round number
  const roundMap = new Map();

  results.forEach((res) => {
    const rNum = Number(res.round_number || res.round || 1);
    if (!roundMap.has(rNum)) {
      roundMap.set(rNum, []);
    }
    roundMap.get(rNum).push(res);
  });

  // Sort rounds ascending
  const roundNumbers = Array.from(roundMap.keys()).sort((a, b) => a - b);
  if (roundNumbers.length === 0) roundNumbers.push(1);

  return (
    <div className="tournament-history-view">
      {/* HEADER & METRICS BAR */}
      <div className="data-panel glass-card mb-6">
        <div className="panel-header flex-wrap gap-4 justify-between items-center">
          <div className="panel-title-wrap">
            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
              <span>⚔️</span> TOURNAMENT BRACKET & ELIMINATION HISTORY
            </h2>
            <span className="panel-subtitle">
              Room: {roomCode} • Total Registered: {players.length} • Active/Advancing: {players.filter((p) => p.tournament_status !== "ELIMINATED").length} • Eliminated: {players.filter((p) => p.tournament_status === "ELIMINATED").length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-slate-300">Round View:</label>
            <select
              value={selectedRoundFilter}
              onChange={(e) => setSelectedRoundFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="ALL">All Rounds Breakdown</option>
              {roundNumbers.map((r) => (
                <option key={r} value={r}>Round {r}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* FINAL TOURNAMENT CHAMPION BANNER */}
      {champion ? (
        <div className="winner-spotlight-card glass-card gold-glow mb-8 p-6 relative overflow-hidden">
          <div className="winner-badge-pill flex items-center gap-2 text-amber-300 font-extrabold text-xs uppercase tracking-wider mb-4 px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded-full w-fit">
            👑 OVERALL TOURNAMENT CHAMPION
          </div>

          <div className="winner-details-row flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="winner-identity flex items-center gap-4">
              <span className="trophy-icon text-4xl">👑</span>
              <div className="avatar-circle-lg w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 text-slate-950 font-black text-2xl flex items-center justify-center shadow-xl border-4 border-amber-300 shrink-0">
                {(champion.name || champion.player_name || "PL").slice(0, 2).toUpperCase()}
              </div>
              <div className="winner-name-block">
                <h1 className="winner-name text-3xl font-extrabold text-amber-300 leading-tight">
                  {champion.name || champion.player_name}
                </h1>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-300 font-medium">
                  <span className="bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700">
                    EMP ID: <strong className="text-white">{champion.employee_id || champion.employeeId || "N/A"}</strong>
                  </span>
                  <span className="bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700">
                    TCS UNIT: <strong className="text-purple-300">{champion.tcs_unit || champion.tcsUnit || "N/A"}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="winner-stats-row flex items-center gap-3 shrink-0">
              <div className="stat-chip bg-amber-500/20 border border-amber-500/40 px-4 py-2.5 rounded-xl text-amber-300 font-extrabold text-lg flex items-center gap-2 shadow-inner">
                <span>🏆</span> CHAMPION
              </div>
              <div className="stat-chip bg-emerald-500/20 border border-emerald-500/40 px-4 py-2.5 rounded-xl text-emerald-300 font-extrabold text-lg flex items-center gap-2 shadow-inner">
                <span>🎯</span> +{champion.total_score || 100} PTS
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-winner-card glass-card p-6 text-center mb-6">
          <span className="text-3xl">⚔️</span>
          <h3 className="text-lg font-bold mt-2 text-white">Knockout Tournament In Progress</h3>
          <p className="text-slate-400 text-xs mt-1">
            Players are eliminated round-by-round until exactly 1 champion remains.
          </p>
        </div>
      )}

      {/* ROUND BY ROUND BREAKDOWN */}
      {roundNumbers.map((rNum) => {
        if (selectedRoundFilter !== "ALL" && Number(selectedRoundFilter) !== rNum) return null;

        const roundRes = (roundMap.get(rNum) || []).sort((a, b) => (a.time || a.completion_time) - (b.time || b.completion_time));

        // Find players who were active in this round
        const activeInRound = players.filter((p) => {
          if (!p.eliminated_in_round) return true;
          return p.eliminated_in_round >= rNum;
        });

        // Find players eliminated in this round
        const eliminatedInRound = players.filter((p) => p.eliminated_in_round === rNum);

        return (
          <div key={rNum} className="data-panel glass-card mb-6">
            <div className="panel-header mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/50 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-purple-600/40 text-purple-300 rounded text-xs border border-purple-500/40">
                    ROUND {rNum}
                  </span>
                  <span>Knockout Round Results</span>
                </h3>
                <span className="text-xs text-slate-400">
                  Participants: {activeInRound.length} • Solved & Advanced: {roundRes.length - (roundRes.length === activeInRound.length && activeInRound.length > 1 ? 1 : 0)} • Eliminated: {eliminatedInRound.length || (roundRes.length === activeInRound.length && activeInRound.length > 1 ? 1 : 0)}
                </span>
              </div>
            </div>

            <div className="table-responsive">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>RANK</th>
                    <th>PLAYER NAME</th>
                    <th>EMPLOYEE ID</th>
                    <th>TCS UNIT</th>
                    <th>SOLVE TIME</th>
                    <th>ROUND STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {activeInRound.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="empty-table-state py-6 text-center text-slate-400">
                        No round data recorded yet for Round {rNum}.
                      </td>
                    </tr>
                  ) : (
                    activeInRound.map((player, idx) => {
                      const res = roundRes.find((r) => r.player_id === player.id || r.id === player.id);
                      const isEliminated = player.eliminated_in_round === rNum || (!res && player.tournament_status === "ELIMINATED");
                      const isWinner = player.tournament_status === "WINNER";
                      const empId = player.employee_id || player.employeeId || "—";
                      const unit = player.tcs_unit || player.tcsUnit || "—";

                      return (
                        <tr key={player.id || idx} className="table-row">
                          <td className="col-rank font-mono font-bold text-slate-300">
                            {res?.rank ? `#${res.rank}` : "—"}
                          </td>
                          <td className="col-player">
                            <div className="player-cell flex items-center gap-2">
                              <div className="player-avatar w-7 h-7 rounded-full bg-purple-600/80 flex items-center justify-center font-bold text-xs text-white shrink-0">
                                {player.name.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="player-name font-semibold text-white">{player.name}</span>
                            </div>
                          </td>
                          <td className="font-mono text-xs font-semibold text-slate-300">{empId}</td>
                          <td className="text-xs text-slate-300 font-medium">{unit}</td>
                          <td className="col-solve-time font-mono font-bold">
                            {res ? <span className="text-emerald-400">{Number(res.time || res.completion_time).toFixed(2)}s</span> : <span className="text-rose-400 text-xs">Timeout / DNF</span>}
                          </td>
                          <td>
                            {isWinner ? (
                              <span className="status-badge px-2 py-0.5 rounded text-xs font-bold bg-amber-500/30 text-amber-300 border border-amber-400">
                                👑 FINAL CHAMPION
                              </span>
                            ) : isEliminated ? (
                              <span className="status-badge px-2 py-0.5 rounded text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                ❌ ELIMINATED
                              </span>
                            ) : (
                              <span className="status-badge badge-completed px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                ✓ ADVANCED
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
