import { $fetch } from 'ofetch'
import { TEAM_LOGO } from './useMyTeam'

// ── Types ─────────────────────────────────────────────────────────────────────
export interface MatchStatus {
  code: 'ns' | 'live' | 'ht' | 'ft'
  clock?: string
}

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
}

export type WeekTab = 'last' | 'this' | 'next'

// ── Game quality score ────────────────────────────────────────────────────────
// Uses MLS points logic: W=3pts, D=1pt, L=0pts
// We sum both teams' implied points totals.
// Formula: (homePoints + awayPoints) where points = W*3 + D*1
// Bonus: +3 if both teams are within 4 pts of each other (close matchup)
// 🔥 fire threshold: ≥50 — requires both teams to be genuinely strong
//    e.g. two teams each with ~23+ pts (≈8W-2L-2D) + closeness bonus
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
  // Bonus for close matchup (within 4 pts of each other)
  const closeness = Math.abs(hPts - aPts) <= 4 ? 3 : 0
  return total + closeness
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
    | Array<Record<string, unknown>>
    | undefined
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
      const home = competitors.find((c) => c.homeAway === 'home') || {}
      const away = competitors.find((c) => c.homeAway === 'away') || {}
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
}

export function useScores() {
  const weeks = reactive<Record<WeekTab, WeekData>>({
    last: {
      matches: [],
      label: 'Last Week',
      loading: false,
      error: null,
      loaded: false,
    },
    this: {
      matches: [],
      label: 'This Week',
      loading: false,
      error: null,
      loaded: false,
    },
    next: {
      matches: [],
      label: 'Next Week',
      loading: false,
      error: null,
      loaded: false,
    },
  })

  const activeTab = ref<WeekTab>('this')
  const lastUpdated = ref<string | null>(null)

  async function fetchWeek(tab: WeekTab) {
    const w = weeks[tab]
    if (w.loading) return
    w.loading = true
    w.error = null
    try {
      const data = await $fetch<Record<string, unknown>>(
        `/api/scores?week=${tab}`
      )
      // Server returns _error:true when ESPN is down and no cache exists
      // In that case keep existing matches (stale) rather than clearing them
      if (!data._error) {
        w.matches = transformMatches(data)
        w.label = (data._weekLabel as string) || w.label
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
    if (!weeks[tab].loaded) await fetchWeek(tab)
  }

  return { weeks, activeTab, lastUpdated, fetchWeek, selectTab }
}
