# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

**Infra Design Tool** - A network infrastructure design application for designing, configuring, and analyzing data center deployments. Features include component selection, rack layout visualization, cost analysis, power calculations, and design comparison.

**Project Goal**: Refactor to remove all Lovable platform dependencies so the project can be developed and deployed independently.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev:db       # Start local backend stack (postgres + postgrest + gotrue + kong + mailpit)
npm run dev          # Start Vite dev server on port 8080
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # Run ESLint
npm run preview      # Preview production build

# Backend stack management
npm run dev:db:stop    # Stop stack (data persists in volume)
npm run dev:db:reset   # Nuke volume, re-restore from backup
npm run dev:db:logs    # Tail all container logs
```

The backend stack is defined in `docker-compose.yml`. Kong on `:54321` fronts PostgREST (at `/rest/v1`) and GoTrue (at `/auth/v1`), matching Supabase's URL shape so the `@supabase/supabase-js` client works unchanged.

## Testing

No test framework is currently configured. Verify changes by running `npm run build` and `npm run lint` before committing.

## Architecture

### Tech Stack
- **React 18** + TypeScript
- **Vite** for build tooling (SWC plugin)
- **Zustand** for state management (modular slice pattern)
- **PostgreSQL** (vanilla) + **PostgREST** (REST API) + **GoTrue** (auth), self-hosted via Docker Compose. The `@supabase/supabase-js` client points at a Kong gateway so queries/auth work unchanged.
- **shadcn/ui** (Radix UI + Tailwind CSS)
- **React Router v6** for routing
- **React Hook Form + Zod** for forms/validation
- **TanStack Query** for data fetching
- **Recharts** + **Plotly.js** for visualization
- **React DND** for drag-and-drop
- **jsPDF + html2canvas** for PDF export

### Directory Structure
```
src/
├── components/        # UI components by feature area
│   ├── ui/           # shadcn/ui base components
│   ├── layout/       # App layout, header, sidebar
│   ├── requirements/ # Requirements input
│   ├── design/       # Visual design workspace
│   ├── configure/    # Connection rules, rack layouts
│   ├── results/      # Analysis results, BOM
│   ├── compare/      # Design comparison
│   ├── model/        # Model analysis
│   ├── datacenter/   # Datacenter management
│   └── ...
├── context/          # React context providers
├── data/             # Static data/constants
├── hooks/            # Custom hooks organized by feature
├── integrations/     # Supabase client + generated types
├── lib/              # Utilities (supabase helper, cn util)
├── pages/            # Route pages (Auth, Index, NotFound)
├── services/         # Business logic layer
│   ├── connection/   # Network topology, cables, transceivers
│   ├── datacenter/   # Facility costs, power, capacity
│   ├── placement/    # Automated rack placement
│   └── pricing/      # Pricing model services
├── store/            # Zustand state management
│   ├── slices/       # Modular store slices
│   ├── calculations/ # Design calculator
│   └── initialization/
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
└── workers/          # Web workers for background processing
```

### State Management (Zustand Slices)
- **Requirements**: Compute, storage, network, physical requirements
- **Design**: Current design state, placed components, connections
- **Component Library**: Available components and templates
- **Workspace**: UI state and workspace interactions
- **Facilities**: Datacenter facility management

### Route Structure
- `/` - Requirements input (protected)
- `/components` - Component library (protected)
- `/design` - Visual design workspace (protected)
- `/configure` - Connection rules, rack layouts (protected)
- `/datacenter` - Datacenter management (protected)
- `/results` - Analysis results and BOM (protected)
- `/procure` - Procurement (protected)
- `/compare` - Design comparison (protected)
- `/model` - Model analysis (protected)
- `/auth` - Authentication
- `/designs/:sharingId` - Shared design view (public)

### Data Flow
1. Requirements change -> Role calculation -> Component sizing -> Cost/power analysis
2. Design changes -> Debounced save (500ms) -> Supabase persistence

## Code Conventions

- Path alias `@/` maps to `./src/`
- PascalCase for component files, camelCase for utilities
- Tailwind CSS with custom design tokens
- Form validation uses Zod schemas
- One component per file, function components with hooks
- Lazy loading for heavy panel components
- Error boundaries around critical UI sections
- ESLint: `@typescript-eslint/no-unused-vars` is off

## Backend architecture (post-Supabase migration)

The app still uses `@supabase/supabase-js` as its client library because both PostgREST and GoTrue implement the same wire protocols Supabase does. But the backend is now vanilla infrastructure:

- **Postgres 16** (alpine image) — the DB itself, data volume-mounted
- **PostgREST** — serves the REST API at `/rest/v1`
- **GoTrue** — handles signup/signin/JWT at `/auth/v1`
- **Kong** — API gateway on port 54321, fronts both of the above
- **Mailpit** — dev-only SMTP capture (browse at `:8025`)

JWT auth: all services share `JWT_SECRET`. The anon key is a JWT signed with that secret, `role: anon`. Existing users and data are preserved from the `db_cluster-11-11-2025@01-58-10.backup.gz` snapshot.

### Switching to external Postgres

Only env vars change — no code. See README.md § "Switching to an external/hosted Postgres".

### Init script order

`docker/postgres/init/` executes alphabetically on first container start:
1. `01-restore-backup.sh` — pipes the gzipped pg_dumpall through psql
2. `02-post-restore.sql` — drops unused Supabase-cloud schemas (pgsodium, vault, realtime, storage, graphql), sets role passwords, wires up PostgREST role hierarchy, strips role configs referencing libraries we don't ship (e.g. `safeupdate`)

## Key Services

- **Connection Service** (`services/connectionService.ts`): Network topology and connection rules
- **Placement Service** (`services/automatedPlacementService.ts`): Automatic rack placement
- **Design Calculator** (`store/calculations/designCalculator.ts`): All design calculations
- **Component Service** (`services/componentService.ts`): Component CRUD
- **Design Service** (`services/designService.ts`): Design persistence
- **Datacenter Services** (`services/datacenter/`): Facility costs, power, capacity
