export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
}

export interface ChallengePublic {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  points: number;
  difficulty: string;
  is_active: boolean;
  created_at: string;
}

export interface ChallengeWithHash extends ChallengePublic {
  flag_hash: string;
}

export interface Submission {
  id: string;
  user_id: string;
  challenge_id: string;
  submitted_flag: string;
  is_correct: boolean;
  created_at: string;
}

export interface ScoreboardEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_points: number;
  challenges_solved: number;
  last_solve_at: string | null;
  rank: number;
}

export interface UserSolve {
  user_id: string;
  challenge_id: string;
  solved_at: string;
}

export interface JwtUserPayload {
  sub: string;
  email?: string;
  role?: string;
  aud?: string;
}
