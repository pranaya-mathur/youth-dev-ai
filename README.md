# Youth Dev AI — MVP (ready to run)

Strength-first youth experience (ages **11–18**): story-style moments → AI **power indicators**, symbolic identity, narrative, micro-action, and reflection—**not** a scored test.

**Roadmap:** [docs/FEATURES.md](docs/FEATURES.md) — MVP vs full / scalable split.

---

## Current state (this repo)

| Area | What you get |
|------|----------------|
| **Journey** | Home → onboarding → **consent** (`/consent`) → **12 scenarios** → **results** with opportunity nudges → optional **living profile** (`/profile`), **weekly check-in** (`/check-in`), **Play hub** (`/play`). **In-app assistant** (`/coach`, Home panel, Play hub): Youth Dev Q&A **without** consent. Policies: `/privacy`, `/terms`, `/data-rights`. `/parent` is a placeholder for future verified guardian flows. |
| **AI profile** | `POST /api/profile` — consent + moderation. **Groq** preferred when `GROQ_API_KEY` is set, else **OpenAI** when `OPENAI_API_KEY` is set. **Default: no mock LLM**—without keys, profile returns **400** unless `ALLOW_LLM_DEMO=true` (local/offline only). |
| **App assistant** | `POST /api/app-help` — **no consent**; product / navigation help only; **not** written to coach history in Postgres. Same LLM routing as profile; mock only if `ALLOW_LLM_DEMO=true`. Legacy **`POST /api/coach`** (personal strengths chat + consent) remains for integrators. |
| **Gamification** | **+55 XP** per **new** AI profile (deduped by a hash of identity + strengths), **+8 XP** per journal entry. Badges and streaks follow `frontend/lib/gamification.ts` (mirrored on the server when Postgres is on). Nav **Lv · XP** chip appears once XP is above zero and refreshes on navigation. |
| **Persistence** | **Without Postgres:** snapshots, XP, journal, and session data live in **browser storage** only. **With Postgres:** set `DATABASE_URL`; the API stores users, profile runs, gamification, journal rows, and coach exchanges. The app sends a stable anonymous **`X-Youth-User-Id`** (UUID in `localStorage`) and syncs from **`GET /api/me`** into the UI cache. **`POST /api/profile` requires that header when the database is enabled** (the Next.js client sets it automatically). |
| **Health check** | `GET /health` — `ok`, `llm_provider`, `demo_mode`, **`allow_llm_demo`**, `openai_moderation_configured`, **`database_configured`**, **`retention_maintenance_configured`**. |
| **UI & language** | Fixed copy is **English** (`lang="en"` in the Next.js layout). **Mobile:** quick links for Play, Coach, Profile, and Check-in appear under the header on small screens. **LLM output:** profile and coach system prompts in `backend/app/ai_pipeline.py` and `backend/app/coach_pipeline.py` instruct **standard English only** (no Hindi/Hinglish or mixed-language replies). |

---

## Quick start

From the repository root:

```bash
npm install
npm run setup    # backend .venv + pip, frontend npm (first time only)
npm run dev      # API on :8000 and Next.js on :3000 together
```

Open **http://localhost:3000**.

- If `backend/.venv` is missing, run `npm run setup` once.
- Copy **`backend/.env.example`** → **`backend/.env`**. Set **`GROQ_API_KEY`** or **`OPENAI_API_KEY`** for real AI. For **offline mock** only (no keys), set **`ALLOW_LLM_DEMO=true`** in `backend/.env`.
- Optional Postgres: `docker compose up -d` then add **`DATABASE_URL`** to `backend/.env` (see below) and restart the API.

---

## Deploy (Docker, single host)

Images: **`backend/Dockerfile`** (FastAPI) and **`frontend/Dockerfile`** (Next **standalone**). Production-ish stack:

```bash
# Optional: cp compose.env.example .env and fill LLM keys + ALLOW_LLM_DEMO (repo-root `.env` is gitignored). Compose substitutes them into the API container.
docker compose -f docker-compose.prod.yml up --build
```

Then open **http://localhost:3000** (UI) and **http://127.0.0.1:8000/health** (API). The web image is built with `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000` so the browser can reach the API on the same machine. For a public domain, **rebuild** the web image with `--build-arg NEXT_PUBLIC_API_URL=https://your-api.example.com` and set **`ALLOWED_ORIGINS`** on the API to your real site origin (comma-separated). Put **TLS** and rate limits in front (Caddy, nginx, Traefik, or your cloud load balancer).

**Before exposing to minors at scale:** policies are templates, guardian verification is not shipped, and device ids are not strong identity—treat as **pilot / internal** until counsel and product sign off.

**Vercel (free tier):** the **Next.js** app can deploy to Vercel; run the **FastAPI** API (and Postgres, if used) on another host (Railway, Render, Fly.io, VPS, Docker, etc.). Set `NEXT_PUBLIC_API_URL` at build time to the public API URL.

---

## Pilot dry-run (about 5 minutes)

1. `npm run dev` from the repo root; open **http://localhost:3000** and **http://127.0.0.1:8000/health**.
2. Confirm **`llm_provider`** is `openai` or `groq`, **`demo_mode`** is `false`, and **`allow_llm_demo`** matches what you want (`false` for real AI only).
3. Walk **onboarding → consent → assessment → results** on a phone-width window: check the **chip row** (Play / Coach / Profile / Check-in) and that profile + coach read well in **English**.
4. Open **`/coach`**, send a message, and confirm no **demo** banner when the live model is active.
5. Open **`/data-rights`**: try **device export**; with Postgres on, try **server export** and (if you intend to test it) **server delete** on a test id.

---

## Manual start (separate terminals)

### 1. Backend (FastAPI)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Environment (`backend/.env`):**

| Variable | Role |
|----------|------|
| `GROQ_API_KEY`, `GROQ_MODEL` | Preferred LLM path for profile + coach when set. |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Alternative LLM; also enables **OpenAI Moderations** when set. |
| `LLM_PROVIDER` | Optional: `groq` or `openai` to force routing. |
| `DATABASE_URL` | Optional. Example: `postgresql+asyncpg://youth:youth@127.0.0.1:5432/youth` (matches `docker-compose.yml`). |
| `DATA_RETENTION_DAYS` | Optional **pair** with `MAINTENANCE_SECRET` (set **both** or neither; app will not boot if only one is set). Integer 1–3650. |
| `MAINTENANCE_SECRET` | Optional **pair** with `DATA_RETENTION_DAYS`. Min **12** characters when set. |
| `ALLOWED_ORIGINS` | CORS; default includes `http://localhost:3000`. |
| `ALLOW_LLM_DEMO` | Default **`false`**: no mock profile/coach without keys. Set **`true`** only for local UI without LLM keys. |

**Postgres:** from the repo root:

```bash
docker compose up -d
```

Service **db** — Postgres **16**, user / password / database **`youth`**, port **5432**. After setting `DATABASE_URL`, restart `uvicorn`. Confirm with **`GET /health`** → `database_configured: true`.

### 2. Frontend (Next.js)

```bash
cd frontend
cp .env.local.example .env.local   # optional; API default http://127.0.0.1:8000
npm install
npm run dev
```

| Variable | Role |
|----------|------|
| `NEXT_PUBLIC_API_URL` | Base URL for the FastAPI app (default `http://127.0.0.1:8000`). |

---

## HTTP API (summary)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Liveness + `llm_provider`, `demo_mode`, `allow_llm_demo`, `database_configured`, `retention_maintenance_configured`, etc. |
| `POST` | `/api/profile` | Generate profile from answers + consent. |
| `POST` | `/api/coach` | Coach reply from chat history + consent. |
| `GET` | `/api/me` | Full sync payload when DB is on (**requires** `X-Youth-User-Id`). |
| `GET` | `/api/me/export` | Full portable JSON export when DB is on (**requires** header). Rate-limited per IP. |
| `POST` | `/api/me/delete` | **Preferred** server erasure: JSON body `{"confirm":"delete_my_server_data"}` + `X-Youth-User-Id`. Rate-limited per IP. |
| `DELETE` | `/api/me` | Same as delete (legacy); **requires** header. Shares rate limit with `POST /api/me/delete`. |
| `POST` | `/api/internal/maintenance/purge-inactive-users` | JSON body `{"confirm":"purge_inactive_users"}` + header `X-Maintenance-Secret`. Purge is rate-limited per IP. |
| `POST` | `/api/journal` | Save check-in entry + bump server XP (**requires** header + consent when DB is on). |

Anonymous **`X-Youth-User-Id`** is **not** authentication—treat it as a device-scoped sync key until real accounts exist.

---

### Root npm scripts

| Command           | Description |
|-------------------|-------------|
| `npm run dev`     | FastAPI + Next.js in parallel |
| `npm run setup`   | `backend/.venv`, pip, and frontend `npm install` |
| `npm run dev:api` | API only |
| `npm run dev:web` | Frontend only |

---

## Stack

- **frontend/** — Next.js 14 (App Router), Tailwind, session + `localStorage`, optional **`GET /api/me`** sync (with an **8s timeout** so Play/Profile still render if the API is slow). Optional **`frontend/.env.local`** for `NEXT_PUBLIC_API_URL`.
- **backend/** — FastAPI, Pydantic, optional **SQLAlchemy 2 async + asyncpg**, LangChain Groq + `httpx` for OpenAI, consent + moderation, **per-IP rate limits** on sensitive `GET /api/me/export` and delete routes, **audit logging** for export/delete/purge (hashed device id only), and **English-only** instructions for generated text.

---

## Notes

- **Legal:** `/privacy`, `/terms`, and `/data-rights` are **templates**, not legal advice—have counsel review before production (minors, AI processing, regional law).
- **Consent:** Required before assessment; metadata is sent with profile / coach / journal and validated server-side. Keep `frontend/lib/policy.ts` and `backend/app/policy_constants.py` in sync.
- **Moderation:** Local rules always; OpenAI Moderations when `OPENAI_API_KEY` is set.
- **Clearing data:** Data & rights (`/data-rights`) can **download** JSON (device + server export), **delete server rows** via `POST /api/me/delete` with explicit `confirm` (or legacy `DELETE /api/me`), and **clear** the browser. Export/delete return **429** if rate limits are exceeded (per-process memory limiter; use Redis in multi-worker production).
- **Retention (operators):** With both env vars set, call purge with JSON `{"confirm":"purge_inactive_users"}` and `X-Maintenance-Secret` (see `GET /health` → `retention_maintenance_configured`). Example: `curl -X POST …/api/internal/maintenance/purge-inactive-users -H 'Content-Type: application/json' -H 'X-Maintenance-Secret: …' -d '{"confirm":"purge_inactive_users"}'`. Sensitive actions are **audit-logged** (hashed device id only; configure Python logging in production).
- Prefer **`backend/.venv`** for Python; a root-level `venv/` (if present) is unrelated.
- **Cursor / VS Code:** optional **`.vscode/settings.json`** enables `python.terminal.useEnvFile` and points **`python.envFile`** at `backend/.env` for Python tooling in the IDE (the API still loads `.env` via Pydantic at process start).
