# Infra Design Tool

A network infrastructure design application for designing, configuring, and analyzing data center and network infrastructure deployments. Features include component selection, rack layout visualization, cost analysis, power calculations, and design comparison.

## Tech Stack

- **React 18** + TypeScript
- **Vite** (SWC) for build tooling
- **Zustand** for state management
- **Supabase** for authentication and database
- **shadcn/ui** (Radix UI + Tailwind CSS)
- **React Router v6** for routing
- **TanStack Query** for data fetching
- **Recharts** + **Plotly.js** for visualization

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Setup

```sh
# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:8080`.

### Build

```sh
# Production build
npm run build

# Preview the production build
npm run preview
```

### Lint

```sh
npm run lint
```

## Project Structure

```
src/
├── components/     # UI components organized by feature
├── context/        # React context providers
├── data/           # Static data and constants
├── hooks/          # Custom React hooks
├── integrations/   # Supabase client and generated types
├── lib/            # Utility helpers
├── pages/          # Route pages
├── services/       # Business logic layer
├── store/          # Zustand state management
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
└── workers/        # Web workers
```

## Deployment

Build the project with `npm run build` and deploy the `dist/` directory to any static hosting provider (Netlify, Vercel, Cloudflare Pages, etc.).

The app requires a Supabase backend. Configure the Supabase URL and anon key in `src/integrations/supabase/client.ts`.
