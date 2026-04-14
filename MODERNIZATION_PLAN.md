# Infradesigner Modernization Plan

**Status:** In progress — 2026-04-14
**Owner:** _tbd_
**Estimated effort:** ~2 weeks for one engineer, ~1 week for two

## Progress log

| Phase | Status | Notes |
|---|---|---|
| 7 — Testing infrastructure | ✅ Done | Vitest wired, 85 seed tests green across BreakoutManager, PortMatcher, CableManager, TransceiverManager, PricingModelService |
| 0 — Prerequisites | 🟡 Partial | Node pinned, backup deleted, ESLint rule re-enabled, `strict: true` flipped. 651 → 428 strict errors via type widening; remaining 428 deferred (many will be reshaped by Phase 2/4 migrations) |
| 1–6 | ⬜ Not started | |

## Goal

Bring the stack current (React 19, Vite 7, Tailwind 4, Postgres 17, etc.), flip TypeScript `strict` on, and establish a test harness — so the codebase is safe to refactor and extend. Lovable decoupling is already code-complete; this plan finishes the modernization.

## Version targets

| Layer | Component | Current | Target |
|---|---|---|---|
| Runtime | Node | (unpinned) | **22 LTS** (≥22.12) |
| Framework | React / React DOM | 18.3.1 | **19.2.x** |
| Framework | React Router | 6.26 | **7.x** (library mode) |
| Build | Vite | 5.4 | **7.x** |
| Build | `@vitejs/plugin-react-swc` | 3.5 | latest |
| Build | TypeScript | 5.5 | **5.9+** (`strict: true`) |
| Styling | Tailwind CSS | 3.4 | **4.1** |
| Styling | `tailwindcss-animate` | 1.0 | **`tw-animate-css`** |
| Styling | shadcn/ui components | — | regenerated via CLI |
| Data | Zod | 3.23 | **4.x** |
| Data | TanStack Query | 5.56 | latest 5.x |
| Data | Zustand | 5.0 | latest 5.x |
| Data | `@supabase/supabase-js` | 2.53 | latest 2.x |
| Charts | Recharts | 2.12 | **3.x** |
| Charts | Plotly / react-plotly | 2.35 / 2.6 | latest |
| Utils | date-fns | 3.6 | **4.x** |
| DnD | react-dnd (+ html5-backend) | 16.0 | **`@dnd-kit/core` + `@dnd-kit/sortable`** |
| Linting | ESLint | 9.9 | latest 9.x |
| Linting | typescript-eslint | 8.0 | latest 8.x |
| Testing | _(none)_ | — | **Vitest + Testing Library** |
| DB | Postgres | 16-alpine | **17-alpine** |
| API | PostgREST | v12.2.3 | **v14.x** |
| Auth | `supabase/gotrue` | v2.163.2 | **`supabase/auth:v2.188+`** (image renamed) |
| Gateway | Kong | 3.4-ubuntu | 3.9+ |

## Guiding principles

- **Tests before migrations.** Phase 7 work (Vitest + core calculator tests) lands first so every subsequent phase has a regression net.
- **One phase per PR.** Codemods + manual fixes in a single mergeable unit; revert-friendly.
- **Codemod first, hand-fix second.** React, Zod, and Tailwind all ship codemods — run them before touching code manually.
- **No feature work during migration.** Reduces merge pain.

---

## Phase 0 — Prerequisites (0.5 day)

**Outcomes:** Node pinned, dead code removed, TypeScript strict on.

- [x] Add `.nvmrc` pinning Node 22 LTS.
- [x] Add `"engines": { "node": ">=22.12" }` to `package.json`.
- [x] Delete `.original.tsx` backup files (e.g. `PowerPredictionTab.original.tsx`).
- [x] Flip `tsconfig.app.json`:
  - `"strict": true`
  - `"noImplicitAny": true`
  - `"noUnusedLocals": true` (optional, can stage later) — deferred, currently `false`
- [x] Re-enable `@typescript-eslint/no-unused-vars` in ESLint config (as `warn`, 301 warnings surfaced).
- [ ] **Partial — 428 of original 651 errors remain.** Reduced via type widening of `InfrastructureComponent`, `DesignRequirements`, `PowerEfficiencyMetrics`, `RedundancyConfig`, `NonProductiveLoad`; added `Rack` and `PowerLayerUtilization` types. Deferred: real code fixes across ~80 files, many of which will be reshaped by Phase 2 (React 19) / Phase 4 (Zod 4) migrations.

**Risk:** Medium. Type errors may reveal real bugs — welcome discoveries, not blockers.

---

## Phase 1 — Build tooling (1 day)

**Outcomes:** Vite 7, TS 5.9, ESLint current.

- [ ] Bump `vite` → 7.x.
- [ ] Bump `@vitejs/plugin-react-swc` → latest.
- [ ] Review `vite.config.ts` for the new default browser target (`baseline-widely-available`). Explicitly set if you need the old `modules` target.
- [ ] Bump `typescript` → 5.9+.
- [ ] Bump `typescript-eslint` → latest 8.x.
- [ ] Bump `@types/node` → 22.x.
- [ ] Verify `npm run build` and `npm run dev` still work.

**Risk:** Low. Vite 7's breaking changes are mostly ecosystem-level.

---

## Phase 2 — React 19 (1–2 days)

**Outcomes:** React 19.2 with all dependent libraries compatible.

- [ ] Run `npx codemod@latest react/19/migration-recipe`.
- [ ] Bump `react`, `react-dom` → 19.2.
- [ ] Bump `@types/react`, `@types/react-dom` → 19.
- [ ] Audit `forwardRef` usage — refs are now regular props; codemod should handle most.
- [ ] Verify peer compatibility: Radix UI primitives, TanStack Query, Zustand, React Hook Form, react-hook-form/resolvers, cmdk, vaul, sonner.
- [ ] Remove any `UNSAFE_*` lifecycle holdovers (unlikely in this codebase).
- [ ] Smoke-test all routes.

**Risk:** Medium. React 19's typings are stricter; expect some `ReactNode` / `children` type friction.

---

## Phase 3 — Tailwind v4 + shadcn regeneration (1–2 days)

**Outcomes:** Tailwind 4.1, CSS-first config, shadcn components regenerated with `data-slot` attrs.

- [ ] Run `npx @tailwindcss/upgrade@next`.
- [ ] Migrate `tailwind.config.ts` theme tokens into CSS `@theme { ... }` blocks.
- [ ] Replace `tailwindcss-animate` → `tw-animate-css` in `package.json` and CSS imports.
- [ ] Drop `autoprefixer` and `postcss` standalone — Tailwind v4 bundles both via its Vite plugin.
- [ ] Switch from `postcss.config.js` to the `@tailwindcss/vite` plugin in `vite.config.ts`.
- [ ] Regenerate shadcn components with the current CLI (pulls in Tailwind v4 output with `data-slot` styling hooks).
- [ ] Audit custom overrides in `src/components/ui/` — merge into regenerated components.
- [ ] Visual regression pass across all routes.

**Risk:** High (visual). Expect to spend the most debugging time here. Consider capturing screenshots of key pages before the bump to diff against.

---

## Phase 4 — Data libraries (1 day total)

### 4a. React Router 7 (0.25 day)
- [ ] On v6, enable all future flags: `v7_startTransition`, `v7_relativeSplatPath`, `v7_fetcherPersist`, `v7_normalizeFormMethod`, `v7_partialHydration`, `v7_skipActionErrorRevalidation`.
- [ ] Bump to `react-router` 7.
- [ ] Remove `react-router-dom` dep; global search-replace imports `react-router-dom` → `react-router`.
- [ ] Stay in **library mode** (no framework-mode migration — we're a SPA).

### 4b. Zod 4 (0.25 day)
- [ ] Run `npx @zod/codemod --transform v3-to-v4 --dry-run ./src`, review, apply.
- [ ] Manual fixes:
  - `z.string().email()` → `z.email()`, `.uuid()` → `z.uuid()` (RFC 4122) or `z.guid()` (v3 compat), `.url()` → `z.url()`
  - `z.record(v)` → `z.record(k, v)` (now requires key schema)
  - `.strict()` / `.passthrough()` → `z.strictObject()` / `z.looseObject()`
  - Error customization: `message` → `error` parameter
- [ ] Bump `@hookform/resolvers` to Zod 4–compatible version.

### 4c. Recharts 3 (0.25 day)
- [ ] Bump to 3.x.
- [ ] Audit/remove `activeIndex`, `alwaysShow`, `isFront` props.
- [ ] Fix JSX order where Tooltip/Legend overlap (z-index is render-order in v3).
- [ ] Review charts in `CostBreakdownChart`, `PowerBreakdownChart`, etc.

### 4d. date-fns 4 + Supabase client (0.25 day)
- [ ] Bump `date-fns` → 4.x (mostly drop-in; timezone handling now first-class).
- [ ] Bump `@supabase/supabase-js` → latest 2.x.
- [ ] Regenerate `src/integrations/supabase/types.ts` against current DB schema.

**Risk:** Low–Medium.

---

## Phase 5 — DnD replacement: react-dnd → dnd-kit (2–3 days, optional)

**Outcomes:** Modern, actively-developed DnD, smaller bundle, better accessibility.

- [ ] Inventory all `react-dnd` usage (rack layout, component palette, placement workspace).
- [ ] Install `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.
- [ ] Rewrite drag sources/targets using `useDraggable`/`useDroppable` hooks.
- [ ] Port custom drag layers to dnd-kit's `DragOverlay`.
- [ ] Remove `react-dnd`, `react-dnd-html5-backend` deps.

**Risk:** High (functional). Touches rack-placement UX which is core to the product. Can be deferred and shipped as a separate release.

---

## Phase 6 — Backend stack (0.5 day)

**Outcomes:** Postgres 17, PostgREST v14, Auth v2.188, Kong 3.9.

- [ ] `docker-compose.yml`:
  - `postgres:16-alpine` → `postgres:17-alpine`
  - `postgrest/postgrest:v12.2.3` → `postgrest/postgrest:v14.x`
  - `supabase/gotrue:v2.163.2` → `supabase/auth:v2.188+` (image renamed — repo is now `supabase/auth`)
  - `kong:3.4-ubuntu` → `kong:3.9-ubuntu`
- [ ] Move hardcoded DB role passwords out of `docker/postgres/init/02-post-restore.sql` into env vars / compose secrets.
- [ ] Verify `db_cluster-11-11-2025@01-58-10.backup.gz` restores cleanly into PG17 (format is forward-compatible; test first).
- [ ] Audit restored schema for Lovable/Supabase-cloud artifacts (lingering functions, triggers, RLS policies) — drop what's unused.
- [ ] `npm run dev:db:reset` end-to-end smoke test.

**Risk:** Low. Postgres minor-major upgrades via pg_dump are well-trodden.

---

## Phase 7 — Testing infrastructure (2–3 days, **do first**)

**Outcomes:** Vitest wired, regression coverage on calculator cores.

- [x] Install `vitest`, `@vitest/ui`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`.
- [x] Add `vitest.config.ts` (jsdom env, `@/` alias, setup file for jest-dom matchers).
- [x] Add `"test": "vitest"`, `"test:run": "vitest run"`, `"test:ui": "vitest --ui"` scripts.
- [x] Seed test suites — **85 tests passing**:
  - [x] `src/services/connection/` — BreakoutManager (19), PortMatcher (23), CableManager (15), TransceiverManager (12). Covers cable length estimation, port filtering, breakout validation, transceiver compatibility.
  - [x] `src/services/pricing/pricingModelService.ts` — 15 tests covering getConfig, cluster discovery, capacity calculation (oversubscription + HA + virt overhead), pricing integration.
  - [ ] `src/store/calculations/designCalculator.ts` — deferred (heavy Zustand store mocking required).
  - [ ] `src/services/automatedPlacementService.ts` — deferred (needs full design fixtures + RackService mock).
- [ ] Add `npm run test:run` to CI if/when CI exists.

**Risk:** Low (new code). High **value** — this is the safety net for every other phase.

---

## Cross-cutting concerns

### Bundle size watch
- Plotly.js contributes ~700KB gzip for one 3D viz (`PricingVisualization3D.tsx`). Decide during Phase 3 whether to keep or remove.
- html2canvas + jsPDF are fragile for PDF export; flag for future replacement (not in this plan).

### Monolithic files to split (post-modernization)
Not in scope for this plan, but flag for follow-up:
- `src/services/pricing/pricingModelService.ts` (1496 LOC)
- `src/components/.../PricingModelTab.tsx` (1327 LOC)
- `src/services/connection/ConnectionGenerator.ts` (719 LOC)
- `src/store/slices/design/index.ts` (648 LOC)

### Documentation updates
- [ ] Update `CLAUDE.md` version table.
- [ ] Update `README.md` backend service versions.
- [ ] Update deployment notes for Node 22 requirement.

---

## Recommended execution order

```
7 (tests)  →  0 (prereqs)  →  1 (build)  →  2 (React 19)  →
4 (data libs)  →  3 (Tailwind/shadcn)  →  6 (backend)  →  5 (DnD, optional)
```

Rationale: tests first = safety net. Tailwind/shadcn after React 19 because shadcn regen depends on React 19 APIs. DnD last because it's the most invasive functional change and easiest to defer.

## Definition of done

- [ ] All listed version bumps applied.
- [ ] `npm run build`, `npm run lint`, `npm run test:run` all green.
- [ ] TypeScript `strict: true` with zero errors.
- [ ] All routes render and core flows work (design → configure → results → compare).
- [ ] `docker compose up -d` bootstraps clean from the backup file.
- [ ] `CLAUDE.md` and `README.md` reflect the new stack.

## Out of scope (follow-up work)

- Splitting the four monolithic files flagged above.
- Replacing html2canvas/jsPDF with a server-side PDF renderer.
- Postgres schema cleanup beyond Lovable artifact removal.
- Full test coverage beyond calculator cores.
- CI/CD pipeline setup.
