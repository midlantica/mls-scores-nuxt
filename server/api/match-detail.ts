// Server-side API route: proxies ESPN's MLS match summary API
// Accepts ?eventId=<espnEventId>
// Returns boxscore stats, odds, rosters, head-to-head, venue, leaders

const CACHE_TTL_LIVE_MS = 30_000 // 30 s during live matches
const CACHE_TTL_IDLE_MS = 5 * 60_000 // 5 min for completed/pre-match

interface CacheEntry {
  data: Record<string, unknown>
  fetchedAt: number
  isLive: boolean
}

const cache = new Map<string, CacheEntry>()

function isLiveEvent(data: Record<string, unknown>): boolean {
  const header = data.header as Record<string, unknown> | undefined
  const comps = (header?.competitions as Array<Record<string, unknown>>) ?? []
  const status = comps[0]?.status as Record<string, unknown> | undefined
  const type = status?.type as Record<string, unknown> | undefined
  return type?.state === 'in' || type?.name === 'STATUS_HALFTIME'
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const eventId = query.eventId as string | undefined

  if (!eventId) {
    throw createError({ statusCode: 400, message: 'eventId is required' })
  }

  const now = Date.now()
  const cached = cache.get(eventId)

  if (cached) {
    const ttl = cached.isLive ? CACHE_TTL_LIVE_MS : CACHE_TTL_IDLE_MS
    if (now - cached.fetchedAt < ttl) return cached.data
  }

  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/summary?event=${eventId}`

  try {
    const raw = await $fetch<Record<string, unknown>>(url)

    // ── Extract only what the UI needs (keep payload small) ──────────────────
    const header = raw.header as Record<string, unknown> | undefined
    const comps = (header?.competitions as Array<Record<string, unknown>>) ?? []
    const comp0 = comps[0] ?? {}
    const competitors =
      (comp0.competitors as Array<Record<string, unknown>>) ?? []

    // Teams from header
    const teams = competitors.map((c) => {
      const t = c.team as Record<string, unknown> | undefined
      const records = (c.record as Array<Record<string, unknown>>) ?? []
      const totalRec = records.find((r) => r.type === 'total')
      const ptsRec = records.find((r) => r.type === 'points')
      return {
        id: t?.id as string,
        displayName: t?.displayName as string,
        abbreviation: t?.abbreviation as string,
        homeAway: c.homeAway as string,
        record: (totalRec?.summary as string) ?? '–',
        points: (ptsRec?.summary as string) ?? '–',
        score: (c.score as string) ?? null,
        color: t?.color as string | undefined,
        alternateColor: t?.alternateColor as string | undefined,
        logo: (t?.logos as Array<Record<string, unknown>>)?.[0]?.href as
          | string
          | undefined,
      }
    })

    // Boxscore stats
    const boxscore = raw.boxscore as Record<string, unknown> | undefined
    const bsTeams = (boxscore?.teams as Array<Record<string, unknown>>) ?? []
    const teamStats = bsTeams.map((bt) => {
      const t = bt.team as Record<string, unknown> | undefined
      const stats = (bt.statistics as Array<Record<string, unknown>>) ?? []
      return {
        teamId: t?.id as string,
        displayName: t?.displayName as string,
        stats: stats.map((s) => ({
          name: s.name as string,
          displayValue: s.displayValue as string,
        })),
      }
    })

    // Odds
    const oddsArr = (raw.odds as Array<Record<string, unknown>>) ?? []
    const odds0 = oddsArr[0] ?? {}
    const homeOdds = odds0.homeTeamOdds as Record<string, unknown> | undefined
    const awayOdds = odds0.awayTeamOdds as Record<string, unknown> | undefined
    const drawOdds = odds0.drawOdds as Record<string, unknown> | undefined
    const bettingOdds = odds0.bettingOdds as Record<string, unknown> | undefined
    const teamOdds = bettingOdds?.teamOdds as
      | Record<string, unknown>
      | undefined

    const odds = {
      provider: (odds0.provider as Record<string, unknown>)?.name as
        | string
        | undefined,
      home: {
        summary: (homeOdds?.odds as Record<string, unknown>)?.summary as
          | string
          | undefined,
        moneyLine: (homeOdds?.odds as Record<string, unknown>)?.value as
          | number
          | undefined,
      },
      away: {
        summary: (awayOdds?.odds as Record<string, unknown>)?.summary as
          | string
          | undefined,
        moneyLine: (awayOdds?.odds as Record<string, unknown>)?.value as
          | number
          | undefined,
      },
      draw: {
        summary: (drawOdds as Record<string, unknown>)?.summary as
          | string
          | undefined,
        moneyLine: (drawOdds as Record<string, unknown>)?.moneyLine as
          | number
          | undefined,
      },
      // Pre-match full-time result odds (fractional)
      preMatchHome: (
        teamOdds?.preMatchFullTimeResultHome as Record<string, unknown>
      )?.value as string | undefined,
      preMatchAway: (
        teamOdds?.preMatchFullTimeResultAway as Record<string, unknown>
      )?.value as string | undefined,
      preMatchDraw: (
        teamOdds?.preMatchFullTimeResultDraw as Record<string, unknown>
      )?.value as string | undefined,
    }

    // Rosters
    const rostersRaw = (raw.rosters as Array<Record<string, unknown>>) ?? []
    const rosters = rostersRaw.map((r) => {
      const t = r.team as Record<string, unknown> | undefined
      const roster = (r.roster as Array<Record<string, unknown>>) ?? []
      return {
        teamId: t?.id as string,
        displayName: t?.displayName as string,
        players: roster.map((p) => {
          const a = p.athlete as Record<string, unknown> | undefined
          const pos = p.position as Record<string, unknown> | undefined
          return {
            id: a?.id as string,
            displayName: a?.displayName as string,
            shortName: a?.shortName as string,
            jersey: p.jersey as string | undefined,
            position:
              (pos?.abbreviation as string) ?? (pos?.name as string) ?? '',
            positionName: pos?.displayName as string | undefined,
            starter: p.starter as boolean,
            subbedIn: p.subbedIn as boolean,
            subbedOut: p.subbedOut as boolean,
          }
        }),
      }
    })

    // ── Key events: goals + cards ─────────────────────────────────────────────
    // Parse keyEvents into a structured list for the scorers row in the header.
    // Each entry: { teamId, type: 'goal'|'yellow'|'red', lastName, clock }
    const keyEvents = (raw.keyEvents as Array<Record<string, unknown>>) ?? []

    interface MatchEvent {
      teamId: string
      type: 'goal' | 'yellow' | 'red'
      lastName: string
      clock: string
      isOG?: boolean
      isPenalty?: boolean
    }

    const matchEvents: MatchEvent[] = []

    // Map: teamId → Map<athleteName, goalCount>
    const goalsByTeam = new Map<string, Map<string, number>>()

    for (const ke of keyEvents) {
      // ke.type is an object: { id, text, type }
      // Use the machine-readable slug (.type.type) for reliable matching:
      //   "goal", "own-goal", "yellow-card", "red-card"
      const typeObj = ke.type as Record<string, unknown> | undefined
      const typeSlug =
        (typeObj?.type as string | undefined)?.toLowerCase() ?? ''
      const keTeam = ke.team as Record<string, unknown> | undefined
      const teamId = keTeam?.id as string | undefined
      if (!teamId) continue

      const participants =
        (ke.participants as Array<Record<string, unknown>>) ?? []
      const ath = participants[0]?.athlete as
        | Record<string, unknown>
        | undefined
      const athleteName = (ath?.displayName as string | undefined) ?? ''
      // Use last name only (last word of display name)
      const lastName = athleteName.split(' ').pop() ?? athleteName

      // Clock: ESPN provides clock.displayValue like "22'" or "45+2'"
      const clockObj = ke.clock as Record<string, unknown> | undefined
      const clock = (clockObj?.displayValue as string | undefined) ?? ''

      if (
        (typeSlug.includes('goal') || typeSlug === 'penalty---scored') &&
        typeSlug !== 'own-goal'
      ) {
        // Regular goal (covers "goal", "penalty-goal", "header-goal", etc.)
        // Credit to the scoring team
        if (!goalsByTeam.has(teamId)) goalsByTeam.set(teamId, new Map())
        const teamGoals = goalsByTeam.get(teamId)!
        if (athleteName)
          teamGoals.set(athleteName, (teamGoals.get(athleteName) ?? 0) + 1)

        // Always push goal events — even if ESPN provides no participant name
        // (will render as ⚽ 25' with no name, better than showing nothing)
        matchEvents.push({
          teamId,
          type: 'goal',
          lastName: lastName || '',
          clock,
          isPenalty: typeSlug === 'penalty---scored',
        })
      } else if (typeSlug === 'own-goal') {
        // Own goal — ESPN's teamId is the team whose player scored it (conceding team).
        // The goal counts for the OTHER team (the benefiting team).
        // Find the opponent's teamId from the competitors list.
        const opponentId = competitors.find(
          (c) => (c.team as Record<string, unknown>)?.id !== teamId
        )
          ? ((
              competitors.find(
                (c) => (c.team as Record<string, unknown>)?.id !== teamId
              )?.team as Record<string, unknown>
            )?.id as string | undefined)
          : undefined
        // Always push own-goal events even without a player name
        if (opponentId) {
          matchEvents.push({
            teamId: opponentId,
            type: 'goal',
            lastName: lastName || '',
            clock,
            isOG: true,
          })
        }
      } else if (typeSlug === 'yellow-card') {
        if (lastName) {
          matchEvents.push({ teamId, type: 'yellow', lastName, clock })
        }
      } else if (typeSlug === 'red-card') {
        if (lastName) {
          matchEvents.push({ teamId, type: 'red', lastName, clock })
        }
      }
    }

    // Leaders
    const leadersRaw = (raw.leaders as Array<Record<string, unknown>>) ?? []
    const leaders = leadersRaw.map((l) => {
      const t = l.team as Record<string, unknown> | undefined
      const teamId = t?.id as string
      const cats = (l.leaders as Array<Record<string, unknown>>) ?? []
      const categories = cats.map((cat) => {
        const topLeaders = (cat.leaders as Array<Record<string, unknown>>) ?? []
        const top = topLeaders[0] ?? {}
        const ath = top.athlete as Record<string, unknown> | undefined
        // For passes, prefer the summary (e.g. "69 PASS") which shows total
        // attempts, falling back to displayValue (accurate passes only).
        // For other categories just use displayValue.
        const catName = cat.name as string
        const summary = top.summary as string | undefined
        const displayVal = top.displayValue as string | undefined
        // Use summary for passes so we show total attempts (e.g. "69")
        // rather than only accurate passes (e.g. "66")
        let value: string | undefined
        if (catName === 'accuratePasses' && summary) {
          // summary is like "69 PASS" — extract just the number
          const summaryNum = summary.split(' ')[0]
          value = summaryNum ?? displayVal
        } else {
          value = displayVal
        }
        return {
          name: catName,
          displayName: cat.displayName as string,
          shortDisplayName: cat.shortDisplayName as string,
          athlete: ath?.displayName as string | undefined,
          value,
        }
      })

      // Augment or inject goals leader using in-match keyEvents data
      if (teamId && goalsByTeam.has(teamId)) {
        const teamGoals = goalsByTeam.get(teamId)!
        const existingGoals = categories.find((c) => c.name === 'goals')

        if (existingGoals) {
          // ESPN leaders already has a goals entry — add in-match goals to it
          // if the top scorer in this match is the same athlete
          const existingAthlete = existingGoals.athlete ?? ''
          const inMatchCount = teamGoals.get(existingAthlete) ?? 0
          if (inMatchCount > 0) {
            const base = parseInt(existingGoals.value ?? '0') || 0
            existingGoals.value = String(base + inMatchCount)
          }
        } else {
          // No goals entry from ESPN — inject one from keyEvents
          let topAthlete = ''
          let topCount = 0
          for (const [name, count] of teamGoals) {
            if (count > topCount) {
              topCount = count
              topAthlete = name
            }
          }
          if (topAthlete) {
            categories.unshift({
              name: 'goals',
              displayName: 'Goals',
              shortDisplayName: 'Goals',
              athlete: topAthlete,
              value: String(topCount),
            })
          }
        }
      }

      return {
        teamId,
        displayName: t?.displayName as string,
        categories,
      }
    })

    // Head-to-head
    // ESPN returns headToHeadGames as [{ team, events: [...] }]
    // We flatten all events from the first entry (home team perspective)
    const h2hRaw = (raw.headToHeadGames as Array<Record<string, unknown>>) ?? []
    const h2hFirst = h2hRaw[0]
    const h2hEvents: Array<Record<string, unknown>> = h2hFirst
      ? ((h2hFirst.events as Array<Record<string, unknown>>) ?? [])
      : []
    const headToHead = h2hEvents.slice(0, 5).map((g) => ({
      id: g.id as string,
      date: g.gameDate as string,
      score: g.score as string,
      result: g.gameResult as string, // W/L/D from home team perspective
      atVs: g.atVs as string,
      competition: g.competitionName as string,
    }))

    // Game info
    const gameInfo = raw.gameInfo as Record<string, unknown> | undefined
    const venue = gameInfo?.venue as Record<string, unknown> | undefined
    const venueAddr = venue?.address as Record<string, unknown> | undefined
    const info = {
      attendance: gameInfo?.attendance as number | undefined,
      venue: venue?.fullName as string | undefined,
      city: venueAddr?.city as string | undefined,
      country: venueAddr?.country as string | undefined,
    }

    const result = {
      eventId,
      teams,
      teamStats,
      odds,
      rosters,
      leaders,
      headToHead,
      info,
      matchEvents,
      hasOdds: raw.hasOdds as boolean | undefined,
    }

    const live = isLiveEvent(raw)
    cache.set(eventId, {
      data: result as unknown as Record<string, unknown>,
      fetchedAt: now,
      isLive: live,
    })
    return result
  } catch (err: unknown) {
    if (cached) return cached.data
    const message = err instanceof Error ? err.message : String(err)
    throw createError({
      statusCode: 502,
      message: `ESPN API error: ${message}`,
    })
  }
})
