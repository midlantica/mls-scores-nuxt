import { $fetch } from 'ofetch'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MatchDetailTeam {
  id: string
  displayName: string
  abbreviation: string
  homeAway: string
  record: string
  points: string
  score: string | null
  color?: string
  alternateColor?: string
  logo?: string
}

export interface TeamStat {
  name: string
  displayValue: string
}

export interface TeamStats {
  teamId: string
  displayName: string
  stats: TeamStat[]
}

export interface MatchOdds {
  provider?: string
  home: { summary?: string; moneyLine?: number }
  away: { summary?: string; moneyLine?: number }
  draw: { summary?: string; moneyLine?: number }
  preMatchHome?: string
  preMatchAway?: string
  preMatchDraw?: string
}

export interface RosterPlayer {
  id: string
  displayName: string
  shortName: string
  jersey?: string
  position: string
  positionName?: string
  starter: boolean
  subbedIn: boolean
  subbedOut: boolean
}

export interface TeamRoster {
  teamId: string
  displayName: string
  players: RosterPlayer[]
}

export interface LeaderCategory {
  name: string
  displayName: string
  shortDisplayName: string
  athlete?: string
  value?: string
}

export interface TeamLeaders {
  teamId: string
  displayName: string
  categories: LeaderCategory[]
}

export interface H2HGame {
  id: string
  date: string
  score: string
  result: string // W/L/D
  atVs: string
  competition: string
}

export interface MatchInfo {
  attendance?: number
  venue?: string
  city?: string
  country?: string
}

export interface MatchEvent {
  teamId: string
  type: 'goal' | 'yellow' | 'red'
  lastName: string
  clock: string
  isOG?: boolean
  isPenalty?: boolean
  isSecondYellow?: boolean
}

export interface MatchDetail {
  eventId: string
  teams: MatchDetailTeam[]
  teamStats: TeamStats[]
  odds: MatchOdds
  rosters: TeamRoster[]
  leaders: TeamLeaders[]
  headToHead: H2HGame[]
  info: MatchInfo
  matchEvents?: MatchEvent[]
  hasOdds?: boolean
}

// ── Win probability from moneyline odds ──────────────────────────────────────
// Converts American moneyline to implied probability, then normalises the 3-way
// market so home + draw + away = 100%.
export function impliedProb(moneyLine: number | undefined): number {
  if (!moneyLine) return 0
  if (moneyLine > 0) return 100 / (moneyLine + 100)
  return Math.abs(moneyLine) / (Math.abs(moneyLine) + 100)
}

export function normaliseOdds(
  home: number | undefined,
  draw: number | undefined,
  away: number | undefined
): { home: number; draw: number; away: number } | null {
  const h = impliedProb(home)
  const d = impliedProb(draw)
  const a = impliedProb(away)
  const total = h + d + a
  if (total === 0) return null
  return {
    home: Math.round((h / total) * 100),
    draw: Math.round((d / total) * 100),
    away: Math.round((a / total) * 100),
  }
}

// Convert fractional odds string (e.g. "5/2") to American moneyline
export function fractionalToMoneyline(
  frac: string | undefined
): number | undefined {
  if (!frac) return undefined
  const parts = frac.split('/')
  if (parts.length !== 2) return undefined
  const num = parseFloat(parts[0] ?? '0')
  const den = parseFloat(parts[1] ?? '1')
  if (!den) return undefined
  const decimal = num / den + 1
  if (decimal >= 2) return Math.round((decimal - 1) * 100)
  return Math.round(-100 / (decimal - 1))
}

// ── Composable ────────────────────────────────────────────────────────────────
export function useMatchDetail() {
  const detail = ref<MatchDetail | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const currentEventId = ref<string | null>(null)
  let pollTimer: ReturnType<typeof setInterval> | null = null

  async function fetchDetail(eventId: string, force = false) {
    if (!force && currentEventId.value === eventId && detail.value) return
    // Only show full loading spinner on first load, not on background polls
    if (!detail.value) loading.value = true
    error.value = null
    currentEventId.value = eventId
    try {
      const data = await $fetch<MatchDetail>(
        `/api/match-detail?eventId=${eventId}`
      )
      detail.value = data
    } catch (e: unknown) {
      error.value =
        e instanceof Error ? e.message : 'Failed to load match details'
    } finally {
      loading.value = false
    }
  }

  /** Start polling every `intervalMs` ms (default 30 s). Call when modal opens for a live game. */
  function startPolling(eventId: string, intervalMs = 30_000) {
    stopPolling()
    pollTimer = setInterval(() => {
      fetchDetail(eventId, true)
    }, intervalMs)
  }

  function stopPolling() {
    if (pollTimer !== null) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  function clear() {
    stopPolling()
    detail.value = null
    currentEventId.value = null
    error.value = null
  }

  return {
    detail,
    loading,
    error,
    fetchDetail,
    startPolling,
    stopPolling,
    clear,
  }
}
