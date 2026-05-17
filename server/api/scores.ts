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

function weekRange(offset: number): {
  from: string
  to: string
  label: string
} {
  const now = new Date()
  const day = now.getDay() // 0=Sun
  const diffToMon = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMon + offset * 7)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const label =
    monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' – ' +
    sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return { from: toDateStr(monday), to: toDateStr(sunday), label }
}

// ── In-memory cache ───────────────────────────────────────────────────────────
// Use a short TTL when there are live events, longer when nothing is in-play.
// This keeps the clock tight during matches without hammering ESPN at off-hours.
const CACHE_TTL_LIVE_MS = 30_000 // 30 s — during live/HT matches
const CACHE_TTL_IDLE_MS = 90_000 // 90 s — pre/post match (original rate)

function hasLiveEvents(data: Record<string, unknown>): boolean {
  const events = (data.events as Array<Record<string, unknown>>) ?? []
  return events.some((evt) => {
    const status = evt.status as Record<string, unknown> | undefined
    const type = status?.type as Record<string, unknown> | undefined
    const state = type?.state as string | undefined
    const name = type?.name as string | undefined
    return state === 'in' || name === 'STATUS_HALFTIME'
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
