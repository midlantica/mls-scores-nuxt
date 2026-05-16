// Server-side API route: proxies ESPN's MLS team schedule API
// Accepts ?teamId=<espnTeamId>
// Returns the team's schedule for the current season

const CACHE_TTL_MS = 5 * 60_000 // 5 minutes

interface CacheEntry {
  data: Record<string, unknown>
  fetchedAt: number
}

const cache = new Map<string, CacheEntry>()

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const teamId = query.teamId as string | undefined

  if (!teamId) {
    throw createError({ statusCode: 400, message: 'teamId is required' })
  }

  const now = Date.now()
  const cached = cache.get(teamId)
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data
  }

  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/teams/${teamId}/schedule`

  try {
    const data = await $fetch<Record<string, unknown>>(url)
    cache.set(teamId, { data, fetchedAt: now })
    return data
  } catch (err: unknown) {
    if (cached) return { ...cached.data, _stale: true }
    const message = err instanceof Error ? err.message : String(err)
    throw createError({
      statusCode: 502,
      message: `ESPN API error: ${message}`,
    })
  }
})
