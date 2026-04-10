# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

**Infra Design Tool** - A network infrastructure design application for designing, configuring, and analyzing data center deployments. Features include component selection, rack layout visualization, cost analysis, power calculations, and design comparison.

**Project Goal**: Refactor to remove all Lovable platform dependencies so the project can be developed and deployed independently.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (Vite, port 8080)
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

## Testing

No test framework is currently configured. Verify changes by running `npm run build` and `npm run lint` before committing.

## Architecture

### Tech Stack
- **React 18** + TypeScript
- **Vite** for build tooling (SWC plugin)
- **Zustand** for state management (modular slice pattern)
- **Supabase** for auth and database
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

## Lovable Dependencies to Remove

These are the Lovable-specific artifacts that need to be cleaned up:

1. **`lovable-tagger`** - Dev dependency in `package.json`, imported in `vite.config.ts` as `componentTagger` plugin
2. **GPT Engineer script** - `index.html` loads `https://cdn.gpteng.co/gptengineer.js`
3. **Lovable meta tags** - `index.html` has og:image and twitter tags pointing to `lovable.dev`
4. **`lovable-uploads/`** - `public/lovable-uploads/` contains logo images referenced by `HeaderLogo.tsx`
5. **README.md** - Entirely Lovable-centric (references Lovable project URL, deployment via Lovable)
6. **Supabase client comment** - `src/integrations/supabase/client.ts` has "automatically generated" comment (cosmetic)
7. **`bun.lockb`** - Bun lockfile (project uses npm/`package-lock.json`)

### What is NOT a Lovable dependency
- **Supabase** - Genuine backend dependency, not Lovable-specific. Keep as-is.
- **shadcn/ui** - Standard component library. Keep as-is.
- **`components.json`** - shadcn/ui config. Keep as-is.

## Key Services

- **Connection Service** (`services/connectionService.ts`): Network topology and connection rules
- **Placement Service** (`services/automatedPlacementService.ts`): Automatic rack placement
- **Design Calculator** (`store/calculations/designCalculator.ts`): All design calculations
- **Component Service** (`services/componentService.ts`): Component CRUD
- **Design Service** (`services/designService.ts`): Design persistence
- **Datacenter Services** (`services/datacenter/`): Facility costs, power, capacity
