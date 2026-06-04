import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "../types/index.js";
import { AppError } from "../utils/errors.js";

export async function fetchProfileById(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, created_at")
    .eq("id", userId)
    .single();

  if (error || !data) {
    throw new AppError("Profil pengguna tidak ditemukan.", 404, "PROFILE_NOT_FOUND");
  }

  return data as Profile;
}

export async function verifySupabaseToken(
  supabase: SupabaseClient,
  token: string
): Promise<{ userId: string; email?: string }> {
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new AppError("Token tidak valid atau sudah kedaluwarsa.", 401, "INVALID_TOKEN");
  }

  return {
    userId: data.user.id,
    email: data.user.email,
  };
}
