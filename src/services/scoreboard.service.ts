import type { SupabaseClient } from "@supabase/supabase-js";
import type { ScoreboardEntry, UserSolve } from "../types/index.js";
import { AppError } from "../utils/errors.js";

export async function fetchScoreboard(
  supabase: SupabaseClient
): Promise<ScoreboardEntry[]> {
  const { data, error } = await supabase
    .from("scoreboard")
    .select("*")
    .order("rank", { ascending: true });

  if (error) {
    throw new AppError("Gagal memuat scoreboard.", 500, "SCOREBOARD_FETCH_FAILED");
  }

  return (data ?? []) as ScoreboardEntry[];
}

export async function fetchUserSolves(
  supabase: SupabaseClient,
  userId: string
): Promise<UserSolve[]> {
  const { data, error } = await supabase
    .from("user_solves")
    .select("user_id, challenge_id, solved_at")
    .eq("user_id", userId);

  if (error) {
    throw new AppError("Gagal memuat status solve.", 500, "USER_SOLVES_FETCH_FAILED");
  }

  return (data ?? []) as UserSolve[];
}
