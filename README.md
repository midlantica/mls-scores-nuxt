# ⚽ MLS Fire

A fast, clean MLS Fire app built with **Nuxt 4** and deployed on **Netlify**. Live scores, standings, stats, team schedules, rosters, and head-to-head history — all in one place.

🔗 **Live:** [mlsfire.net](https://mlsfire.net)

---

## Features

- **Live Scores** — Real-time match scores with live clock, halftime, and full-time indicators. Auto-polls every 30 seconds when live matches are active.
- **This / Last / Next Week** — Tabbed week navigation that auto-selects the most relevant week (live > upcoming > last completed).
- **Standings** — Eastern and Western Conference tables, side-by-side on desktop, tabbed on mobile.
- **Stats** — League-wide player stat leaders.
- **Game Detail Modal** — Per-match deep dive with tabs for:
  - Match stats (possession, shots, corners, fouls, etc.)
  - Player leaders
  - Lineups / rosters
  - Head-to-head history
- **My Team Modal** — Pick your team and get a dedicated view with:
  - Schedule (past results + upcoming fixtures)
  - Team stat leaders
  - Roster / lineups
  - Full 2026 season fixtures grouped by month
- **Team-to-Team Navigation** — Click any team name or logo anywhere in the app to open that team's modal.
- **Timezone-aware** — All kickoff times displayed in the user's local timezone.
- **Browser history support** — Back/forward button works correctly with modal navigation.
- **Responsive** — Fully mobile-optimized with adaptive layouts throughout.

---

## Tech Stack

| Layer           | Technology                                                         |
| --------------- | ------------------------------------------------------------------ |
| Framework       | [Nuxt 4](https://nuxt.com) (Vue 3, `<script setup>`)               |
| Styling         | [Tailwind CSS v4](https://tailwindcss.com) + scoped component CSS  |
| Color           | `oklab()` / `oklch()` perceptual color throughout                  |
| Team palettes   | [culori](https://culorijs.org) — dynamic per-team color generation |
| Server routes   | Nuxt server API (`server/api/`) → Netlify Functions                |
| Data source     | ESPN public API (unofficial)                                       |
| Deployment      | [Netlify](https://netlify.com) (Nitro `netlify` preset)            |
| Package manager | [pnpm](https://pnpm.io)                                            |

---

## Project Structure

```
app/
├── assets/css/          # Global styles (main, scrollbar, theme)
├── components/
│   ├── AppHeader.vue              # Site header + timezone picker
│   ├── AppFooter.vue              # Footer
│   ├── GameBlock.vue              # Match card used in schedule lists
│   ├── GameDetailModal.vue        # Full match detail modal (orchestration)
│   ├── GameDetailStatsTab.vue     # Match stats tab (possession, shots, etc.)
│   ├── GameDetailLeadersTab.vue   # Player leaders tab
│   ├── GameDetailLineupsTab.vue   # Lineups / rosters tab
│   ├── GameDetailH2hTab.vue       # Head-to-head history tab
│   ├── HiatusBanner.vue           # FIFA World Cup 2026 hiatus notice
│   ├── MatchCard.vue              # Compact match card for scores wall
│   ├── MyTeamModal.vue            # Team detail modal (schedule/leaders/fixtures)
│   ├── ScoresSection.vue          # Main scores wall
│   ├── StandingsTable.vue         # Conference standings table
│   ├── StatsSection.vue           # League stat leaders
│   ├── TeamPicker.vue             # My Team selector widget
│   └── TzPicker.vue               # Timezone selector
├── constants/
│   └── mls.ts               # Shared config (hiatus dates, etc.)
├── composables/
│   ├── useMatchDetail.ts    # Match detail data + odds helpers
│   ├── useMatchView.ts      # Match display helpers
│   ├── useMyTeam.ts         # Team metadata, logos, palette builder
│   ├── useScores.ts         # Scores data + week management
│   ├── useStandings.ts      # Standings data
│   ├── useStats.ts          # League stats data
│   ├── useTeamColors.ts     # Team primary color map
│   └── useTimezone.ts       # User timezone detection + persistence
└── pages/
    └── index.vue            # Root page — modal orchestration + routing

server/api/
├── match-detail.ts   # /api/match-detail?eventId=
├── schedule.ts       # /api/schedule?teamId=
├── scores.ts         # /api/scores?week=this|last|next
├── standings.ts      # /api/standings
├── stats.ts          # /api/stats
└── team-detail.ts    # /api/team-detail?teamId=
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 20+
- [pnpm](https://pnpm.io) 10+

### Install

```bash
pnpm install
```

### Dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
pnpm build
```

### Preview production build

```bash
pnpm preview
```

---

## Deployment

The app is configured for **Netlify** via the Nitro `netlify` preset. All `server/api/` routes are automatically deployed as Netlify Functions.

```toml
# netlify.toml is included — no extra configuration needed
```

Push to your connected Netlify repo and it deploys automatically.

---

## Data Source

All match data is fetched from ESPN's public (unofficial) API endpoints. No API key is required. The server-side API routes in `server/api/` act as a proxy layer, normalizing the ESPN responses into clean typed shapes consumed by the frontend composables.

---

## License

MIT
