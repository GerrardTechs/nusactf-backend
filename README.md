# NusaCTF Backend

API server untuk platform CTF NusaCTF (Fastify + TypeScript + Supabase).

Repo terpisah dari frontend — lihat `nusactf-frontend` untuk UI.

## Setup

```bash
cp .env.example .env   # isi credential Supabase
npm install
npm run dev            # http://localhost:3001
```

## Database

Jalankan migrasi di Supabase SQL Editor:

```
supabase/migrations/20250603000001_init_nusactf_schema.sql
```

## Scripts

| Command | Fungsi |
|---------|--------|
| `npm run dev` | Dev server (tsx watch) |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm run start` | Production server |
| `npm run typecheck` | Cek tipe TypeScript |
| `npm run generate:foto` | Regenerate stego image challenge |

## API utama

- `GET /health`
- `GET /api/scoreboard` · `GET /api/scoreboard/stream` (SSE)
- `GET /api/challenges` · `POST /api/submissions` (auth required)
- `POST /api/challenges/warung-login` (SQLi sandbox)

Frontend dev (port 5173) harus dicantumkan di `CORS_ORIGIN`.
