import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChallengePublic, ChallengeWithHash } from "../types/index.js";
import { AppError } from "../utils/errors.js";
import { verifyFlagHash } from "../utils/flag.js";
import { fetchScoreboard } from "./scoreboard.service.js";
import { scoreboardEvents } from "./scoreboard-events.js";

export async function listPublicChallenges(
  supabase: SupabaseClient
): Promise<ChallengePublic[]> {
  const { data, error } = await supabase
    .from("challenges_public")
    .select("*")
    .order("points", { ascending: true });

  if (error) {
    throw new AppError(
      "Gagal memuat daftar tantangan.",
      500,
      "CHALLENGES_FETCH_FAILED"
    );
  }

  return (data ?? []) as ChallengePublic[];
}

async function getChallengeWithHash(
  supabase: SupabaseClient,
  challengeId: string
): Promise<ChallengeWithHash> {
  const { data, error } = await supabase
    .from("challenges")
    .select(
      "id, slug, title, description, category, points, difficulty, is_active, created_at, flag_hash"
    )
    .eq("id", challengeId)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    throw new AppError("Tantangan tidak ditemukan.", 404, "CHALLENGE_NOT_FOUND");
  }

  return data as ChallengeWithHash;
}

async function hasAlreadySolved(
  supabase: SupabaseClient,
  userId: string,
  challengeId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("submissions")
    .select("id")
    .eq("user_id", userId)
    .eq("challenge_id", challengeId)
    .eq("is_correct", true)
    .maybeSingle();

  if (error) {
    throw new AppError(
      "Gagal memeriksa status tantangan.",
      500,
      "SUBMISSION_CHECK_FAILED"
    );
  }

  return Boolean(data);
}

export interface SubmitFlagInput {
  challengeId: string;
  flag: string;
}

export interface SubmitFlagResult {
  isCorrect: boolean;
  message: string;
  alreadySolved: boolean;
  pointsAwarded: number;
}

export async function submitFlag(
  supabase: SupabaseClient,
  userId: string,
  input: SubmitFlagInput
): Promise<SubmitFlagResult> {
  const alreadySolved = await hasAlreadySolved(
    supabase,
    userId,
    input.challengeId
  );

  if (alreadySolved) {
    throw new AppError(
      "Kamu sudah menyelesaikan tantangan ini sebelumnya.",
      409,
      "ALREADY_SOLVED"
    );
  }

  const challenge = await getChallengeWithHash(supabase, input.challengeId);
  const isCorrect = await verifyFlagHash(input.flag, challenge.flag_hash);

  const { error: insertError } = await supabase.from("submissions").insert({
    user_id: userId,
    challenge_id: input.challengeId,
    submitted_flag: input.flag.trim(),
    is_correct: isCorrect,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      throw new AppError(
        "Kamu sudah menyelesaikan tantangan ini sebelumnya.",
        409,
        "ALREADY_SOLVED"
      );
    }

    throw new AppError(
      "Gagal menyimpan submission.",
      500,
      "SUBMISSION_INSERT_FAILED"
    );
  }

  if (isCorrect) {
    const scoreboard = await fetchScoreboard(supabase);
    scoreboardEvents.emitUpdate({
      scoreboard,
      triggeredByUserId: userId,
      challengeId: input.challengeId,
    });

    return {
      isCorrect: true,
      message: "Flag benar! Selamat, poin ditambahkan ke scoreboard.",
      alreadySolved: false,
      pointsAwarded: challenge.points,
    };
  }

  return {
    isCorrect: false,
    message: "Flag salah. Coba lagi!",
    alreadySolved: false,
    pointsAwarded: 0,
  };
}
