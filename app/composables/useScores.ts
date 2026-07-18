import { $fetch } from 'ofetch'
import { TEAM_LOGO } from './useMyTeam'

// ── Types ─────────────────────────────────────────────────────────────────────
export interface MatchStatus {
  code: 'ns' | 'live' | 'ht' | 'ft'
  clock?: string
}

export type MatchBadge = 'fire' | 'wild' | null

export interface Match {
  id: string
  date: string // ISO 8601 — format at display time via useTimezone
  home: string
  homeRec: string
  homeScore: string | null
  homeColor: string // hex color for home team swatch
  homeLogo: string | null // local SVG logo path
  away: string
  awayRec: string
  awayScore: string | null
  awayColor: string // hex color for away team swatch
  awayLogo: string | null // local SVG logo path
  status: MatchStatus
  kickoffSlot: number // UTC epoch ms rounded to nearest 30min — for slot grouping
  qualityScore: number
  badge: MatchBadge // 🔥 top clash | 🤞 wild card | null
}

export type WeekTab = 'last' | 'this' | 'next'

// ── Known MLS derbies / rivalries ─────────────────────────────────────────────
// Each pair is stored as a sorted tuple so order doesn't matter
const DERBY_PAIRS: [string, string][] = [
  ['LA Galaxy', 'LAFC'], // El Tráfico
  ['Seattle Sounders FC', 'Portland Timbers'], // Cascadia Cup
  ['Seattle Sounders FC', 'Vancouver Whitecaps'], // Cascadia
  ['Portland Timbers', 'Vancouver Whitecaps'], // Cascadia
  ['New York City FC', 'Red Bull New York'], // Hudson River Derby
  ['Atlanta United FC', 'Charlotte FC'], // I-85 Derby
  ['FC Cincinnati', 'Columbus Crew'], // Hell is Real Derby
  ['Sporting Kansas City', 'Colorado Rapids'], // Rocky Mountain Cup
  ['Houston Dynamo FC', 'FC Dallas'], // Texas Derby
  ['D.C. United', 'New England Revolution'], // Atlantic Cup
  ['Inter Miami CF', 'Orlando City SC'], // Florida Derby
  ['Minnesota United FC', 'Sporting Kansas City'], // Midwest rivalry
  ['Real Salt Lake', 'Colorado Rapids'], // Rocky Mountain
  ['San Jose Earthquakes', 'LA Galaxy'], // California Clásico
  ['San Jose Earthquakes', 'LAFC'], // California
  ['CF Montréal', 'Toronto FC'], // Canadian rivalry
  ['Vancouver Whitecaps', 'Toronto FC'], // Canadian
  ['CF Montréal', 'Vancouver Whitecaps'], // Canadian
]

function isDerby(home: string, away: string): boolean {
  return DERBY_PAIRS.some(
    ([a, b]) => (a === home && b === away) || (a === away && b === home)
  )
}

// ── Game quality score ────────────────────────────────────────────────────────
// Uses MLS points logic: W=3pts, D=1pt, L=0pts
function parseRec(summary: string): { w: number; l: number; d: number } {
  const parts = summary.split('-').map(Number)
  return { w: parts[0] ?? 0, l: parts[1] ?? 0, d: parts[2] ?? 0 }
}

export function calcQuality(homeRec: string, awayRec: string): number {
  if (homeRec === '–' || awayRec === '–') return 0
  const h = parseRec(homeRec)
  const a = parseRec(awayRec)
  const hPts = h.w * 3 + h.d
  const aPts = a.w * 3 + a.d
  const total = hPts + aPts
  const closeness = Math.abs(hPts - aPts) <= 4 ? 3 : 0
  return total + closeness
}

/**
 * Determine the badge tier for a match.
 *
 * Closeness is measured in points-per-game (W=3, D=1) rather than raw points,
 * so teams with games in hand aren't unfairly penalized.
 *
 * 🔥 "fire"  — The week's genuine top clashes:
 *   • Both teams have winning records (W > L), both have played ≥5 games,
 *     AND they're closely matched (within 0.5 pts/game of each other), OR
 *   • A known derby where both teams have winning records (≥5 games each) —
 *     a rivalry with real title-race stakes.
 *
 * 🎲 "wild"  — Selective underdog/derby interest:
 *   • A known derby where the rivals are closely matched (within 0.75
 *     pts/game of each other), OR
 *   • Both teams are evenly humble (neither has a winning record, both have
 *     played ≥6 games, within 0.35 pts/game) — a true fight-to-the-death.
 *   NOT every mediocre game — must meet the criteria above.
 *
 * null — everything else
 */
export function calcBadge(
  homeRec: string,
  awayRec: string,
  home: string,
  away: string
): MatchBadge {
  if (homeRec === '–' || awayRec === '–') return null
  const h = parseRec(homeRec)
  const a = parseRec(awayRec)
  const hGames = h.w + h.l + h.d
  const aGames = a.w + a.l + a.d
  const hPpg = hGames > 0 ? (h.w * 3 + h.d) / hGames : 0
  const aPpg = aGames > 0 ? (a.w * 3 + a.d) / aGames : 0
  const ppgDiff = Math.abs(hPpg - aPpg)
  const hWinning = h.w > h.l
  const aWinning = a.w > a.l
  const enoughGames = hGames >= 5 && aGames >= 5
  const derby = isDerby(home, away)

  // 🔥 Both winning records + closely matched (min games guards early-season noise)
  if (hWinning && aWinning && enoughGames && ppgDiff <= 0.5) return 'fire'

  // 🔥 Derby where both rivals are winning — stakes on top of the grudge
  if (derby && hWinning && aWinning && enoughGames) return 'fire'

  // 🎲 Derby with closely matched rivals
  if (derby && ppgDiff <= 0.75) return 'wild'

  // 🎲 Both evenly humble (not winning records), enough games played, very close
  const hHumble = !hWinning && hGames >= 6
  const aHumble = !aWinning && aGames >= 6
  if (hHumble && aHumble && ppgDiff <= 0.35) return 'wild'

  return null
}

// ── Team name normalization ───────────────────────────────────────────────────
// ESPN occasionally returns incorrect casing for some team names
const TEAM_NAME_MAP: Record<string, string> = {
  'St. Louis CITY SC': 'St. Louis City SC',
}

function normalizeTeamName(name: string): string {
  return TEAM_NAME_MAP[name] ?? name
}

// ── Team color ────────────────────────────────────────────────────────────────
// ESPN provides `color` (primary) and `alternateColor` on each team object.
// When the primary is pure black (#000000) we fall back to the alternate so the
// swatch is visible on the dark background.
function resolveTeamColor(color?: string, alternateColor?: string): string {
  const primary = color ? `#${color.replace(/^#/, '')}` : ''
  const alternate = alternateColor ? `#${alternateColor.replace(/^#/, '')}` : ''
  if (!primary || primary.toLowerCase() === '#000000')
    return alternate || '#888888'
  return primary
}

// ── Helpers ───────────────────────────────────────────────────────────────────
// Times are formatted at display time via useTimezone — we only need a stable
// 30-min slot key for grouping, stored as UTC epoch ms.
/** Round ISO date down to nearest 30-min UTC slot, return epoch ms for grouping */
function toKickoffSlot(iso: string): number {
  const d = new Date(iso)
  const mins = d.getUTCMinutes()
  const rounded = mins < 15 ? 0 : mins < 45 ? 30 : 60
  const h = rounded === 60 ? d.getUTCHours() + 1 : d.getUTCHours()
  const m = rounded === 60 ? 0 : rounded
  const slot = new Date(d)
  slot.setUTCHours(h, m, 0, 0)
  return slot.getTime()
}

function parseRecord(competitor: Record<string, unknown>): string {
  const records = competitor.records as
    Array<Record<string, unknown>> | undefined
  const rec = records?.find(
    (r) => r.type === 'total' || r.abbreviation === 'Total'
  )
  return rec ? (rec.summary as string) : '–'
}

function parseStatus(evt: Record<string, unknown>): MatchStatus {
  const status = evt.status as Record<string, unknown> | undefined
  const type = status?.type as Record<string, unknown> | undefined
  const name = (type?.name as string) || ''
  const state = (type?.state as string) || ''
  const completed = type?.completed as boolean | undefined
  const clock = (status?.displayClock as string) || ''
  if (completed === true || state === 'post') return { code: 'ft' }
  if (name === 'STATUS_HALFTIME') return { code: 'ht' }
  if (state === 'in') return { code: 'live', clock }
  return { code: 'ns' }
}

export function transformMatches(data: Record<string, unknown>): Match[] {
  const events = (data.events as Array<Record<string, unknown>>) || []
  return events
    .map((evt) => {
      const comp =
        (evt.competitions as Array<Record<string, unknown>>)?.[0] || {}
      const competitors =
        (comp.competitors as Array<Record<string, unknown>>) || []

      // ESPN's event name is always "Away at Home" — use it as a tiebreaker
      // when homeAway fields are missing or ambiguous.
      const evtName = (evt.name as string) || ''
      const nameAwayFirst = evtName.includes(' at ')
        ? evtName.split(' at ')[0]?.trim()
        : null

      let home =
        competitors.find((c) => c.homeAway === 'home') ||
        (nameAwayFirst
          ? competitors.find(
              (c) =>
                (c.team as Record<string, unknown>)?.displayName !==
                nameAwayFirst
            )
          : null) ||
        competitors[0] ||
        {}
      let away =
        competitors.find((c) => c.homeAway === 'away') ||
        (nameAwayFirst
          ? competitors.find(
              (c) =>
                (c.team as Record<string, unknown>)?.displayName ===
                nameAwayFirst
            )
          : null) ||
        competitors[1] ||
        {}

      // Final sanity check: if both resolved to the same competitor, fall back
      if (home === away) {
        home = competitors[0] || {}
        away = competitors[1] || {}
      }
      const homeTeam = home.team as Record<string, unknown> | undefined
      const awayTeam = away.team as Record<string, unknown> | undefined
      const homeRec = parseRecord(home)
      const awayRec = parseRecord(away)
      return {
        id: evt.id as string,
        date: evt.date as string,
        home: normalizeTeamName((homeTeam?.displayName as string) || '?'),
        homeRec,
        homeScore: (home.score as string) ?? null,
        homeColor: resolveTeamColor(
          homeTeam?.color as string,
          homeTeam?.alternateColor as string
        ),
        homeLogo:
          TEAM_LOGO[
            normalizeTeamName((homeTeam?.displayName as string) || '')
          ] ?? null,
        away: normalizeTeamName((awayTeam?.displayName as string) || '?'),
        awayRec,
        awayScore: (away.score as string) ?? null,
        awayColor: resolveTeamColor(
          awayTeam?.color as string,
          awayTeam?.alternateColor as string
        ),
        awayLogo:
          TEAM_LOGO[
            normalizeTeamName((awayTeam?.displayName as string) || '')
          ] ?? null,
        status: parseStatus(evt),
        kickoffSlot: toKickoffSlot(evt.date as string),
        qualityScore: calcQuality(homeRec, awayRec),
        badge: calcBadge(
          homeRec,
          awayRec,
          normalizeTeamName((homeTeam?.displayName as string) || '?'),
          normalizeTeamName((awayTeam?.displayName as string) || '?')
        ),
      }
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

// ── Composable ────────────────────────────────────────────────────────────────
export interface WeekData {
  matches: Match[]
  label: string
  loading: boolean
  error: string | null
  loaded: boolean
  hiatus: string | null // non-null when this week is inside a hiatus window
}

export function useScores() {
  // Use Nuxt's useState so all component instances share the same reactive state
  const weeks = useState<Record<WeekTab, WeekData>>('scores-weeks', () => ({
    last: {
      matches: [],
      label: 'Last Week',
      loading: false,
      error: null,
      loaded: false,
      hiatus: null,
    },
    this: {
      matches: [],
      label: 'This Week',
      loading: false,
      error: null,
      loaded: false,
      hiatus: null,
    },
    next: {
      matches: [],
      label: 'Next Week',
      loading: false,
      error: null,
      loaded: false,
      hiatus: null,
    },
  }))

  const activeTab = useState<WeekTab>('scores-activeTab', () => 'this')
  const lastUpdated = useState<string | null>('scores-lastUpdated', () => null)

  async function fetchWeek(tab: WeekTab, force = false) {
    const w = weeks.value[tab]
    if (w.loading) return
    if (!force && w.loaded) return
    w.loading = true
    w.error = null
    try {
      // Append a cache-buster on force-refresh so the server bypasses its
      // in-memory cache and fetches fresh data from ESPN.
      const url = force
        ? `/api/scores?week=${tab}&_t=${Date.now()}`
        : `/api/scores?week=${tab}`
      const data = await $fetch<Record<string, unknown>>(url)
      // Server returns _error:true when ESPN is down and no cache exists
      // In that case keep existing matches (stale) rather than clearing them
      if (!data._error) {
        w.matches = transformMatches(data)
        w.label = (data._weekLabel as string) || w.label
        w.hiatus = (data._hiatus as string) ?? null
        w.loaded = true
      }
      // Always update timestamp so user knows we tried
      lastUpdated.value =
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }) + (data._stale ? ' ·' : '')
    } catch {
      // Network-level failure — always fail silently, never show error screen
      // If we have no data yet, matches stays empty (shows "No matches found")
    } finally {
      w.loading = false
    }
  }

  async function selectTab(tab: WeekTab) {
    activeTab.value = tab
    if (!weeks.value[tab].loaded) await fetchWeek(tab)
  }

  /** Returns true if any match in the given tab is currently live or at HT */
  function hasLiveGames(tab: WeekTab): boolean {
    return weeks.value[tab].matches.some(
      (m) => m.status.code === 'live' || m.status.code === 'ht'
    )
  }

  return {
    weeks: weeks.value,
    activeTab,
    lastUpdated,
    fetchWeek,
    selectTab,
    hasLiveGames,
  }
}
