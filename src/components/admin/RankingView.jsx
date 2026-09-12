import React, { useState } from "react";

export function RankingView({ roomCode = "EXPO26", players = [], results = [], gameState = {} }) {
  const [selectedRound, setSelectedRound] = useState("ALL");

  const getTimeVal = (r) => Number(r.time ?? r.completion_time ?? 0);
  const getNameStr = (item) => item.name || item.player_name || "Player";
  const getRoundNum = (r) => Number(r.round_number || r.round || 1);

  // Check if round is currently in progress
  const isRoundActive =
    gameState.phase === "PUZZLE" ||
    gameState.phase === "MEMORY" ||
    gameState.phase === "COUNTDOWN" ||
    gameState.phase === "ROUND_STARTING";

  // Filter completed results by selected round
  const roundResults = results.filter((r) => {
    if (selectedRound === "ALL") return true;
    return getRoundNum(r) === Number(selectedRound);
  });

  // Cross-reference all room players against round results
  const completedList = [];
  const uncompletedList = [];

  players.forEach((player) => {
    const matchedResult = roundResults.find(
      (r) =>
        r.id === player.id ||
        r.player_id === player.id ||
        (r.name && player.name && r.name.toLowerCase() === player.name.toLowerCase()) ||
        (r.player_name && player.name && r.player_name.toLowerCase() === player.name.toLowerCase())
    );

    if (matchedResult) {
      completedList.push({
        player,
        result: matchedResult,
        isCompleted: true,
        name: getNameStr(matchedResult) || getNameStr(player),
        time: getTimeVal(matchedResult),
        score: matchedResult.score || 100,
        round: getRoundNum(matchedResult)
      });
    } else {
      uncompletedList.push({
        player,
        result: null,
        isCompleted: false,
        name: getNameStr(player),
        time: Infinity,
        score: 0,
        round: selectedRound !== "ALL" ? Number(selectedRound) : (gameState.round || 1)
      });
    }
  });

  // Sort completed players by solve time ascending (fastest first!)
  completedList.sort((a, b) => a.time - b.time);
  completedList.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  // Winner is #1 completed solver
  const winner = completedList.length > 0 ? completedList[0] : null;

  // Combine lists: completed at top (sorted), uncompleted at bottom
  const allRankings = [...completedList, ...uncompletedList];

  return (
    <div className="ranking-view">
      {/* HEADER BAR & ROUND FILTER */}
      <div className="data-panel glass-card mb-6">
        <div className="panel-header flex-wrap gap-4 justify-between items-center">
          <div className="panel-title-wrap">
            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
              <span>🏆</span> RANKINGS & WINNERS ({players.length} Players)
            </h2>
            <span className="panel-subtitle">
              Total Players: {players.length} • Solved: {completedList.length} • In Progress/DNF: {uncompletedList.length}
            </span>
          </div>

          <div className="round-filter-selector flex items-center gap-2">
            <label className="text-sm font-semibold text-slate-300">Filter Round:</label>
            <select
              value={selectedRound}
              onChange={(e) => setSelectedRound(e.target.value)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="ALL">All Rounds</option>
              <option value="1">Round 1</option>
              <option value="2">Round 2</option>
              <option value="3">Round 3</option>
            </select>
          </div>
        </div>
      </div>

      {/* WINNER HIGHLIGHT BANNER */}
      {winner ? (
        <div className="winner-spotlight-card glass-card gold-glow mb-6 p-6 relative overflow-hidden">
          <div className="winner-badge-pill flex items-center gap-2 text-amber-300 font-extrabold text-xs uppercase tracking-wider mb-4 px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded-full w-fit">
            <span>🏆</span> #1 FASTEST WINNER
          </div>

          <div className="winner-details-row flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="winner-identity flex items-center gap-3">
              <span className="trophy-icon text-3xl">🏆</span>
              <div className="avatar-circle-lg w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-lg flex items-center justify-center shadow-lg border-2 border-amber-300 shrink-0">
                {winner.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="winner-name-block">
                <h1 className="winner-name text-2xl sm:text-3xl font-extrabold text-amber-300 leading-tight">
                  {winner.name}
                </h1>
                <p className="winner-subtitle text-slate-300 text-xs sm:text-sm mt-0.5">
                  Completed Round {winner.round} Puzzle with the fastest time!
                </p>
              </div>
            </div>

            <div className="winner-stats-row flex items-center gap-3 shrink-0">
              <div className="stat-chip bg-amber-500/20 border border-amber-500/40 px-3.5 py-2 rounded-xl text-amber-300 font-extrabold text-base flex items-center gap-2 shadow-inner">
                <span>⏱️</span> {winner.time.toFixed(2)}s
              </div>
              <div className="stat-chip bg-emerald-500/20 border border-emerald-500/40 px-3.5 py-2 rounded-xl text-emerald-300 font-extrabold text-base flex items-center gap-2 shadow-inner">
                <span>🎯</span> +{winner.score} PTS
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-winner-card glass-card p-8 text-center mb-6">
          <span className="text-4xl">⏳</span>
          <h3 className="text-xl font-bold mt-2 text-white">No Puzzle Completions Recorded Yet</h3>
          <p className="text-slate-400 text-sm mt-1">
            Rankings and round winners will appear here live as participants solve the puzzle.
          </p>
        </div>
      )}

      {/* FULL RANKINGS TABLE */}
      <div className="data-panel glass-card">
        <div className="panel-header mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">LEADERBOARD RANKING (Fastest to Slowest)</h3>
            <span className="text-xs text-slate-400">
              Total Players: {allRankings.length} • Completed: {completedList.length}
            </span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="modern-table">
            <thead>
              <tr>
                <th>RANK</th>
                <th>PLAYER</th>
                <th>EMP ID</th>
                <th>TCS UNIT</th>
                <th>SOLVE TIME</th>
                <th>ROUND</th>
                <th>SCORE</th>
                <th>RESULT STATUS</th>
              </tr>
            </thead>
            <tbody>
              {allRankings.length === 0 ? (
                <tr>
                  <td colSpan="8" className="empty-table-state py-8 text-center text-slate-400">
                    No players in room for selected filter.
                  </td>
                </tr>
              ) : (
                allRankings.map((item, index) => {
                  const { player, result, isCompleted, rank, name, time, score, round } = item;
                  const isFirst = isCompleted && rank === 1;
                  const initials = name.slice(0, 2).toUpperCase();
                  const empId = player?.employee_id || player?.employeeId || result?.employee_id || "—";
                  const unit = player?.tcs_unit || player?.tcsUnit || result?.tcs_unit || "—";

                  return (
                    <tr
                      key={player?.id || result?.id || index}
                      className={`table-row ${isFirst ? "winner-table-row bg-amber-500/10 border-amber-500/30" : ""}`}
                    >
                      <td className="col-rank font-extrabold">
                        {isCompleted ? (
                          rank === 1 ? (
                            <span className="px-2 py-1 bg-amber-500/30 border border-amber-400 text-amber-300 rounded text-xs font-black">
                              🏆 #1 WINNER
                            </span>
                          ) : rank === 2 ? (
                            "🥈 #2"
                          ) : rank === 3 ? (
                            "🥉 #3"
                          ) : (
                            `#${rank}`
                          )
                        ) : (
                          <span className="text-slate-500 font-bold">—</span>
                        )}
                      </td>
                      <td className="col-player">
                        <div className="player-cell flex items-center gap-2">
                          <div className="player-avatar w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center font-bold text-xs text-white shrink-0">
                            {initials}
                          </div>
                          <span className="player-name font-semibold text-white">{name}</span>
                        </div>
                      </td>
                      <td className="font-mono text-xs font-semibold text-slate-300">{empId}</td>
                      <td className="text-xs text-slate-300 font-medium">{unit}</td>
                      <td className="col-solve-time font-mono font-bold">
                        {isCompleted ? (
                          <span className="text-emerald-400">{time.toFixed(2)}s</span>
                        ) : isRoundActive ? (
                          <span className="text-amber-400 font-semibold text-xs animate-pulse">In Progress</span>
                        ) : (
                          <span className="text-slate-400 font-semibold text-xs">Did Not Finish</span>
                        )}
                      </td>
                      <td className="font-semibold text-slate-300">
                        Round {round}
                      </td>
                      <td>
                        {isCompleted ? (
                          <span className="score-badge bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded text-xs font-bold">
                            +{score} pts
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium">—</span>
                        )}
                      </td>
                      <td>
                        {isCompleted ? (
                          rank === 1 || player?.tournament_status === "WINNER" ? (
                            <span className="status-badge px-2 py-0.5 rounded text-xs font-bold bg-amber-500/30 text-amber-300 border border-amber-400">
                              👑 COMPLETED (#1 WINNER)
                            </span>
                          ) : (
                            <span className="status-badge badge-completed px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              ✓ COMPLETED
                            </span>
                          )
                        ) : isRoundActive ? (
                          <span className="status-badge px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                            IN PROGRESS
                          </span>
                        ) : (
                          <span className="status-badge px-2 py-0.5 rounded text-xs font-bold bg-rose-900/40 text-rose-300 border border-rose-700/30">
                            ✕ ELIMINATED (TIME EXPIRED)
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
    </div>
  );
}

