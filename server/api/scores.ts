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
// During the World Cup hiatus (Jun 11 – Jul 19 2026) and the off-season,
// "Last Week" snaps back to the last week with MLS games, and "Next Week"
// snaps forward to the first week with MLS games, so users always see real
// match data rather than an empty calendar week.
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

function weekRange(
  offset: number,
  ctNow?: Date
): {
  from: string
  to: string
  label: string
  hiatus?: string // present when this tab is inside a hiatus window
} {
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

  // Check if the requested week falls entirely within a hiatus window.
  // A week is "in hiatus" when its Monday is inside the window.
  const hiatus = getHiatus(monday)

  if (hiatus) {
    if (offset === 0) {
      // "This Week" — show the hiatus message; return the actual calendar week
      // dates so the label is accurate, but flag it as a hiatus.
      const label =
        monday.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }) +
        ' – ' +
        sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      return {
        from: toDateStr(monday),
        to: toDateStr(sunday),
        label,
        hiatus: hiatus.message,
      }
    } else if (offset === -1) {
      // "Last Week" — snap to the last week with MLS games before the hiatus
      const snapMonday = hiatus.lastGameWeekMonday
      const snapSunday = new Date(snapMonday)
      snapSunday.setDate(snapMonday.getDate() + 6)
      // Use fmtUTC to avoid timezone shift on ISO-string-constructed dates
      const label = fmtUTC(snapMonday) + ' – ' + fmtUTC(snapSunday)
      return { from: toDateStr(snapMonday), to: toDateStr(snapSunday), label }
    } else {
      // "Next Week" — snap to the first week with MLS games after the hiatus
      const snapMonday = hiatus.nextGameWeekMonday
      const snapSunday = new Date(snapMonday)
      snapSunday.setDate(snapMonday.getDate() + 6)
      // Use fmtUTC to avoid timezone shift on ISO-string-constructed dates
      const label = fmtUTC(snapMonday) + ' – ' + fmtUTC(snapSunday)
      return { from: toDateStr(snapMonday), to: toDateStr(snapSunday), label }
    }
  }

  const label =
    monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' – ' +
    sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return { from: toDateStr(monday), to: toDateStr(sunday), label }
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

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  let from: string
  let to: string
  let label: string

  if (query.date) {
    from = to = query.date as string
    label = query.date as string
  } else if (query.from && query.to) {
    from = query.from as string
    to = query.to as string
    label = `${from}–${to}`
  } else {
    const weekOffset =
      query.week === 'last' ? -1 : query.week === 'next' ? 1 : 0
    const range = weekRange(weekOffset)
    from = range.from
    to = range.to
    label = range.label
    if (range.hiatus) {
      // This week is inside a hiatus — return immediately with the message.
      // No need to hit ESPN since there are no MLS games this week.

      // Special case: if today is on or after July 20 (day after WC final),
      // try to show a congratulations message with the WC winner.
      let hiatusMessage = range.hiatus
      const ctDateStr = new Date().toLocaleDateString('en-CA', {
        timeZone: 'America/Chicago',
      })
      const todayCT = new Date(ctDateStr)
      if (
        todayCT >= WC_FINAL_RESUME_DATE &&
        range.hiatus.includes('World Cup')
      ) {
        const winner = await getWcWinner()
        if (winner) {
          hiatusMessage = `The World Cup is over! Congratulations ${winner}! The MLS continues! MLS play resumes July 22, 2026.`
        }
      }

      return {
        events: [],
        _weekLabel: label,
        _from: from,
        _to: to,
        _hiatus: hiatusMessage,
      }
    }
  }

  const cacheKey = `${from}-${to}`
  const now = Date.now()
  const cached = cache.get(cacheKey)

  // Return cached data if still fresh.
  // Use the short TTL only when the cached data contains live/HT events so we
  // don't hammer ESPN during off-hours or between match days.
  if (cached) {
    const ttl = hasLiveEvents(cached.data)
      ? CACHE_TTL_LIVE_MS
      : CACHE_TTL_IDLE_MS
    if (now - cached.fetchedAt < ttl) return cached.data
  }

  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard?dates=${from}-${to}`

  try {
    const data = await $fetch<Record<string, unknown>>(url)
    const result = { ...data, _weekLabel: label, _from: from, _to: to }
    cache.set(cacheKey, { data: result, fetchedAt: now })
    return result
  } catch (err: unknown) {
    // On ESPN failure: return stale cache if available (silent degradation)
    if (cached) {
      return { ...cached.data, _stale: true }
    }
    // No cache at all — return empty scoreboard shape so UI shows "no matches"
    // instead of a red error screen
    return {
      events: [],
      _weekLabel: label,
      _from: from,
      _to: to,
      _stale: true,
      _error: true,
    }
  }
})
