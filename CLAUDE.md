# CLAUDE.md

This file documents conventions and context for AI-assisted development on this project.

## Project Overview

MLS Fire — a Nuxt 4 (Vue 3) app showing real-time MLS scores, standings, stats, and match details. Deployed on Netlify. Data sourced from ESPN's unofficial public API via Nuxt server routes.

## Tech Stack

- **Framework**: Nuxt 4.4.6, Vue 3, `<script setup lang="ts">`
- **Styling**: Tailwind CSS v4 + scoped component CSS. `oklab()` / `oklch()` color functions used throughout.
- **Package manager**: pnpm
- **Deployment**: Netlify (Nitro preset)

## Key Conventions

### Colors

All colors use `oklab()` or `oklch()` — do not introduce `rgb()`, `hsl()`, or hex colors.

### Component structure

- `<script setup lang="ts">` only — no Options API, no `defineComponent`.
- Props typed with `defineProps<{...}>()`, emits with `defineEmits<{...}>()`.
- No comments unless the _why_ is non-obvious (hidden constraint, workaround, etc.).

### CSS

- All component styles are scoped (`<style scoped>`).
- Responsive breakpoints use `max-width` media queries, consistent thresholds: `425px`, `599px`, `768px`.
- `--modal-copy-size` CSS variable controls font size inside modals.

### Constants

- Shared config (dates, flags) lives in `app/constants/mls.ts`, not hardcoded in components.

### API / data

- All ESPN API calls go through `server/api/` routes — never fetch ESPN directly from the client.
- Composables in `app/composables/` handle data fetching and expose typed reactive state.

## Structure Notes

### Component folders

Modal components live in subfolders; Nuxt auto-imports by path (e.g. `GameDetail/StatsTab.vue` → `GameDetailStatsTab`).

### GameDetail/ folder (`app/components/GameDetail/`)

- `Modal.vue` — orchestrator; computes `homeLeaders`, `awayLeaders`, `homeRoster`, `awayRoster`, `homeLogo`, `awayLogo` and passes as props
- `StatsTab.vue` — match stats
- `LeadersTab.vue` — player leaders
- `LineupsTab.vue` — lineups/rosters
- `H2hTab.vue` — head-to-head history

### MyTeam/ folder (`app/components/MyTeam/`)

- `Modal.vue` — orchestrator; all data fetching/composables live here; passes typed props to tabs
- `ScheduleTab.vue` — recent results + next game; owns its own GameBlock grid/deep styles
- `LeadersTab.vue` — season stat leaders
- `LineupsTab.vue` — current roster / fallback last-lineup
- `FixturesTab.vue` — full 2026 season fixtures by month

### Team metadata

- `TEAM_LOGO` — team logo URLs (in `useMyTeam.ts`)
- `TEAM_SHORT_NAME` — 3–4 char abbreviations used inside modals (in `GameDetail/Modal.vue`)
- `useMyTeam.ts` has its own `TEAM_SHORT_NAME` for the My Team modal — intentionally separate (different display lengths).

## Commands

```bash
pnpm dev        # dev server at localhost:3000
pnpm build      # production build
pnpm preview    # preview production build
```
