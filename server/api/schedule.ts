/**
 * GET /api/schedule?teamId=<espnTeamId>
 *
 * Returns the team's full 2026 season schedule (past + future).
 *
 * ESPN's per-team `/teams/{id}/schedule` endpoint only returns a short window
 * of near-term games, which misses everything scheduled after the World Cup
 * hiatus. Instead we fetch the whole league's full-year scoreboard ONCE
 * (~500 events, cached in a module-level variable for 1 hour, with a
 * stale-cache fallback if ESPN fails) and filter it down to the requested
 * team on every request. This keeps the response shape identical to the old
 * per-team endpoint (`{ events: [...] }`), so no client-side parsing changes
 * are needed.
 */

const SEASON_TTL_MS = 60 * 60_000 // 1 hour

interface SeasonBlobCache {
  events: Array<Record<string, unknown>>
  fetchedAt: number
}

let seasonBlobCache: SeasonBlobCache | null = null

async function fetchSeasonBlob(): Promise<Array<Record<string, unknown>>> {
  const now = Date.now()
  if (seasonBlobCache && now - seasonBlobCache.fetchedAt < SEASON_TTL_MS) {
    return seasonBlobCache.events
  }

  const url =
    'https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard?dates=20260101-20261231&limit=1000'

  try {
    const data = await $fetch<Record<string, unknown>>(url)
    const events = (data.events as Array<Record<string, unknown>>) ?? []
    seasonBlobCache = { events, fetchedAt: now }
    return events
  } catch (err) {
    if (seasonBlobCache) return seasonBlobCache.events
    throw err
  }
}

function teamIsInEvent(evt: Record<string, unknown>, teamId: string): boolean {
  const comps = (evt.competitions as Array<Record<string, unknown>>) ?? []
  const comp = comps[0] ?? {}
  const competitors = (comp.competitors as Array<Record<string, unknown>>) ?? []
  return competitors.some((c) => {
    const t = c.team as Record<string, unknown> | undefined
    return t?.id === teamId
  })
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const teamId = query.teamId as string | undefined

  if (!teamId) {
    throw createError({ statusCode: 400, message: 'teamId is required' })
  }

  try {
    const allEvents = await fetchSeasonBlob()
    const events = allEvents.filter((evt) => teamIsInEvent(evt, teamId))
    return { events }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    throw createError({
      statusCode: 502,
      message: `ESPN API error: ${message}`,
    })
  }
})
