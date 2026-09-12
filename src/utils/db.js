import { supabase } from "../config/supabase";
import { safeRandomUUID } from "./uuid";

function handleDbNotice(context, error) {
  if (!error) return;
  if (error.message?.includes("Could not find the table") || error.code === "PGRST204") {
    // Missing table fallback - game uses Realtime Broadcast mode gracefully
    return;
  }
  console.warn(`${context}:`, error.message);
}

/**
 * Get or create active game record in Supabase Postgres
 */
/**
 * Get or create active game record in Supabase Postgres
 */
export async function getOrCreateActiveGame(roomCode = "EXPO26") {
  if (!supabase) return null;

  try {
    const { data: existingGame } = await supabase
      .from("games")
      .select("*")
      .eq("room_code", roomCode)
      .neq("status", "FINISHED")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingGame) return existingGame;

    const newGameObj = {
      id: safeRandomUUID(),
      room_code: roomCode,
      status: "LOBBY",
      current_round: 1,
      total_rounds: 1,
      created_at: new Date().toISOString()
    };

    const { data: newGame, error } = await supabase
      .from("games")
      .insert(newGameObj)
      .select()
      .single();

    if (error) {
      handleDbNotice("Games table insert fallback", error);
      return newGameObj;
    }
    return newGame;
  } catch (err) {
    console.warn("getOrCreateActiveGame error:", err);
    return null;
  }
}

/**
 * Create a fresh new game instance in Supabase DB (finishes old game & clears past room players)
 */
export async function createNewGameInDb(roomCode = "EXPO26") {
  const newGameId = safeRandomUUID();

  if (!supabase) {
    return { id: newGameId, room_code: roomCode, status: "LOBBY", current_round: 1, total_rounds: 3 };
  }

  try {
    // 1. Mark existing active games for this room as FINISHED
    await supabase
      .from("games")
      .update({ status: "FINISHED", ended_at: new Date().toISOString() })
      .eq("room_code", roomCode)
      .neq("status", "FINISHED");

    // 2. Delete old players & round_results rows for this room
    await supabase.from("players").delete().eq("room_code", roomCode);
    await supabase.from("round_results").delete().eq("room_code", roomCode);

    // 3. Create brand new active game instance
    const newGameRecord = {
      id: newGameId,
      room_code: roomCode,
      status: "LOBBY",
      current_round: 1,
      total_rounds: 1,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("games")
      .insert(newGameRecord)
      .select()
      .single();

    if (error) {
      handleDbNotice("createNewGameInDb insert error", error);
      return newGameRecord;
    }

    return data || newGameRecord;
  } catch (err) {
    console.warn("createNewGameInDb error:", err);
    return { id: newGameId, room_code: roomCode, status: "LOBBY", current_round: 1, total_rounds: 3 };
  }
}

/**
 * Join or reconnect player in Supabase Postgres table `players` (scoped by game_id)
 */
export async function joinPlayerInDb({ roomCode = "EXPO26", name, employeeId = "", tcsUnit = "", playerId, gameId = null }) {
  if (!supabase) return null;

  const cleanName = (name || "").trim();
  const cleanEmpId = (employeeId || "").trim();
  const cleanUnit = (tcsUnit || "").trim();
  const targetId = playerId || safeRandomUUID();

  try {
    const activeGameId = gameId || null;

    // 1. If updating an existing player record (reconnect flow)
    if (playerId) {
      const { data: updatedPlayer } = await supabase
        .from("players")
        .update({
          connected: true,
          status: "WAITING",
          name: cleanName,
          last_seen_at: new Date().toISOString()
        })
        .eq("id", playerId)
        .select()
        .maybeSingle();

      if (updatedPlayer) return updatedPlayer;
    }

    // 2. Direct fast insertion of new player record
    const newPlayerRecord = {
      id: targetId,
      game_id: activeGameId,
      room_code: roomCode,
      name: cleanName,
      employee_id: cleanEmpId,
      tcs_unit: cleanUnit,
      status: "WAITING",
      connected: true,
      total_score: 0,
      joined_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString()
    };

    const { data: insertedPlayer, error } = await supabase
      .from("players")
      .insert(newPlayerRecord)
      .select()
      .single();

    if (error) {
      handleDbNotice("Players table insert error", error);
      return newPlayerRecord;
    }

    return insertedPlayer;
  } catch (err) {
    console.warn("joinPlayerInDb error:", err);
    return null;
  }
}

/**
 * Fetch all persistent active players for a room/game from Supabase Postgres
 */
export async function fetchActivePlayers(roomCode = "EXPO26", gameId = null) {
  if (!supabase) return [];

  try {
    let activeGameId = gameId;
    if (!activeGameId) {
      const activeGame = await getOrCreateActiveGame(roomCode);
      if (activeGame) activeGameId = activeGame.id;
    }

    let query = supabase
      .from("players")
      .select("*")
      .eq("room_code", roomCode)
      .order("joined_at", { ascending: true });

    if (activeGameId) {
      query = query.eq("game_id", activeGameId);
    }

    const { data, error } = await query;

    if (error) {
      handleDbNotice("fetchActivePlayers DB error", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.warn("fetchActivePlayers error:", err);
    return [];
  }
}

/**
 * Fetch all persistent round completion results for a room/game from Supabase Postgres
 */
export async function fetchRoundResults(roomCode = "EXPO26", roundNumber = null, gameId = null) {
  if (!supabase) return [];

  try {
    let activeGameId = gameId;
    if (!activeGameId) {
      const activeGame = await getOrCreateActiveGame(roomCode);
      if (activeGame) activeGameId = activeGame.id;
    }

    let query = supabase
      .from("round_results")
      .select("*")
      .eq("room_code", roomCode)
      .order("completion_time", { ascending: true });

    if (roundNumber) {
      query = query.eq("round_number", roundNumber);
    }

    if (activeGameId) {
      query = query.eq("game_id", activeGameId);
    }

    const { data, error } = await query;

    if (error) {
      handleDbNotice("fetchRoundResults DB error", error);
      return [];
    }

    return (data || []).map((row) => ({
      ...row,
      time: row.completion_time || row.time,
      name: row.player_name || row.name
    }));
  } catch (err) {
    console.warn("fetchRoundResults error:", err);
    return [];
  }
}

/**
 * Update player status / score / connection in Postgres
 */
export async function updatePlayerInDb(playerId, fields) {
  if (!supabase || !playerId) return null;

  try {
    const { data, error } = await supabase
      .from("players")
      .update({
        ...fields,
        last_seen_at: new Date().toISOString()
      })
      .eq("id", playerId)
      .select()
      .single();

    if (error) {
      handleDbNotice("updatePlayerInDb error", error);
    }
    return data;
  } catch (err) {
    console.warn("updatePlayerInDb exception:", err);
    return null;
  }
}

/**
 * Authoritative record of round completion result in Supabase Postgres
 */
export async function saveRoundResultInDb({
  playerId,
  playerName,
  roomCode = "EXPO26",
  roundNumber = 1,
  time
}) {
  if (!playerId || !time) return null;

  try {
    // 1. IDEMPOTENCY GUARD: Check if player ALREADY has a recorded result for this round
    if (supabase) {
      const { data: existingRecord } = await supabase
        .from("round_results")
        .select("*")
        .eq("room_code", roomCode)
        .eq("round_number", roundNumber)
        .eq("player_id", playerId)
        .maybeSingle();

      if (existingRecord) {
        // Player already finalized result. Return existing record without overwriting!
        return existingRecord;
      }
    }

    // 2. Calculate authoritative rank by counting existing DB results for this room & round
    let existingCount = 0;
    if (supabase) {
      const { data: existingResults } = await supabase
        .from("round_results")
        .select("id")
        .eq("room_code", roomCode)
        .eq("round_number", roundNumber);

      if (existingResults) existingCount = existingResults.length;
    }

    const rank = existingCount + 1;
    // Score rules: 1st = 100, 2nd = 80, 3rd = 65, 4th = 50, 5th = 40, 6th+ = 25
    const score = rank === 1 ? 100 : rank === 2 ? 80 : rank === 3 ? 65 : rank === 4 ? 50 : rank === 5 ? 40 : 25;

    const newRecord = {
      id: safeRandomUUID(),
      player_id: playerId,
      player_name: playerName.trim(),
      room_code: roomCode,
      round_number: roundNumber,
      completion_time: Number(time),
      score: score,
      rank: rank,
      completed_at: new Date().toISOString()
    };

    if (supabase) {
      // Insert result into round_results table in Postgres
      const { data, error } = await supabase
        .from("round_results")
        .insert(newRecord)
        .select()
        .single();

      if (error) {
        handleDbNotice("saveRoundResultInDb Postgres insert notice", error);
      }

      // Update total_score & status in players table for this player
      const { data: player } = await supabase
        .from("players")
        .select("total_score, tournament_status")
        .eq("id", playerId)
        .maybeSingle();

      const currentTotal = player?.total_score || 0;
      const currentTourneyStatus = player?.tournament_status || "ACTIVE";
      const newTourneyStatus = currentTourneyStatus === "WINNER" ? "WINNER" : "ACTIVE";

      await supabase
        .from("players")
        .update({
          total_score: currentTotal + score,
          status: "COMPLETED",
          tournament_status: newTourneyStatus,
          last_seen_at: new Date().toISOString()
        })
        .eq("id", playerId);

      return data || newRecord;
    }

    return newRecord;
  } catch (err) {
    console.warn("saveRoundResultInDb exception:", err);
    return null;
  }
}

/**
 * Delete / remove player from Postgres
 */
export async function removePlayerFromDb(playerId) {
  if (!supabase || !playerId) return;

  try {
    await supabase.from("players").delete().eq("id", playerId);
  } catch (err) {
    console.warn("removePlayerFromDb error:", err);
  }
}

/**
 * Reset all active players & results for a room
 */
export async function resetRoomPlayersInDb(roomCode = "EXPO26") {
  return await createNewGameInDb(roomCode);
}

/**
 * Evaluate tournament round results
 * RULE: Any player who successfully completes the puzzle BEFORE timer expiry is COMPLETED & ADVANCES.
 * They are NEVER eliminated!
 * Only players who timed out without completing are ELIMINATED (TIME_EXPIRED).
 */
export async function evaluateTournamentRound({
  roomCode = "EXPO26",
  roundNumber = 1,
  allPlayers = [],
  roundResults = []
}) {
  // 1. Identify players who were active coming into this round
  const roundActivePlayers = allPlayers.filter((p) => {
    const tourneyStatus = p.tournament_status || "ACTIVE";
    return tourneyStatus === "ACTIVE" || tourneyStatus === "ADVANCED";
  });

  if (roundActivePlayers.length === 0) {
    return { advancingPlayers: [], eliminatedPlayers: [], finalWinner: null };
  }

  // 2. Cross reference with round_results for this round
  const currentRoundResults = roundResults.filter(
    (r) => !r.round_number || Number(r.round_number) === Number(roundNumber)
  );

  const completedList = [];
  const timedOutList = [];

  roundActivePlayers.forEach((player) => {
    const pId = player.id ? player.id.toString().toLowerCase() : "";
    const pName = player.name ? player.name.toString().toLowerCase() : "";

    const res = currentRoundResults.find((r) => {
      const rPlayerId = r.player_id ? r.player_id.toString().toLowerCase() : "";
      const rId = r.id ? r.id.toString().toLowerCase() : "";
      const rName = r.player_name
        ? r.player_name.toString().toLowerCase()
        : r.name
        ? r.name.toString().toLowerCase()
        : "";

      return (
        (rPlayerId && rPlayerId === pId) ||
        (rId && rId === pId) ||
        (rName && rName === pName)
      );
    });

    if (res && Number(res.completion_time || res.time || 0) > 0) {
      completedList.push({
        player,
        result: res,
        time: Number(res.completion_time || res.time || 0)
      });
    } else {
      timedOutList.push(player);
    }
  });

  // Sort completed list by solve time ascending (fastest first = rank 1)
  completedList.sort((a, b) => a.time - b.time);

  // RULE: ALL COMPLETED PLAYERS ADVANCE!
  const advancing = completedList.map((item) => item.player);
  // ONLY TIMED OUT PLAYERS ARE ELIMINATED!
  let eliminated = timedOutList;
  let finalWinner = null;

  // Determine final winner guard (e.g. if single active player or single solver remaining)
  if (roundActivePlayers.length === 1 && completedList.length > 0) {
    finalWinner = completedList[0].player;
  } else if (completedList.length === 1 && timedOutList.length === roundActivePlayers.length - 1) {
    finalWinner = completedList[0].player;
  }

  // HARD GUARD: Completed players are NEVER in eliminated array!
  eliminated = eliminated.filter((p) => {
    const pIdLower = p.id ? p.id.toString().toLowerCase() : "";
    const pNameLower = p.name ? p.name.toString().toLowerCase() : "";
    return !completedList.some((c) => {
      const cIdLower = c.player.id ? c.player.id.toString().toLowerCase() : "";
      const cNameLower = c.player.name ? c.player.name.toString().toLowerCase() : "";
      return (cIdLower && cIdLower === pIdLower) || (cNameLower && cNameLower === pNameLower);
    });
  });

  // Write updated statuses in Postgres DB
  if (supabase) {
    try {
      if (finalWinner) {
        await supabase
          .from("players")
          .update({
            tournament_status: "WINNER",
            player_status: "tournament_winner",
            status: "COMPLETED",
            last_seen_at: new Date().toISOString()
          })
          .eq("id", finalWinner.id);
      }

      for (const item of completedList) {
        const p = item.player;
        if (finalWinner && p.id === finalWinner.id) continue;
        await supabase
          .from("players")
          .update({
            tournament_status: "ACTIVE",
            player_status: "advancing",
            status: "COMPLETED",
            last_seen_at: new Date().toISOString()
          })
          .eq("id", p.id);
      }

      for (const p of eliminated) {
        await supabase
          .from("players")
          .update({
            tournament_status: "ELIMINATED",
            player_status: "eliminated",
            status: "ELIMINATED",
            eliminated_in_round: roundNumber,
            last_seen_at: new Date().toISOString()
          })
          .eq("id", p.id);
      }
    } catch (e) {
      console.warn("evaluateTournamentRound DB update notice:", e);
    }
  }

  return {
    advancingPlayers: advancing,
    eliminatedPlayers: eliminated,
    finalWinner: finalWinner
  };
}

/**
 * Save uploaded game image to Supabase Postgres `game_images` table
 */
export async function saveGameImageInDb({ name, category, description, storagePath = "", publicUrl }) {
  if (!supabase) return null;

  try {
    const record = {
      name: name.trim(),
      category: category || "OTHER",
      description: (description || "").trim(),
      storage_path: storagePath,
      public_url: publicUrl,
      times_used: 0,
      is_active: true,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("game_images")
      .insert(record)
      .select()
      .single();

    if (error) {
      handleDbNotice("saveGameImageInDb insert notice", error);
      return null;
    }

    return data;
  } catch (err) {
    console.warn("saveGameImageInDb exception:", err);
    return null;
  }
}

/**
 * Persist active game state payload into Supabase `games` table
 */
export async function updateActiveGameStateInDb(roomCode = "EXPO26", gameState) {
  if (!supabase || !gameState) return;

  try {
    const activeGame = await getOrCreateActiveGame(roomCode);
    if (!activeGame?.id) return;

    await supabase
      .from("games")
      .update({
        status: gameState.phase || "LOBBY",
        current_round: gameState.round || 1,
        game_state: gameState,
        updated_at: new Date().toISOString()
      })
      .eq("id", activeGame.id);
  } catch (err) {
    handleDbNotice("updateActiveGameStateInDb notice", err);
  }
}

/**
 * Fetch latest active game state from Supabase `games` table
 */
export async function fetchActiveGameStateFromDb(roomCode = "EXPO26") {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .eq("room_code", roomCode)
      .neq("status", "FINISHED")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data?.game_state) {
      return data.game_state;
    }
    return null;
  } catch (err) {
    console.warn("fetchActiveGameStateFromDb exception:", err);
    return null;
  }
}

