-- =============================================================================
-- NusaCTF — Initial Schema, RLS, Scoreboard View & Seed Data
-- Run via Supabase SQL Editor or: supabase db push
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. PROFILES (linked to auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  username    VARCHAR(50) UNIQUE NOT NULL,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT profiles_username_length CHECK (char_length(username) >= 3),
  CONSTRAINT profiles_username_format CHECK (username ~ '^[a-zA-Z0-9_]+$')
);

COMMENT ON TABLE public.profiles IS 'Public user profile linked 1:1 with Supabase Auth user.';

-- Auto-create profile when a new auth user registers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data ->> 'username'), ''),
      'user_' || substr(replace(NEW.id::text, '-', ''), 1, 8)
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 2. CHALLENGES
-- -----------------------------------------------------------------------------
CREATE TABLE public.challenges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        VARCHAR(50) UNIQUE NOT NULL,
  title       VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  category    VARCHAR(50) NOT NULL,
  points      INT NOT NULL,
  flag_hash   TEXT NOT NULL,
  difficulty  VARCHAR(20) NOT NULL DEFAULT 'Easy',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT challenges_points_positive CHECK (points > 0),
  CONSTRAINT challenges_category_valid CHECK (
    category IN (
      'Web Exploitation',
      'Cryptography',
      'Forensics'
    )
  )
);

COMMENT ON TABLE public.challenges IS 'CTF challenges. flag_hash is bcrypt — never expose to clients.';
COMMENT ON COLUMN public.challenges.flag_hash IS 'bcrypt hash of the correct flag; verified server-side only.';

CREATE INDEX idx_challenges_category ON public.challenges (category);
CREATE INDEX idx_challenges_slug ON public.challenges (slug);

-- Public-facing view (no flag_hash) for frontend listing
CREATE OR REPLACE VIEW public.challenges_public
WITH (security_invoker = true)
AS
SELECT
  id,
  slug,
  title,
  description,
  category,
  points,
  difficulty,
  is_active,
  created_at
FROM public.challenges
WHERE is_active = TRUE;

COMMENT ON VIEW public.challenges_public IS 'Safe challenge metadata for authenticated clients (excludes flag_hash).';

-- -----------------------------------------------------------------------------
-- 3. SUBMISSIONS
-- -----------------------------------------------------------------------------
CREATE TABLE public.submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  challenge_id    UUID NOT NULL REFERENCES public.challenges (id) ON DELETE CASCADE,
  submitted_flag  TEXT NOT NULL,
  is_correct      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.submissions IS 'Flag submission attempts. Only first correct solve per user/challenge counts for score.';

CREATE INDEX idx_submissions_user_id ON public.submissions (user_id);
CREATE INDEX idx_submissions_challenge_id ON public.submissions (challenge_id);
CREATE INDEX idx_submissions_user_challenge ON public.submissions (user_id, challenge_id);
CREATE INDEX idx_submissions_created_at ON public.submissions (created_at DESC);

-- Enforce at most one correct submission per user per challenge
CREATE UNIQUE INDEX idx_submissions_one_correct_per_user_challenge
  ON public.submissions (user_id, challenge_id)
  WHERE is_correct = TRUE;

-- -----------------------------------------------------------------------------
-- 4. SCOREBOARD (aggregated view — first correct solve per challenge counts)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.scoreboard
WITH (security_invoker = true)
AS
WITH first_correct AS (
  SELECT DISTINCT ON (s.user_id, s.challenge_id)
    s.user_id,
    s.challenge_id,
    s.created_at AS solved_at
  FROM public.submissions AS s
  WHERE s.is_correct = TRUE
  ORDER BY s.user_id, s.challenge_id, s.created_at ASC
)
SELECT
  p.id AS user_id,
  p.username,
  p.avatar_url,
  COALESCE(SUM(c.points), 0)::INT AS total_points,
  COUNT(fc.challenge_id)::INT AS challenges_solved,
  MAX(fc.solved_at) AS last_solve_at,
  RANK() OVER (
    ORDER BY COALESCE(SUM(c.points), 0) DESC, MAX(fc.solved_at) ASC NULLS LAST
  )::INT AS rank
FROM public.profiles AS p
LEFT JOIN first_correct AS fc ON fc.user_id = p.id
LEFT JOIN public.challenges AS c ON c.id = fc.challenge_id
GROUP BY p.id, p.username, p.avatar_url
HAVING COUNT(fc.challenge_id) > 0
ORDER BY total_points DESC, last_solve_at ASC NULLS LAST;

COMMENT ON VIEW public.scoreboard IS 'Live ranking: first correct submission per challenge awards points once.';

-- Per-user solve status (for challenge cards: Solved / Unsolved)
CREATE OR REPLACE VIEW public.user_solves
WITH (security_invoker = true)
AS
SELECT DISTINCT ON (s.user_id, s.challenge_id)
  s.user_id,
  s.challenge_id,
  s.created_at AS solved_at
FROM public.submissions AS s
WHERE s.is_correct = TRUE
ORDER BY s.user_id, s.challenge_id, s.created_at ASC;

-- -----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Challenges: column-level grants — flag_hash never exposed to clients
REVOKE ALL ON public.challenges FROM authenticated, anon;

GRANT SELECT (
  id, slug, title, description, category, points, difficulty, is_active, created_at
) ON public.challenges TO authenticated;

CREATE POLICY "challenges_select_active_metadata"
  ON public.challenges FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

CREATE POLICY "challenges_deny_anon"
  ON public.challenges FOR ALL
  TO anon
  USING (FALSE);

-- Submissions: read own history; inserts only via backend (service_role)
CREATE POLICY "submissions_select_own"
  ON public.submissions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "submissions_deny_insert_client"
  ON public.submissions FOR INSERT
  TO authenticated
  WITH CHECK (FALSE);

-- Scoreboard & user_solves: read-only for all authenticated users
GRANT SELECT ON public.challenges_public TO authenticated;
GRANT SELECT ON public.scoreboard TO authenticated;
GRANT SELECT ON public.user_solves TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;

-- -----------------------------------------------------------------------------
-- 6. SEED DATA — 3 beginner challenges
-- flag_hash generated with bcrypt (cost 12) — plaintext flags stored server-side only
-- -----------------------------------------------------------------------------
INSERT INTO public.challenges (
  slug,
  title,
  description,
  category,
  points,
  flag_hash,
  difficulty
) VALUES
(
  'warung-login',
  'Warung Login',
  'Sebuah warung digital menyimpan kredensial admin di database lokal yang rentan. Temukan cara bypass autentikasi SQL injection melalui endpoint sandbox `/api/challenges/warung-login`, lalu submit flag yang ditemukan.

Petunjuk: Coba payload klasik pada field username — `' OR '1'='1`.',
  'Web Exploitation',
  100,
  '$2b$12$3JZ7/tdTai6hYV6NO4yxAew6ssLO1n9jzK/bTDdpmwr07M2/ZGOTG',
  'Easy'
),
(
  'pesan-rahasia',
  'Pesan Rahasia',
  'Agent Nusa mengirim pesan terenkripsi dengan Caesar Cipher (shift 3). Dekripsi teks berikut untuk menemukan flag:

`QxvDCTF{fdhvhu_flskhu_vdqjdw_pxgxk_vhndol}`

Submit flag plaintext yang benar melalui form submission platform.',
  'Cryptography',
  100,
  '$2b$12$N49ILvjXKHXg6ij9sWl0ZuzNsKaK.IgRuKnULPKZF/VmR0rBJmpma',
  'Easy'
),
(
  'foto-kenangan',
  'Foto Kenangan',
  'Sebuah foto liburan terlihat biasa saja — tapi Nusa yakin ada rahasia di dalamnya. Unduh gambar dari `/api/challenges/foto-kenangan/image` dan analisis metadata EXIF atau byte di akhir file (EOF steganography).

Tools yang bisa dipakai: exiftool, strings, hex editor, steghide.',
  'Forensics',
  150,
  '$2b$12$Uac4toxxUp36OsiB2IYdnedh9T2FIx17qL1C2cMQpZ4dVmsC9Ef9i',
  'Easy'
)
ON CONFLICT (slug) DO NOTHING;
