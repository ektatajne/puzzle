/**
 * CSV Export utility for Memory Rush game results
 */

export function exportResultsToCSV(roomCode, players, results = [], gameDetails = {}) {
  const headers = [
    "Rank",
    "Player Name",
    "Employee ID",
    "TCS Unit",
    "Room Code",
    "Status",
    "Round",
    "Completion Time (s)",
    "Score",
    "Joined Time",
    "Connection Status"
  ];

  const rows = players.map((player, idx) => {
    const playerResult = results.find((r) => r.id === player.id || r.player_id === player.id);
    const rank = playerResult?.rank || idx + 1;
    const completionTime = playerResult?.time || playerResult?.completion_time || "N/A";
    const score = playerResult?.score || player.total_score || 0;
    const joinedAt = player.joined_at || player.joinedAt ? new Date(player.joined_at || player.joinedAt).toLocaleTimeString() : "N/A";
    const empId = player.employee_id || player.employeeId || "N/A";
    const unit = player.tcs_unit || player.tcsUnit || "N/A";

    return [
      `"${rank}"`,
      `"${player.name}"`,
      `"${empId}"`,
      `"${unit}"`,
      `"${roomCode}"`,
      `"${player.status || "COMPLETED"}"`,
      `"${gameDetails.currentRound || 1}"`,
      `"${completionTime}"`,
      `"${score}"`,
      `"${joinedAt}"`,
      `"${player.connected ? "Online" : "Offline"}"`
    ];
  });

  const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `MemoryRush_${roomCode}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
