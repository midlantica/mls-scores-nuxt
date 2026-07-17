// Server-side API route: proxies ESPN's MLS scoreboard API
// Supports ?week=last|this|next (defaults to 'this')
// or ?date=YYYYMMDD for a single day
// or ?from=YYYYMMDD&to=YYYYMMDD for a range
//
// In-memory cache: 30 s TTL when matches are live/HT, 90 s otherwise.
// On ESPN failure, stale cached data is returned silently (no error screen).

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

/** Format a Date as "Mon D" using UTC date parts (avoids timezone-shift on ISO-string dates) */
function fmtUTC(d: Date): string {
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

// ── MLS hiatus / off-season windows ──────────────────────────────────────────
// During the World Cup hiatus and the off-season, MLS mostly doesn't play —
// but ESPN sometimes schedules a handful of games inside these windows (e.g.
// a short return before the official resumption date). To avoid hiding real
// games, we ALWAYS fetch ESPN for the literal calendar week first. Only when
// ESPN returns zero events for that week do we fall back to the hiatus
// message ("This Week") or snap to the nearest MLS week with games
// ("Last"/"Next" Week) — see the handler below.
interface HiatusWindow {
  start: Date // first day of hiatus (inclusive)
  end: Date // last day of hiatus (inclusive)
  lastGameWeekMonday: Date // Monday of the last MLS week before hiatus
  nextGameWeekMonday: Date // Monday of the first MLS week after hiatus
  message: string // shown on the "This Week" tab
}

const HIATUS_WINDOWS: HiatusWindow[] = [
  {
    // 2026 FIFA World Cup break
    // Last MLS games: May 24, 2026 (week of May 18–24)
    // MLS resumes: July 22, 2026 (week of Jul 20–26)
    start: new Date('2026-05-25'),
    end: new Date('2026-07-21'),
    lastGameWeekMonday: new Date('2026-05-18'), // week of May 18–24 (last MLS games)
    nextGameWeekMonday: new Date('2026-07-20'), // week of Jul 20–26 (MLS resumes Jul 22)
    message:
      'The MLS season is on hiatus for the 2026 FIFA World Cup. MLS play resumes July 22, 2026.',
  },
  {
    // 2026–27 off-season
    start: new Date('2026-11-30'),
    end: new Date('2027-02-26'),
    lastGameWeekMonday: new Date('2026-11-23'), // week of MLS Cup / final games
    nextGameWeekMonday: new Date('2027-02-22'), // week MLS 2027 season opens
    message:
      'The 2026 MLS season has concluded. The 2027 MLS season begins February 27, 2027.',
  },
]

/** Return the hiatus window that contains the given date, or null. */
function getHiatus(d: Date): HiatusWindow | null {
  return HIATUS_WINDOWS.find((h) => d >= h.start && d <= h.end) ?? null
}

interface WeekBounds {
  from: string
  to: string
  label: string
  monday: Date
}

/** Compute the literal calendar week (Mon–Sun) for the given offset — no hiatus logic. */
function literalWeekBounds(offset: number, ctNow?: Date): WeekBounds {
  // Use CT (America/Chicago) local date so the week doesn't advance until
  // midnight CT — not midnight UTC (which is 6-7h earlier).
  const ctDateStr = (ctNow ?? new Date()).toLocaleDateString('en-CA', {
    timeZone: 'America/Chicago',
  }) // "YYYY-MM-DD"
  const [year, month, dayOfMonth] = ctDateStr.split('-').map(Number)
  // Reconstruct a local Date at midnight using the CT calendar date
  const today = new Date(year!, month! - 1, dayOfMonth!)
  const day = today.getDay() // 0=Sun
  const diffToMon = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diffToMon + offset * 7)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const label =
    monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' – ' +
    sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return { from: toDateStr(monday), to: toDateStr(sunday), label, monday }
}

/** Bounds for the nearest MLS week with games, snapped from a hiatus window. */
function snappedWeekBounds(monday: Date): WeekBounds {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  // Use fmtUTC to avoid timezone shift on ISO-string-constructed dates
  const label = fmtUTC(monday) + ' – ' + fmtUTC(sunday)
  return { from: toDateStr(monday), to: toDateStr(sunday), label, monday }
}

// ── WC 2026 final winner cache ────────────────────────────────────────────────
// After July 19 2026, we try to fetch the WC final result from ESPN once and
// cache it. undefined = not yet fetched, null = fetched but no winner yet
// (game not completed), string = winner display name.
const WC_FINAL_DATE = '20260719'
const WC_FINAL_RESUME_DATE = new Date('2026-07-20') // first day after the final
const WC_FINAL_ESPN_URL = `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${WC_FINAL_DATE}`
const WC_WINNER_CACHE_TTL_MS = 10 * 60_000 // 10 min — retry if no winner yet

let wcWinnerName: string | null | undefined = undefined // undefined = never fetched
let wcWinnerFetchedAt = 0

async function getWcWinner(): Promise<string | null> {
  const now = Date.now()
  // Return cached winner name if we already have one (no need to re-fetch)
  if (typeof wcWinnerName === 'string') return wcWinnerName
  // If we fetched recently and still got null, don't hammer ESPN
  if (wcWinnerName === null && now - wcWinnerFetchedAt < WC_WINNER_CACHE_TTL_MS)
    return null

  try {
    const data = await $fetch<Record<string, unknown>>(WC_FINAL_ESPN_URL)
    const events = (data.events as Array<Record<string, unknown>>) ?? []
    for (const evt of events) {
      const competitions =
        (evt.competitions as Array<Record<string, unknown>>) ?? []
      for (const comp of competitions) {
        const competitors =
          (comp.competitors as Array<Record<string, unknown>>) ?? []
        const winner = competitors.find((c) => c.winner === true)
        if (winner) {
          const team = winner.team as Record<string, unknown> | undefined
          const name =
            (team?.displayName as string) ??
            (winner.displayName as string) ??
            null
          if (name) {
            wcWinnerName = name
            wcWinnerFetchedAt = now
            return name
          }
        }
      }
    }
    // Game not completed yet or no winner flag
    wcWinnerName = null
    wcWinnerFetchedAt = now
    return null
  } catch {
    // ESPN call failed — treat as no winner yet, will retry next request
    wcWinnerName = null
    wcWinnerFetchedAt = now
    return null
  }
}

// ── In-memory cache ───────────────────────────────────────────────────────────
// Use a short TTL when there are live events, longer when nothing is in-play.
// This keeps the clock tight during matches without hammering ESPN at off-hours.
const CACHE_TTL_LIVE_MS = 30_000 // 30 s — during live/HT matches
const CACHE_TTL_IDLE_MS = 90_000 // 90 s — pre/post match (original rate)

function hasLiveEvents(data: Record<string, unknown>): boolean {
  const events = (data.events as Array<Record<string, unknown>>) ?? []
  const now = Date.now()
  return events.some((evt) => {
    const status = evt.status as Record<string, unknown> | undefined
    const type = status?.type as Record<string, unknown> | undefined
    const state = type?.state as string | undefined
    const name = type?.name as string | undefined
    // Currently live or halftime
    if (state === 'in' || name === 'STATUS_HALFTIME') return true
    // Not started but kickoff time has already passed — treat as "should be live"
    // so we use the short TTL and re-fetch sooner to pick up the live status
    if (state === 'pre' || name === 'STATUS_SCHEDULED') {
      const dateStr = evt.date as string | undefined
      if (dateStr && new Date(dateStr).getTime() <= now) return true
    }
    return false
  })
}

interface CacheEntry {
  data: Record<string, unknown>
  fetchedAt: number
}

const cache = new Map<string, CacheEntry>()

/** Fetch a date range from ESPN (via cache when fresh), returning stale/error flags. */
async function fetchRange(
  from: string,
  to: string,
  bustCache: boolean
): Promise<{
  data: Record<string, unknown>
  stale?: boolean
  error?: boolean
}> {
  const cacheKey = `${from}-${to}`
  const now = Date.now()
  const cached = cache.get(cacheKey)

  // Return cached data if still fresh, unless the client requested a bypass.
  if (!bustCache && cached) {
    const ttl = hasLiveEvents(cached.data)
      ? CACHE_TTL_LIVE_MS
      : CACHE_TTL_IDLE_MS
    if (now - cached.fetchedAt < ttl) return { data: cached.data }
  }

  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard?dates=${from}-${to}`

  try {
    const data = await $fetch<Record<string, unknown>>(url)
    cache.set(cacheKey, { data, fetchedAt: now })
    return { data }
  } catch {
    // On ESPN failure: return stale cache if available (silent degradation)
    if (cached) return { data: cached.data, stale: true }
    // No cache at all — empty scoreboard shape so UI shows "no matches"
    return { data: { events: [] }, stale: true, error: true }
  }
}

function eventCount(data: Record<string, unknown>): number {
  return ((data.events as Array<unknown>) ?? []).length
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const bustCache = !!query._t

  if (query.date) {
    const from = query.date as string
    const to = query.date as string
    const result = await fetchRange(from, to, bustCache)
    return {
      ...result.data,
      _weekLabel: from,
      _from: from,
      _to: to,
      ...(result.stale ? { _stale: true } : {}),
      ...(result.error ? { _error: true } : {}),
    }
  }

  if (query.from && query.to) {
    const from = query.from as string
    const to = query.to as string
    const result = await fetchRange(from, to, bustCache)
    return {
      ...result.data,
      _weekLabel: `${from}–${to}`,
      _from: from,
      _to: to,
      ...(result.stale ? { _stale: true } : {}),
      ...(result.error ? { _error: true } : {}),
    }
  }

  const weekOffset = query.week === 'last' ? -1 : query.week === 'next' ? 1 : 0
  const literal = literalWeekBounds(weekOffset)

  // Always check ESPN for the literal calendar week first — MLS occasionally
  // schedules games inside a "hiatus" window (e.g. a short return before the
  // official resumption date), and we must never hide real games behind a
  // hardcoded hiatus message.
  const primary = await fetchRange(literal.from, literal.to, bustCache)

  if (eventCount(primary.data) > 0) {
    return {
      ...primary.data,
      _weekLabel: literal.label,
      _from: literal.from,
      _to: literal.to,
      ...(primary.stale ? { _stale: true } : {}),
      ...(primary.error ? { _error: true } : {}),
    }
  }

  // No games found in the literal calendar week — check whether this falls
  // inside a known hiatus window.
  const hiatus = getHiatus(literal.monday)

  if (!hiatus) {
    // Genuinely no MLS games this week (bye week, etc.) — plain empty result.
    return {
      events: [],
      _weekLabel: literal.label,
      _from: literal.from,
      _to: literal.to,
      ...(primary.stale ? { _stale: true } : {}),
      ...(primary.error ? { _error: true } : {}),
    }
  }

  if (weekOffset === 0) {
    // "This Week" — no real games this week and we're in a hiatus window.
    // Show the hiatus message; return the actual calendar week dates so the
    // label is accurate.
    let hiatusMessage = hiatus.message
    const ctDateStr = new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/Chicago',
    })
    const todayCT = new Date(ctDateStr)
    if (
      todayCT >= WC_FINAL_RESUME_DATE &&
      hiatus.message.includes('World Cup')
    ) {
      const winner = await getWcWinner()
      if (winner) {
        hiatusMessage = `The World Cup is over! Congratulations ${winner}! The MLS continues! MLS play resumes July 22, 2026.`
      }
    }

    return {
      events: [],
      _weekLabel: literal.label,
      _from: literal.from,
      _to: literal.to,
      _hiatus: hiatusMessage,
    }
  }

  // "Last Week" / "Next Week" — snap to the nearest MLS week with games.
  const snapMonday =
    weekOffset === -1 ? hiatus.lastGameWeekMonday : hiatus.nextGameWeekMonday
  const snapped = snappedWeekBounds(snapMonday)
  const snapResult = await fetchRange(snapped.from, snapped.to, bustCache)

  return {
    ...snapResult.data,
    _weekLabel: snapped.label,
    _from: snapped.from,
    _to: snapped.to,
    ...(snapResult.stale ? { _stale: true } : {}),
    ...(snapResult.error ? { _error: true } : {}),
  }
})
