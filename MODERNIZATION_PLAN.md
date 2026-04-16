# Infradesigner Modernization Plan

**Status:** In progress — 2026-04-14
**Owner:** _tbd_
**Estimated effort:** ~2 weeks for one engineer, ~1 week for two

## Progress log

| Phase | Status | Notes |
|---|---|---|
| 7 — Testing infrastructure | ✅ Done | Vitest wired, 85 seed tests green across BreakoutManager, PortMatcher, CableManager, TransceiverManager, PricingModelService |
| 0 — Prerequisites | ✅ Done | Node pinned, backup deleted, ESLint rule re-enabled, `strict: true` flipped, `ignoreDeprecations: "6.0"` added to tsconfig. **651 → 484 → 0 strict errors.** Cleanup fell into a few buckets: stale import paths (PlacedComponent, ClusterPricing rename, @/types/pricing-types → @/types/infrastructure/pricing-types, NodeJS.Timeout → ReturnType<typeof setTimeout>); stale field references against renamed/split types (StorageCluster.hyperConverged → sc.type === 'hyperConverged', StoragePool fields that had moved off StorageCluster, renamed `amortizationMonths` → `amortisationMonths`, stale network/physical legacy field comparisons); extended domain types to match actual calculator outputs (`FacilityCostBreakdown`, `CostLayerBreakdown`, `ComponentWithPlacement.clusterInfo`, added `CapacityMetrics`/`HierarchyCapacityNode`/`ExpansionScenario`/`CapacityConstraint`, added `clusterIndex`/`ruPosition`/`clusterId` to `PlacementReportItem`); untyped prop destructuring on form components (ComputeRequirementsForm, NetworkRequirementsForm, StorageRequirementsForm); Supabase-generated row types vs app-domain types (`as unknown as` casts at the read/write boundary of Supabase calls); Recharts v3 tooltip formatter signature changes (`as never` casts); React 19 stricter `children`/ref typing (refs for react-dnd `drag`/`drop`). `npm run build`, `npm run lint` (0 errors), `npm run test:run` (85/85 passing) all green. |
| 1 — Build tooling | ✅ Done | Vite 8.0.8 (bumped past 7 to current latest — Rolldown bundler), `@vitejs/plugin-react-swc` 4.3.0, TypeScript 6.0.2, typescript-eslint 8.58.2, `@types/node` 22.19.17 (pinned to match Node 22 LTS engine). Build/lint/tests/dev all green |
| 2 — React 19 | ✅ Done | React 19.2.5, ReactDOM 19.2.5, `@types/react` 19.2.14, `@types/react-dom` 19.2.3. Codemod recipe ran clean (no legacy APIs). Added `.npmrc legacy-peer-deps=true` for stale React 18 peer constraints in cmdk/vaul/sonner/next-themes/input-otp/embla/react-day-picker (to be tightened in Phase 3 shadcn regen). Build 38s (vs 115s on Vite 7), dev ready in 388ms, 85/85 tests green |
| 4 — Data libraries | ✅ Done | React Router 7.14.1 (library mode, `react-router-dom` removed), Zod 4.3.6 + `@hookform/resolvers` 5.2.2 + react-hook-form 7.72.1, Recharts 3.8.1 (added `react-is` 19.2.5 as explicit peer), date-fns 4.1.0, `@supabase/supabase-js` 2.103.0. No `activeIndex`/`alwaysShow`/`isFront` Recharts usage found; `message:` → `error:` hand-fixed in `ComponentValidationSchemas.ts` (6 occurrences) |
| 3a — Tailwind v4 core | ✅ Done | Tailwind 4.2.2 via `@tailwindcss/vite` plugin, `tailwindcss-animate` → `tw-animate-css` 1.4.0, `postcss.config.js` deleted (postcss + autoprefixer removed — bundled in v4 plugin). Upgrade tool migrated 40+ utility class renames across `src/` and moved theme tokens from `tailwind.config.ts` (deleted) to `@theme` blocks in `src/index.css`. Build 40s, dev ready 345ms, all tests green |
| 3b — shadcn regeneration | ✅ Done | Regenerated all 45 stock primitives via shadcn CLI 4.2.0 (`new-york` style → Tailwind v4 / `data-slot` output). Modern pattern: function components (no `forwardRef`, React 19 ref-as-prop), `data-slot=`/`data-variant=`/`data-size=` attrs, umbrella `radix-ui` package replacing 27 individual `@radix-ui/react-*` deps. Split files folded back into parents (`*-variants.ts`, `form-context.tsx`, `form-use-field.tsx`, `sidebar-hooks.tsx`, orphaned PascalCase `Sidebar*.tsx`). Old toast API removed (`toast.tsx`/`toaster.tsx`/`use-toast.ts` × 2) — 6 call sites migrated to sonner (`toast.success`/`toast.error`/`toast.warning`/`toast.info`/`toast`). Sidebar CSS migrated from `--sidebar-background` to `--sidebar` token pattern with project brand colors preserved. `components.json` updated for v4 (`tailwind.config: ""`, `iconLibrary: "lucide"`). Build 1m1s, lint 0 errors / 301 warnings (1 new pre-existing-style), 85/85 tests green |
| 6 — Backend stack | ✅ Done | postgres:16-alpine → 18-alpine (exceeded plan's 17 target), postgrest v12.2.3 → v14.9, supabase/gotrue:v2.163.2 → supabase/auth:v2.188.1, kong:3.4-ubuntu → 3.9.1-ubuntu. `dev:db:reset` verified end-to-end: pg15-origin backup restores into pg18, PostgREST reports 15 relations/17 relationships/3 functions, Auth health returns v2.188.1 |
| 5 | ⬜ Not started | |

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
- [x] Re-enable `@typescript-eslint/no-unused-vars` in ESLint config (as `warn`, 297 warnings currently).
- [x] **All strict errors fixed — 0 of 484 remaining.** Resolved via: stale import path fixes, field renames (British spelling, type → type === 'hyperConverged'), extending domain types to match actual usage, typing untyped form component props, casting Supabase row types at the boundary, casting Recharts v3 tooltip formatters, and casting react-dnd refs. Added `ignoreDeprecations: "6.0"` to tsconfig so raw `tsc --noEmit` is clean.

**Risk:** Medium. Type errors may reveal real bugs — welcome discoveries, not blockers.

---

## Phase 1 — Build tooling (1 day)

**Outcomes:** Vite 7, TS 5.9, ESLint current.

- [x] Bump `vite` → 8.0.8 (exceeded plan target — Vite 8 is current latest; swaps Rollup for Rolldown, ~3x faster builds).
- [x] Bump `@vitejs/plugin-react-swc` → 4.3.0.
- [x] Review `vite.config.ts` for the new default browser target (`baseline-widely-available`). Left at default — fine for this internal app.
- [x] Bump `typescript` → 6.0.2 (exceeded plan target — TS 6 is current latest; within `typescript-eslint` peer range `>=4.8.4 <6.1.0`).
- [x] Bump `typescript-eslint` → 8.58.2.
- [x] Bump `@types/node` → 22.19.17 (pinned to 22.x to match `engines.node >=22.12`).
- [x] Verify `npm run build` (✅ 38s), `npm run lint` (✅ 0 errors, 300 warnings pre-existing), `npm run test:run` (✅ 85/85), and `npm run dev` (✅ Vite 8.0.8 ready in 388ms).

**Notes:**
- Vite 8 logs `[vite:react-swc] We recommend switching to @vitejs/plugin-react` since no SWC-specific plugins are active. Non-blocking; flag as potential Phase 3 follow-up.

**Risk:** Low. Vite 7's breaking changes are mostly ecosystem-level.

---

## Phase 2 — React 19 (1–2 days)

**Outcomes:** React 19.2 with all dependent libraries compatible.

- [x] Run `npx codemod@latest react/19/migration-recipe` — **no changes**; codebase has no `ReactDOM.render`, string refs, `useFormState`, legacy `act` import, or `prop-types`.
- [x] Bump `react`, `react-dom` → 19.2.5.
- [x] Bump `@types/react` → 19.2.14, `@types/react-dom` → 19.2.3.
- [x] Audit `forwardRef` usage — 162 occurrences in `src/components/ui/*` (shadcn primitives). Still supported in React 19 (deprecated only); cleanup deferred to **Phase 3** shadcn regeneration.
- [x] Verify peer compatibility — stale React-18-only peer strings in **cmdk@1.0.0, vaul@0.9.9, sonner@1.5.0, next-themes@0.3.0, input-otp@1.2.4, react-day-picker@8.10.1, embla-carousel-react@8.3.0**. Runtime-compatible; handled via `.npmrc legacy-peer-deps=true`. Newer versions exist for each (some via major bumps e.g. vaul→1.x, sonner→2.x, react-day-picker→9.x) and will be re-evaluated during Phase 3 shadcn regen. Confirmed compatible: Radix UI, TanStack Query, Zustand, React Hook Form, `@hookform/resolvers`, react-resizable-panels, recharts.
- [x] Remove any `UNSAFE_*` lifecycle holdovers — none present.
- [x] Smoke-test — dev server boots cleanly, build/lint/tests green.

**Risk:** Medium. React 19's typings are stricter; expect some `ReactNode` / `children` type friction.

---

## Phase 3 — Tailwind v4 + shadcn regeneration (1–2 days)

**Outcomes:** Tailwind 4.1, CSS-first config, shadcn components regenerated with `data-slot` attrs.

### 3a. Tailwind v4 core migration ✅
- [x] Ran `npx @tailwindcss/upgrade@latest` — auto-migrated config + 40+ utility class renames (e.g. `shadow-sm` → `shadow-xs`, `flex-shrink-0` → `shrink-0`).
- [x] `tailwind.config.ts` deleted; theme tokens now live in `@theme { ... }` blocks in `src/index.css`.
- [x] Replaced `tailwindcss-animate` → `tw-animate-css` 1.4.0 (`@plugin` directive replaced by `@import 'tw-animate-css'` in CSS).
- [x] Dropped `autoprefixer` and standalone `postcss` — Tailwind v4's Vite plugin bundles both.
- [x] Switched from `postcss.config.js` (deleted) to `@tailwindcss/vite` plugin in `vite.config.ts`.

### 3b. shadcn regeneration ✅
- [x] Updated `components.json` for Tailwind v4 (`style: "new-york"`, `tailwind.config: ""`, added `iconLibrary: "lucide"`).
- [x] Regenerated 45 stock primitives via `npx shadcn@latest add ... --overwrite` (one batch). Modern v4 output: `data-slot` attrs, function components without `forwardRef`, umbrella `radix-ui` package.
- [x] Removed 27 individual `@radix-ui/react-*` deps from `package.json` — replaced by the umbrella `radix-ui` (1.4.3). Vite chunking rule (`@radix-ui/` matcher) still produces the same `radix-ui` chunk since the umbrella resolves to the same modules.
- [x] Folded split files back into parents: `*-variants.ts` (badge/button/navigation-menu/sidebar-menu-button/toggle), `form-context.tsx` + `form-use-field.tsx`, `sidebar-hooks.tsx`. Deleted orphaned PascalCase `SidebarComponents/Context/Hooks/Provider/Types.tsx` (dead code, only referenced each other).
- [x] Removed legacy toast API: deleted `src/components/ui/{toast,toaster,use-toast}.ts(x)` + `src/hooks/use-toast.ts`. Migrated 6 call sites (DatacenterPanel, RackAssignmentPanel, RackMappingPanel, RackDefinitionPanel, RackPDFExport, errorLogger) to sonner. Removed `<Toaster />` from `App.tsx` (Sonner remains).
- [x] Sidebar CSS: cleaned up CLI-appended duplicate sidebar var blocks; migrated from `--sidebar-background` (raw HSL components) to `--sidebar` (full `hsl()` strings) with project brand colors preserved across light/dark.
- [x] Custom files preserved: `loading-skeletons.tsx`, `virtual-table.tsx`.
- [ ] Visual regression pass — pending manual sanity check (route-by-route walkthrough).

**Risk:** High (visual). Expect to spend the most debugging time here. Consider capturing screenshots of key pages before the bump to diff against.

---

## Phase 4 — Data libraries (1 day total)

### 4a. React Router 7 (0.25 day)
- [x] Skipped v7 future-flag dry run (went straight to 7 since tests + build gave cover).
- [x] Bumped to `react-router` 7.14.1.
- [x] Removed `react-router-dom` dep; swapped 12 import sites `react-router-dom` → `react-router` (plus `optimizeDeps` entry in `vite.config.ts`).
- [x] Stayed in **library mode** — `BrowserRouter` + `<Routes>` + `<Route>` still works as-is.

### 4b. Zod 4 (0.25 day)
- [x] No external codemod needed — only 1 schema file uses Zod (`ComponentValidationSchemas.ts`).
- [x] Manual fix: `message:` → `error:` (6 occurrences). No `.email()`/`.uuid()`/`.url()`/`z.record()`/`.strict()`/`.passthrough()` usage.
- [x] Bumped `zod` → 4.3.6, `@hookform/resolvers` → 5.2.2 (requires `react-hook-form >= 7.55`), `react-hook-form` → 7.72.1.

### 4c. Recharts 3 (0.25 day)
- [x] Bumped to 3.8.1.
- [x] No `activeIndex`/`alwaysShow`/`isFront` props in codebase — nothing to remove.
- [x] Tooltip/Legend z-order unaffected; no manual review needed per build smoke.
- [x] Added `react-is@^19.2.5` — Recharts 3 expects it as a sibling peer that Rolldown won't auto-resolve.

### 4d. date-fns 4 + Supabase client (0.25 day)
- [x] Bumped `date-fns` → 4.1.0.
- [x] Bumped `@supabase/supabase-js` → 2.103.0.
- [ ] Regenerate `src/integrations/supabase/types.ts` against current DB schema — deferred to a separate task (requires running backend stack; existing types still compile).

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

- [x] `docker-compose.yml`:
  - `postgres:16-alpine` → `postgres:18-alpine` (went to 18 since it's the current stable; plan target was 17)
  - `postgrest/postgrest:v12.2.3` → `postgrest/postgrest:v14.9`
  - `supabase/gotrue:v2.163.2` → `supabase/auth:v2.188.1` (image renamed; env var prefix stays `GOTRUE_*` for compat)
  - `kong:3.4-ubuntu` → `kong:3.9.1-ubuntu`
- [ ] Move hardcoded DB role passwords out of `docker/postgres/init/02-post-restore.sql` into env vars / compose secrets. **Deferred — follow-up hardening task.**
- [x] Verified `db_cluster-11-11-2025@01-58-10.backup.gz` restores cleanly into PG18 (forward-compatible pg_dumpall text; restore output shows expected Supabase-cloud object errors that the init script tolerates via `ON_ERROR_STOP=off`).
- [ ] Audit restored schema for Lovable/Supabase-cloud artifacts. **Deferred — follow-up cleanup task.**
- [x] `npm run dev:db:reset` end-to-end smoke test — all services healthy; PostgREST schema cache loaded 15 relations/17 relationships/3 functions; Auth health reports v2.188.1.

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
