/**
 * GET /api/team-detail?teamId=<espnTeamId>
 *
 * Returns:
 *   - roster: full squad list with position, jersey, nationality
 *   - leaders: season-long stat leaders for this team, filtered from the
 *     MLS-wide Core API leaders endpoint (goals, assists, saves, shots, etc.)
 *
 * Caches per-team for 10 minutes; the league-wide leaders blob is cached
 * for 1 hour in a module-level variable.
 */

const CACHE_TTL_MS = 10 * 60_000
const LEADERS_TTL_MS = 60 * 60_000

interface CacheEntry {
  data: TeamDetailResponse
  fetchedAt: number
}

const cache = new Map<string, CacheEntry>()

// ── Shared league-wide leaders cache ─────────────────────────────────────────
interface RawLeader {
  value: number
  displayValue: string
  athleteRef: string
  teamId: string // extracted from team.$ref
}
interface RawCategory {
  name: string
  displayName: string
  leaders: RawLeader[]
}
let leadersBlobCache: RawCategory[] | null = null
let leadersBlobFetchedAt = 0

export interface RosterPlayer {
  id: string
  displayName: string
  shortName: string
  jersey: string
  position: string
  positionName: string
  nationality: string
  headshot: string
  starter?: boolean
}

export interface StatLeader {
  athleteId: string
  displayName: string
  jersey: string
  headshot: string
  value: number
  displayValue: string
}

export interface StatCategory {
  name: string
  displayName: string
  leaders: StatLeader[]
}

export interface TeamDetailResponse {
  teamId: string
  roster: RosterPlayer[]
  leaders: StatCategory[]
}

// Categories we want to show in the Leaders tab
const WANTED_CATS = [
  'goals',
  'assists',
  'saves',
  'shotsOnTarget',
  'totalShots',
  'accuratePasses',
  'yellowCards',
  'redCards',
]

function extractTeamId(ref: string): string {
  const m = /\/teams\/(\d+)/.exec(ref)
  return m?.[1] ?? ''
}

function extractAthleteId(ref: string): string {
  const m = /\/athletes\/(\d+)/.exec(ref)
  return m?.[1] ?? ''
}

function toBaseAthleteUrl(seasonRef: string): string {
  return seasonRef.replace(/\/seasons\/\d+\/athletes\//, '/athletes/')
}

async function fetchLeadersBlob(): Promise<RawCategory[]> {
  const now = Date.now()
  if (leadersBlobCache && now - leadersBlobFetchedAt < LEADERS_TTL_MS) {
    return leadersBlobCache
  }

  const url =
    'https://sports.core.api.espn.com/v2/sports/soccer/leagues/usa.1/seasons/2026/types/1/leaders'
  const raw = await $fetch<Record<string, unknown>>(url)
  const categories = (raw.categories as Array<Record<string, unknown>>) ?? []

  leadersBlobCache = categories
    .filter((c) => WANTED_CATS.includes(c.name as string))
    .map((c) => {
      const leaders = (c.leaders as Array<Record<string, unknown>>) ?? []
      return {
        name: c.name as string,
        displayName: (c.displayName as string) ?? (c.name as string),
        leaders: leaders.map((l) => ({
          value: l.value as number,
          displayValue: (l.displayValue as string) ?? String(l.value),
          athleteRef: (l.athlete as Record<string, unknown>)?.[
            '$ref'
          ] as string,
          teamId: extractTeamId(
            ((l.team as Record<string, unknown>)?.['$ref'] as string) ?? ''
          ),
        })),
      }
    })

  leadersBlobFetchedAt = now
  return leadersBlobCache
}

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

  // ── Fetch roster + league leaders in parallel ─────────────────────────────
  const [rosterResult, leadersBlob] = await Promise.allSettled([
    $fetch<Record<string, unknown>>(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/teams/${teamId}/roster`
    ),
    fetchLeadersBlob(),
  ])

  // ── Parse roster ──────────────────────────────────────────────────────────
  const roster: RosterPlayer[] = []

  if (rosterResult.status === 'fulfilled') {
    const raw = rosterResult.value
    const athletes = (raw.athletes as Array<Record<string, unknown>>) ?? []

    for (const group of athletes) {
      const items = (group.items as Array<Record<string, unknown>>) ?? []
      for (const p of items) {
        const pos = p.position as Record<string, unknown> | undefined
        const headshots = p.headshot as Record<string, unknown> | undefined
        const flag = p.flag as Record<string, unknown> | undefined

        roster.push({
          id: p.id as string,
          displayName: p.displayName as string,
          shortName: p.shortName as string,
          jersey: (p.jersey as string) ?? '',
          position:
            (pos?.abbreviation as string) ?? (pos?.name as string) ?? '',
          positionName: (pos?.displayName as string) ?? '',
          nationality: (flag?.alt as string) ?? '',
          headshot: (headshots?.href as string) ?? '',
        })
      }
    }
  }

  // ── Build per-team leaders from the league blob ───────────────────────────
  const leaders: StatCategory[] = []

  if (leadersBlob.status === 'fulfilled') {
    const blob = leadersBlob.value

    // Collect unique athlete refs that belong to this team
    const athleteRefs = new Set<string>()
    for (const cat of blob) {
      for (const l of cat.leaders) {
        if (l.teamId === teamId && l.athleteRef) {
          athleteRefs.add(l.athleteRef)
        }
      }
    }

    // Resolve athlete names + jerseys in parallel
    const athleteCache = new Map<
      string,
      {
        athleteId: string
        displayName: string
        jersey: string
        headshot: string
      }
    >()

    await Promise.all(
      Array.from(athleteRefs).map(async (ref) => {
        const baseUrl = toBaseAthleteUrl(ref)
        const athleteId = extractAthleteId(ref)
        try {
          const data = await $fetch<Record<string, unknown>>(baseUrl)
          const headshotObj = data.headshot as
            Record<string, unknown> | null | undefined
          athleteCache.set(ref, {
            athleteId,
            displayName: (data.displayName as string) ?? 'Unknown',
            jersey: (data.jersey as string) ?? '',
            headshot: (headshotObj?.href as string) ?? '',
          })
        } catch {
          athleteCache.set(ref, {
            athleteId,
            displayName: 'Unknown',
            jersey: '',
            headshot: '',
          })
        }
      })
    )

    // Build filtered categories
    for (const cat of blob) {
      const teamLeaders: StatLeader[] = cat.leaders
        .filter((l) => l.teamId === teamId && l.athleteRef)
        .slice(0, 5)
        .map((l) => {
          const resolved = athleteCache.get(l.athleteRef)
          return {
            athleteId: resolved?.athleteId ?? '',
            displayName: resolved?.displayName ?? 'Unknown',
            jersey: resolved?.jersey ?? '',
            headshot: resolved?.headshot ?? '',
            value: Math.round(l.value),
            displayValue: l.displayValue,
          }
        })

      if (teamLeaders.length > 0) {
        leaders.push({
          name: cat.name,
          displayName: cat.displayName,
          leaders: teamLeaders,
        })
      }
    }
  }

  const result: TeamDetailResponse = { teamId, roster, leaders }
  cache.set(teamId, { data: result, fetchedAt: now })
  return result
})
