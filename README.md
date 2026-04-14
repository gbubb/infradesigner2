# Infra Design Tool

A network infrastructure design application for designing, configuring, and analyzing data center and network infrastructure deployments. Features include component selection, rack layout visualization, cost analysis, power calculations, and design comparison.

## Tech Stack

- **React 18** + TypeScript, **Vite** (SWC)
- **Zustand** for state management
- **PostgreSQL** (vanilla) with **PostgREST** (REST API) + **GoTrue** (auth)
- **shadcn/ui** (Radix UI + Tailwind CSS)
- **React Router v6**, **TanStack Query**
- **Recharts** + **Plotly.js** for visualization

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Docker Desktop (or Colima) — for the local backend stack

### First-time setup

```sh
npm install
npm run dev:db       # starts postgres + postgrest + gotrue + kong + mailpit
npm run dev          # starts Vite on http://localhost:8080
```

The first `dev:db` run takes ~30-60s because it pulls images and restores the database from `db_cluster-11-11-2025@01-58-10.backup.gz`. Subsequent runs are instant.

## Local backend stack

`docker compose up -d` (aliased to `npm run dev:db`) brings up:

| Service    | Port  | Purpose                                         |
|------------|-------|-------------------------------------------------|
| postgres   | 5432  | Vanilla Postgres 16, data persisted in a volume |
| kong       | 54321 | API gateway routing `/auth/v1` and `/rest/v1`   |
| postgrest  | (via kong) | REST API over the public schema            |
| gotrue     | (via kong) | Email/password auth, issues JWTs           |
| mailpit    | 8025  | Web UI for captured dev emails                  |

The React app talks to `http://localhost:54321` via the standard `@supabase/supabase-js` client — both PostgREST and GoTrue speak Supabase's wire protocols, so no client code changes are needed. The JWT secret is shared across all services; the anon key is pre-generated in `.env.development`.

### Useful npm scripts

```sh
npm run dev:db         # up -d the stack
npm run dev:db:stop    # down the stack (preserves data)
npm run dev:db:reset   # nuke volume and re-restore from backup
npm run dev:db:logs    # tail all logs
```

### Inspecting the database

```sh
docker compose exec db psql -U postgres
```

### Captured emails

Sign-up confirmation and password-reset emails go to mailpit: <http://localhost:8025>. (Auto-confirm is enabled by default in the dev stack, so sign-up doesn't actually require email click-through.)

## Switching to an external/hosted Postgres

No code changes needed — only env vars:

1. **Frontend** (`.env.local` or deploy platform):
   ```
   VITE_SUPABASE_URL=https://your-api-gateway.example.com
   VITE_SUPABASE_ANON_KEY=<JWT signed with the production JWT secret, role=anon>
   ```
2. **Backend services** — point the Postgres URIs at the external DB:
   - `PGRST_DB_URI` (PostgREST)
   - `GOTRUE_DB_DATABASE_URL` (GoTrue)
3. **JWT secret** — ensure the same `JWT_SECRET` is set for PostgREST, GoTrue, and whatever signs your anon key.

The `docker-compose.yml` is the source of truth for how each service is configured; mirror those envs in your deploy target (Railway, Fly.io, Render, ECS, self-hosted, etc.).

## Build, lint, preview

```sh
npm run build      # production build
npm run preview    # preview the production build
npm run lint       # eslint
```

## Project structure

```
src/
├── components/     # UI components organized by feature
├── context/        # React context providers
├── data/           # Static data and constants
├── hooks/          # Custom React hooks
├── integrations/   # Supabase JS client + generated DB types
├── lib/            # Utility helpers
├── pages/          # Route pages
├── services/       # Business logic layer
├── store/          # Zustand state management
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
└── workers/        # Web workers

docker/
├── kong/kong.yml               # API gateway routes
└── postgres/init/              # First-run DB setup scripts
    ├── 01-restore-backup.sh    # Restores the pg_dumpall backup
    └── 02-post-restore.sql     # Drops unused schemas + wires up roles/grants

scripts/
└── reset-db.sh     # Full DB reset helper
```
