<script setup lang="ts">
  import {
    useMyTeam,
    TEAM_SHORT_NAME,
    TEAM_LOGO,
    TEAM_CONFERENCE,
    TEAM_COLORS,
    buildPalette,
  } from '~/composables/useMyTeam'
  import { useTimezone } from '~/composables/useTimezone'
  import type { Match } from '~/composables/useScores'

  const props = defineProps<{
    open: boolean
    viewTeam?: string | null
  }>()

  const emit = defineEmits<{
    close: []
    'select-team': [team: string]
    'view-standings': [conference: string]
  }>()

  const { selectedTeam } = useMyTeam()
  const { iana } = useTimezone()

  // The team to display — either the explicitly passed viewTeam, or My Team
  const displayTeam = computed(() => props.viewTeam ?? selectedTeam.value)

  // Logo for the displayed team
  const displayLogoUrl = computed(() => {
    const team = displayTeam.value
    return team ? (TEAM_LOGO[team] ?? null) : null
  })

  // Local palette for the viewed team — applied as inline CSS vars on the card
  // so the modal uses that team's colors without touching the global theme
  const modalCardStyle = computed(() => {
    const team = displayTeam.value
    if (!team) return {}
    const hex = TEAM_COLORS[team] ?? '#6b7280'
    const palette = buildPalette(hex)
    const vars: Record<string, string> = {}
    for (const [stop, value] of Object.entries(palette)) {
      vars[`--color-theme-${stop}`] = value
    }
    vars['--color-theme-primary'] = hex
    // Override --app-bg so the card background uses this team's dark shade
    vars['--app-bg'] = palette['950'] ?? '#0f172a'
    return vars
  })

  // ── ESPN team ID map ──────────────────────────────────────────────────────────
  const TEAM_ESPN_ID: Record<string, string> = {
    'Atlanta United FC': '18418',
    'Austin FC': '20906',
    'CF Montréal': '9720',
    'Charlotte FC': '21300',
    'Chicago Fire FC': '182',
    'Colorado Rapids': '184',
    'Columbus Crew': '183',
    'D.C. United': '193',
    'FC Cincinnati': '18267',
    'FC Dallas': '185',
    'Houston Dynamo FC': '6077',
    'Inter Miami CF': '20232',
    'LA Galaxy': '187',
    LAFC: '18966',
    'Minnesota United FC': '17362',
    'Nashville SC': '18986',
    'New England Revolution': '189',
    'New York City FC': '17606',
    'Orlando City SC': '12011',
    'Philadelphia Union': '10739',
    'Portland Timbers': '9723',
    'Real Salt Lake': '4771',
    'Red Bull New York': '190',
    'San Diego FC': '22529',
    'San Jose Earthquakes': '191',
    'Seattle Sounders FC': '9726',
    'Sporting Kansas City': '186',
    'St. Louis City SC': '21812',
    'St. Louis CITY SC': '21812',
    'Toronto FC': '7318',
    'Vancouver Whitecaps': '9727',
  }

  // ── Venue map ─────────────────────────────────────────────────────────────────
  const TEAM_VENUE: Record<string, string> = {
    'Atlanta United FC': 'Mercedes-Benz Stadium, Atlanta, GA',
    'Austin FC': 'Q2 Stadium, Austin, TX',
    'CF Montréal': 'Stade Saputo, Montreal, QC',
    'Charlotte FC': 'Bank of America Stadium, Charlotte, NC',
    'Chicago Fire FC': 'Soldier Field, Chicago, IL',
    'Colorado Rapids': "Dick's Sporting Goods Park, Commerce City, CO",
    'Columbus Crew': 'Lower.com Field, Columbus, OH',
    'D.C. United': 'Audi Field, Washington, D.C.',
    'FC Cincinnati': 'TQL Stadium, Cincinnati, OH',
    'FC Dallas': 'Toyota Stadium, Frisco, TX',
    'Houston Dynamo FC': 'Shell Energy Stadium, Houston, TX',
    'Inter Miami CF': 'Chase Stadium, Fort Lauderdale, FL',
    'LA Galaxy': 'Dignity Health Sports Park, Carson, CA',
    LAFC: 'BMO Stadium, Los Angeles, CA',
    'Minnesota United FC': 'Allianz Field, St. Paul, MN',
    'Nashville SC': 'GEODIS Park, Nashville, TN',
    'New England Revolution': 'Gillette Stadium, Foxborough, MA',
    'New York City FC': 'Yankee Stadium, Bronx, NY',
    'Orlando City SC': 'Inter&Co Stadium, Orlando, FL',
    'Philadelphia Union': 'Subaru Park, Chester, PA',
    'Portland Timbers': 'Providence Park, Portland, OR',
    'Real Salt Lake': 'America First Field, Sandy, UT',
    'Red Bull New York': 'Red Bull Arena, Harrison, NJ',
    'San Diego FC': 'Snapdragon Stadium, San Diego, CA',
    'San Jose Earthquakes': 'PayPal Park, San Jose, CA',
    'Seattle Sounders FC': 'Lumen Field, Seattle, WA',
    'Sporting Kansas City': "Children's Mercy Park, Kansas City, KS",
    'St. Louis City SC': 'CITYPARK, St. Louis, MO',
    'St. Louis CITY SC': 'CITYPARK, St. Louis, MO',
    'Toronto FC': 'BMO Field, Toronto, ON',
    'Vancouver Whitecaps': 'BC Place, Vancouver, BC',
  }

  // ── Schedule data ─────────────────────────────────────────────────────────────
  interface ScheduleEvent {
    id: string
    name: string
    date: string
    homeTeam: string
    awayTeam: string
    homeColor: string
    awayColor: string
    homeScore: string | null
    awayScore: string | null
    homeRec: string
    awayRec: string
    venue: string
    statusCode: 'ns' | 'ft' | 'live' | 'ht'
    statusClock?: string
    isHome: boolean
  }

  const scheduleEvents = ref<ScheduleEvent[]>([])
  const scheduleLoading = ref(false)
  const scheduleError = ref<string | null>(null)

  // ESPN returns score as an object: { $ref, value, displayValue, ... }
  function extractScore(score: unknown): string | null {
    if (score == null) return null
    if (typeof score === 'string') return score
    if (typeof score === 'number') return String(score)
    if (typeof score === 'object') {
      const s = score as Record<string, unknown>
      if (s.displayValue != null) return String(s.displayValue)
      if (s.value != null) return String(Math.round(s.value as number))
    }
    return null
  }

  function resolveColor(color?: string, alt?: string): string {
    const primary = color ? `#${color.replace(/^#/, '')}` : ''
    const alternate = alt ? `#${alt.replace(/^#/, '')}` : ''
    if (!primary || primary.toLowerCase() === '#000000')
      return alternate || '#888888'
    return primary
  }

  function parseStatusCode(
    comp: Record<string, unknown>
  ): 'ns' | 'ft' | 'live' | 'ht' {
    const status = comp.status as Record<string, unknown> | undefined
    const type = status?.type as Record<string, unknown> | undefined
    const state = (type?.state as string) || ''
    const completed = type?.completed as boolean | undefined
    const name = (type?.name as string) || ''
    if (completed === true || state === 'post') return 'ft'
    if (name === 'STATUS_HALFTIME') return 'ht'
    if (state === 'in') return 'live'
    return 'ns'
  }

  function evtToScheduleEvent(
    evt: Record<string, unknown>,
    teamName: string,
    teamId: string
  ): ScheduleEvent {
    const comps = (evt.competitions as Array<Record<string, unknown>>) || []
    const comp = comps[0] || {}
    const competitors =
      (comp.competitors as Array<Record<string, unknown>>) || []
    const home =
      competitors.find((c) => c.homeAway === 'home') || competitors[0] || {}
    const away =
      competitors.find((c) => c.homeAway === 'away') || competitors[1] || {}
    const homeTeam = home.team as Record<string, unknown> | undefined
    const awayTeam = away.team as Record<string, unknown> | undefined

    const homeRecs = home.records as Array<Record<string, unknown>> | undefined
    const awayRecs = away.records as Array<Record<string, unknown>> | undefined
    const homeRec =
      (homeRecs?.find((r) => r.type === 'total' || r.abbreviation === 'Total')
        ?.summary as string) || '–'
    const awayRec =
      (awayRecs?.find((r) => r.type === 'total' || r.abbreviation === 'Total')
        ?.summary as string) || '–'

    const venue = comp.venue as Record<string, unknown> | undefined
    const statusCode = parseStatusCode(comp)
    const status = comp.status as Record<string, unknown> | undefined

    const myTeamComp = competitors.find((c) => {
      const t = c.team as Record<string, unknown> | undefined
      return t?.displayName === teamName || t?.id === teamId
    })
    const isHome = myTeamComp?.homeAway === 'home'

    return {
      id: evt.id as string,
      name: evt.name as string,
      date: evt.date as string,
      homeTeam: (homeTeam?.displayName as string) || '?',
      awayTeam: (awayTeam?.displayName as string) || '?',
      homeColor: resolveColor(
        homeTeam?.color as string,
        homeTeam?.alternateColor as string
      ),
      awayColor: resolveColor(
        awayTeam?.color as string,
        awayTeam?.alternateColor as string
      ),
      homeScore: extractScore(home.score),
      awayScore: extractScore(away.score),
      homeRec,
      awayRec,
      venue: (venue?.fullName as string) || '',
      statusCode,
      statusClock: (status?.displayClock as string) || undefined,
      isHome,
    }
  }

  async function loadSchedule(teamName: string) {
    const teamId = TEAM_ESPN_ID[teamName]
    if (!teamId) return

    scheduleLoading.value = true
    scheduleError.value = null
    scheduleEvents.value = []

    try {
      // Fetch team schedule + this & next week's scoreboard in parallel.
      // The ESPN team schedule endpoint omits live/upcoming games, so we
      // supplement with the scoreboard to catch today's live/upcoming matches.
      const [scheduleData, scoreboardThis, scoreboardNext] =
        await Promise.allSettled([
          $fetch<Record<string, unknown>>(`/api/schedule?teamId=${teamId}`),
          $fetch<Record<string, unknown>>(`/api/scores?week=this`),
          $fetch<Record<string, unknown>>(`/api/scores?week=next`),
        ])

      const scheduleEvents_raw: ScheduleEvent[] = []
      const seenIds = new Set<string>()

      // 1. Parse team schedule events
      if (scheduleData.status === 'fulfilled') {
        const events =
          (scheduleData.value.events as Array<Record<string, unknown>>) || []
        for (const evt of events) {
          const se = evtToScheduleEvent(evt, teamName, teamId)
          scheduleEvents_raw.push(se)
          seenIds.add(se.id)
        }
      }

      // 2. Merge scoreboard events involving this team (live/upcoming/today)
      for (const scoreboardData of [scoreboardThis, scoreboardNext]) {
        if (scoreboardData.status !== 'fulfilled') continue
        const events =
          (scoreboardData.value.events as Array<Record<string, unknown>>) || []
        for (const evt of events) {
          const id = evt.id as string
          if (seenIds.has(id)) continue
          // Check if this team is in the match
          const comps =
            (evt.competitions as Array<Record<string, unknown>>) || []
          const comp = comps[0] || {}
          const competitors =
            (comp.competitors as Array<Record<string, unknown>>) || []
          const involved = competitors.some((c) => {
            const t = c.team as Record<string, unknown> | undefined
            return (
              t?.displayName === teamName ||
              t?.id === teamId ||
              (t?.displayName as string)
                ?.toLowerCase()
                .includes(teamName.toLowerCase().split(' ')[0] ?? '')
            )
          })
          if (!involved) continue
          const se = evtToScheduleEvent(evt, teamName, teamId)
          scheduleEvents_raw.push(se)
          seenIds.add(se.id)
        }
      }

      scheduleEvents.value = scheduleEvents_raw.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )
    } catch {
      scheduleError.value = 'Could not load schedule.'
    } finally {
      scheduleLoading.value = false
    }
  }

  // Load schedule when modal opens or the displayed team changes
  watch(
    () => props.open,
    (isOpen) => {
      if (isOpen && displayTeam.value) {
        loadSchedule(displayTeam.value)
      }
    }
  )

  watch(displayTeam, (team) => {
    if (props.open && team) loadSchedule(team)
  })

  // ── Convert ScheduleEvent → Match for GameBlock ───────────────────────────────
  function toMatch(evt: ScheduleEvent): Match {
    return {
      id: evt.id,
      date: evt.date,
      home: evt.homeTeam,
      homeRec: evt.homeRec,
      homeScore: evt.homeScore,
      homeColor: evt.homeColor,
      homeLogo: TEAM_LOGO[evt.homeTeam] ?? null,
      away: evt.awayTeam,
      awayRec: evt.awayRec,
      awayScore: evt.awayScore,
      awayColor: evt.awayColor,
      awayLogo: TEAM_LOGO[evt.awayTeam] ?? null,
      status: { code: evt.statusCode, clock: evt.statusClock },
      kickoffSlot: 0,
      qualityScore: 0,
    }
  }

  // Split into past and upcoming
  const pastEvents = computed(() =>
    scheduleEvents.value
      .filter((e) => e.statusCode === 'ft')
      .slice(-5)
      .reverse()
  )
  const upcomingEvents = computed(() =>
    scheduleEvents.value
      .filter(
        (e) =>
          e.statusCode === 'ns' ||
          e.statusCode === 'live' ||
          e.statusCode === 'ht'
      )
      .slice(0, 5)
  )

  const pastMatches = computed(() => pastEvents.value.map(toMatch))
  const upcomingMatches = computed(() =>
    upcomingEvents.value.map((evt, i) => {
      const m = toMatch(evt)
      // Only show W/T/L record on the very next game
      if (i > 0) {
        m.homeRec = ''
        m.awayRec = ''
      }
      return m
    })
  )

  const displayName = computed(() =>
    displayTeam.value
      ? (TEAM_SHORT_NAME[displayTeam.value] ?? displayTeam.value)
      : ''
  )

  const venue = computed(() =>
    displayTeam.value ? (TEAM_VENUE[displayTeam.value] ?? '') : ''
  )

  const conference = computed(() =>
    displayTeam.value ? (TEAM_CONFERENCE[displayTeam.value] ?? '') : ''
  )
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open && displayTeam"
        class="modal-backdrop"
        @click.self="emit('close')"
      >
        <div
          class="modal-card"
          :style="modalCardStyle"
          role="dialog"
          aria-modal="true"
        >
          <!-- Close button -->
          <button class="modal-close" @click="emit('close')" aria-label="Close">
            ✕
          </button>

          <!-- Header: logo + team name + venue -->
          <div class="modal-header">
            <img
              v-if="displayLogoUrl"
              :src="displayLogoUrl"
              :alt="displayTeam ?? ''"
              class="modal-logo"
            />
            <div class="modal-team-info">
              <div class="modal-team-name">{{ displayTeam }}</div>
              <div class="modal-venue">{{ venue }}</div>
            </div>
          </div>

          <!-- Schedule -->
          <div v-if="scheduleLoading" class="schedule-loading">
            <div v-for="i in 4" :key="i" class="skel-row" />
          </div>

          <div v-else-if="scheduleError" class="schedule-error">
            {{ scheduleError }}
          </div>

          <div v-else class="schedule-body">
            <!-- Conference heading — click to view standings -->
            <button
              v-if="conference"
              class="schedule-conference-heading"
              @click="emit('view-standings', conference)"
            >
              {{ conference }}
              <span class="conf-standings-arrow">›</span>
            </button>

            <!-- Upcoming -->
            <div v-if="upcomingMatches.length" class="schedule-section">
              <div class="schedule-list">
                <GameBlock
                  v-for="match in upcomingMatches"
                  :key="match.id"
                  :match="match"
                  @select-team="emit('select-team', $event)"
                />
              </div>
            </div>

            <!-- Recent results -->
            <div v-if="pastMatches.length" class="schedule-section">
              <div class="schedule-list">
                <GameBlock
                  v-for="match in pastMatches"
                  :key="match.id"
                  :match="match"
                  @select-team="emit('select-team', $event)"
                />
              </div>
            </div>

            <p
              v-if="!upcomingMatches.length && !pastMatches.length"
              class="schedule-empty"
            >
              No schedule data available.
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
  /* ── Backdrop ─────────────────────────────────────────────────────────────── */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: oklab(0% 0 0 / 0.6);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 4rem 1rem 2rem;
    overflow-y: auto;
  }

  /* ── Card ─────────────────────────────────────────────────────────────────── */
  .modal-card {
    position: relative;
    width: 100%;
    max-width: 36rem;
    background: color-mix(
      in oklab,
      var(--app-bg, #0f172a) 85%,
      var(--color-theme-950, #0f172a)
    );
    border: 1px solid var(--team-border, var(--color-theme-700, #374151));
    border-radius: 0.5rem;
    padding: 1.25rem;
    box-shadow: 0 16px 48px oklab(0% 0 0 / 0.6);
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* ── Close button ─────────────────────────────────────────────────────────── */
  .modal-close {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    background: transparent;
    border: none;
    color: var(--color-text-secondary);
    font-size: 0.875rem;
    cursor: pointer;
    padding: 0.25rem 0.375rem;
    border-radius: 0.25rem;
    line-height: 1;
    transition:
      color 0.15s,
      background 0.15s;
  }
  .modal-close:hover {
    color: var(--color-text-primary);
    background: oklab(100% 0 0 / 0.06);
  }

  /* ── Header ───────────────────────────────────────────────────────────────── */
  .modal-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding-right: 2rem; /* room for close btn */
  }

  .modal-logo {
    width: 3.4rem;
    height: 3.4rem;
    object-fit: contain;
    flex-shrink: 0;
  }

  .modal-team-info {
    display: flex;
    flex-direction: column;
    gap: 0;
    min-width: 0;
  }

  .modal-team-name {
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-size: 1.75rem;
    font-weight: 500;
    color: var(--color-text-primary);
    line-height: 1.42;
    letter-spacing: 0.02em;
  }

  .modal-venue {
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-size: 0.9375rem;
    color: var(--color-text-secondary);
    letter-spacing: 0.04em;
    line-height: 1.38;
  }

  .schedule-conference-heading {
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-size: 0.9rem;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-theme-500);
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.25em;
    transition: color 0.15s;
    text-align: left;
  }
  .schedule-conference-heading:hover {
    color: var(--color-theme-300);
  }
  .conf-standings-arrow {
    font-size: 1.1em;
    line-height: 1;
    opacity: 0.7;
    transition:
      opacity 0.15s,
      transform 0.15s;
  }
  .schedule-conference-heading:hover .conf-standings-arrow {
    opacity: 1;
    transform: translateX(0.15em);
  }

  /* ── Schedule body ────────────────────────────────────────────────────────── */
  .schedule-body {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .schedule-section-title {
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-size: 0.625rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-text-secondary);
    margin-bottom: 0.375rem;
  }

  .schedule-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.625rem;
  }
  @media (max-width: 480px) {
    .schedule-list {
      grid-template-columns: 1fr;
    }
  }

  /* ── Loading skeleton ─────────────────────────────────────────────────────── */
  .schedule-loading {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .skel-row {
    height: 3rem;
    border-radius: 0.375rem;
    background: oklab(100% 0 0 / 0.05);
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }

  .schedule-error,
  .schedule-empty {
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
    text-align: center;
    padding: 1rem 0;
  }

  /* ── Transition ───────────────────────────────────────────────────────────── */
  .modal-enter-active,
  .modal-leave-active {
    transition:
      opacity 0.2s ease,
      transform 0.2s ease;
  }

  .modal-enter-from,
  .modal-leave-to {
    opacity: 0;
  }

  .modal-enter-from .modal-card,
  .modal-leave-to .modal-card {
    transform: translateY(-0.5rem) scale(0.98);
  }
</style>
