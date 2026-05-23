<script setup lang="ts">
  import { wcagContrast } from 'culori'
  import {
    useMyTeam,
    TEAM_SHORT_NAME,
    TEAM_LOGO,
    TEAM_CONFERENCE,
    TEAM_ESPN_ID,
    TEAM_VENUE,
    TEAM_VENUE_SHORT,
    buildPalette,
  } from '~/composables/useMyTeam'
  import { TEAM_COLORS, TEAM_COLOR_PAIRS } from '~/composables/useTeamColors'
  import { useTimezone } from '~/composables/useTimezone'
  import type { Match } from '~/composables/useScores'
  import { calcQuality, calcBadge } from '~/composables/useScores'

  const props = defineProps<{
    open: boolean
    viewTeam?: string | null
  }>()

  const emit = defineEmits<{
    close: []
    'select-team': [team: string]
    'view-standings': [conference: string]
    'open-game-detail': [match: Match]
  }>()

  const { selectedTeam } = useMyTeam()
  const { iana } = useTimezone()

  const displayTeam = computed(() => props.viewTeam ?? selectedTeam.value)

  const displayLogoUrl = computed(() => {
    const team = displayTeam.value
    return team ? (TEAM_LOGO[team] ?? null) : null
  })

  const modalCardStyle = computed(() => {
    const team = displayTeam.value
    if (!team) return {}
    const pair = TEAM_COLOR_PAIRS[team]
    const primary = pair?.primary ?? TEAM_COLORS[team] ?? '#6b7280'
    const secondary = pair?.secondary
    const palette = buildPalette(primary, secondary)
    const vars: Record<string, string> = {}
    for (const [stop, value] of Object.entries(palette)) {
      vars[`--color-theme-${stop}`] = value
    }
    vars['--color-theme-primary'] = primary
    vars['--color-theme-secondary'] = secondary ?? palette['950'] ?? '#0f172a'
    vars['--app-bg'] = palette['950'] ?? '#0f172a'
    // Compute on-primary contrast color for text on the primary header background
    const white = '#ffffff'
    const dark = '#0f172a'
    vars['--color-theme-on-primary'] =
      wcagContrast(primary, white) >= wcagContrast(primary, dark) ? white : dark
    // Scrollbar thumb: whichever of primary/secondary has the highest contrast against black
    const black = '#000000'
    const sec = secondary ?? palette['950'] ?? primary
    vars['--color-theme-scrollbar'] =
      wcagContrast(primary, black) >= wcagContrast(sec, black) ? primary : sec
    return vars
  })

  // CSS custom properties only cascade DOWN the DOM tree. The backdrop is the
  // PARENT of modal-card, so it cannot read vars set on modal-card. We need to
  // set --color-theme-scrollbar directly on the backdrop element too.
  const backdropStyle = computed(() => {
    const team = displayTeam.value
    if (!team) return {}
    const pair = TEAM_COLOR_PAIRS[team]
    const primary = pair?.primary ?? TEAM_COLORS[team] ?? '#6b7280'
    const secondary = pair?.secondary
    const palette = buildPalette(primary, secondary)
    const black = '#000000'
    const sec = secondary ?? palette['950'] ?? primary
    const scrollbar =
      wcagContrast(primary, black) >= wcagContrast(sec, black) ? primary : sec
    return { '--color-theme-scrollbar': scrollbar }
  })

  // ── Body scroll lock ──────────────────────────────────────────────────────
  // Prevent the page from scrolling (and showing its scrollbar) while the
  // modal is open. We add a class to <html> so we can use !important in CSS,
  // which is more reliable than inline styles competing with other rules.
  watchEffect(() => {
    if (import.meta.client) {
      if (props.open) {
        document.documentElement.classList.add('modal-open')
      } else {
        document.documentElement.classList.remove('modal-open')
      }
    }
  })

  onUnmounted(() => {
    if (import.meta.client) {
      document.documentElement.classList.remove('modal-open')
    }
  })

  // ── Tab state ─────────────────────────────────────────────────────────────
  type ModalTab = 'schedule' | 'leaders' | 'lineups' | 'fixtures'
  const TAB_ORDER: ModalTab[] = ['schedule', 'leaders', 'lineups', 'fixtures']
  const activeTab = ref<ModalTab>('schedule')
  const slideDir = ref<'left' | 'right'>('left')

  function setTab(tab: ModalTab) {
    const from = TAB_ORDER.indexOf(activeTab.value)
    const to = TAB_ORDER.indexOf(tab)
    slideDir.value = to > from ? 'left' : 'right'
    activeTab.value = tab
  }

  watch(
    () => props.open,
    (open) => {
      if (open) activeTab.value = 'schedule'
    }
  )

  // ── Team name normalization ───────────────────────────────────────────────
  const MODAL_TEAM_NAME_MAP: Record<string, string> = {
    'St. Louis CITY SC': 'St. Louis City SC',
  }
  function normalizeTeamName(name: string): string {
    return MODAL_TEAM_NAME_MAP[name] ?? name
  }

  // ── Schedule data ─────────────────────────────────────────────────────────
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
      homeTeam: normalizeTeamName((homeTeam?.displayName as string) || '?'),
      awayTeam: normalizeTeamName((awayTeam?.displayName as string) || '?'),
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
      const [scheduleData, scoreboardThis, scoreboardNext] =
        await Promise.allSettled([
          $fetch<Record<string, unknown>>(`/api/schedule?teamId=${teamId}`),
          $fetch<Record<string, unknown>>(`/api/scores?week=this`),
          $fetch<Record<string, unknown>>(`/api/scores?week=next`),
        ])
      const scheduleEvents_raw: ScheduleEvent[] = []
      const seenIds = new Set<string>()
      if (scheduleData.status === 'fulfilled') {
        const events =
          (scheduleData.value.events as Array<Record<string, unknown>>) || []
        for (const evt of events) {
          const se = evtToScheduleEvent(evt, teamName, teamId)
          scheduleEvents_raw.push(se)
          seenIds.add(se.id)
        }
      }
      for (const scoreboardData of [scoreboardThis, scoreboardNext]) {
        if (scoreboardData.status !== 'fulfilled') continue
        const events =
          (scoreboardData.value.events as Array<Record<string, unknown>>) || []
        for (const evt of events) {
          const id = evt.id as string
          if (seenIds.has(id)) continue
          const comps =
            (evt.competitions as Array<Record<string, unknown>>) || []
          const comp = comps[0] || {}
          const competitors =
            (comp.competitors as Array<Record<string, unknown>>) || []
          const involved = competitors.some((c) => {
            const t = c.team as Record<string, unknown> | undefined
            return t?.displayName === teamName || t?.id === teamId
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

  // Load schedule whenever the modal opens OR the displayed team changes.
  // immediate:true ensures we catch the case where the component mounts with
  // open=true already (e.g. direct navigation to /team or ClientOnly hydration).
  watch(
    [() => props.open, displayTeam],
    ([isOpen, team]) => {
      if (isOpen && team) loadSchedule(team as string)
    },
    { immediate: true }
  )

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
      qualityScore: calcQuality(evt.homeRec, evt.awayRec),
      badge: calcBadge(evt.homeRec, evt.awayRec, evt.homeTeam, evt.awayTeam),
    }
  }

  const upcomingEvents = computed(() =>
    scheduleEvents.value.filter(
      (e) =>
        e.statusCode === 'ns' ||
        e.statusCode === 'live' ||
        e.statusCode === 'ht'
    )
  )

  const pastMatches = computed(() => {
    const all = scheduleEvents.value
      .filter((e) => e.statusCode === 'ft')
      .map(toMatch)
    const cap = Math.min(all.length, 10)
    const even = cap % 2 === 0 ? cap : cap - 1
    return all.slice(-even).reverse()
  })

  const showMoreGames = ref(false)

  const nextGame = computed(() =>
    upcomingEvents.value.length ? toMatch(upcomingEvents.value[0]!) : null
  )
  const moreUpcomingMatches = computed(() =>
    upcomingEvents.value.slice(1).map(toMatch)
  )

  // ── Team detail (leaders + roster) ───────────────────────────────────────
  interface StatLeader {
    athleteId: string
    displayName: string
    jersey: string
    headshot: string
    value: number
    displayValue: string
  }
  interface StatCategory {
    name: string
    displayName: string
    leaders: StatLeader[]
  }
  interface RosterPlayer {
    id: string
    displayName: string
    shortName: string
    jersey: string
    position: string
    positionName: string
    nationality: string
    headshot: string
  }
  interface TeamDetailData {
    teamId: string
    roster: RosterPlayer[]
    leaders: StatCategory[]
  }

  const teamDetail = ref<TeamDetailData | null>(null)
  const teamDetailLoading = ref(false)
  const teamDetailError = ref<string | null>(null)
  const teamDetailLoaded = ref<string | null>(null)

  // ── Fallback squad from last played game ─────────────────────────────────
  interface FallbackPlayer {
    id: string
    displayName: string
    jersey: string
    position: string
    starter: boolean
    subbedIn: boolean
    subbedOut: boolean
  }
  const fallbackSquad = ref<FallbackPlayer[]>([])
  const fallbackSquadDate = ref<string | null>(null)
  const fallbackSquadLoading = ref(false)

  async function loadFallbackSquad(teamName: string, teamId: string) {
    // Find the most recent completed game for this team
    const lastGame = scheduleEvents.value
      .filter((e) => e.statusCode === 'ft')
      .at(-1)
    if (!lastGame) return

    fallbackSquadLoading.value = true
    try {
      const detail = await $fetch<Record<string, unknown>>(
        `/api/match-detail?eventId=${lastGame.id}`
      )
      const rosters = (detail.rosters as Array<Record<string, unknown>>) ?? []
      const myRoster = rosters.find((r) => {
        const rid = r.teamId as string
        return rid === teamId
      })
      if (myRoster) {
        const players =
          (myRoster.players as Array<Record<string, unknown>>) ?? []
        fallbackSquad.value = players.map((p) => ({
          id: p.id as string,
          displayName: p.displayName as string,
          jersey: (p.jersey as string) ?? '',
          position: (p.position as string) ?? '',
          starter: (p.starter as boolean) ?? false,
          subbedIn: (p.subbedIn as boolean) ?? false,
          subbedOut: (p.subbedOut as boolean) ?? false,
        }))
        fallbackSquadDate.value = lastGame.date
      }
    } catch {
      // silently ignore — fallback squad is best-effort
    } finally {
      fallbackSquadLoading.value = false
    }
  }

  async function loadTeamDetail(teamName: string) {
    const teamId = TEAM_ESPN_ID[teamName]
    if (!teamId) return
    if (teamDetailLoaded.value === teamId) return
    teamDetailLoading.value = true
    teamDetailError.value = null
    try {
      const data = await $fetch<TeamDetailData>(
        `/api/team-detail?teamId=${teamId}`
      )
      teamDetail.value = data
      teamDetailLoaded.value = teamId
      // If roster is empty, try to load from last game
      if (!data.roster?.length) {
        await loadFallbackSquad(teamName, teamId)
      }
    } catch {
      teamDetailError.value = 'Could not load team data.'
    } finally {
      teamDetailLoading.value = false
    }
  }

  watch(activeTab, (tab) => {
    if (
      (tab === 'leaders' || tab === 'lineups') &&
      displayTeam.value &&
      !teamDetail.value
    ) {
      loadTeamDetail(displayTeam.value)
    }
  })

  watch(displayTeam, () => {
    teamDetail.value = null
    teamDetailLoaded.value = null
    fallbackSquad.value = []
    fallbackSquadDate.value = null
  })

  // Formatted fallback date label e.g. "May 17, 2026"
  const fallbackSquadDateLabel = computed(() => {
    if (!fallbackSquadDate.value) return ''
    return new Date(fallbackSquadDate.value).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  })

  // Effective roster: API roster if available, else fallback
  const effectiveRoster = computed<RosterPlayer[]>(() => {
    if (teamDetail.value?.roster?.length) return sortedRoster.value
    return [] // handled separately via fallbackSquad
  })

  const usingFallbackSquad = computed(
    () =>
      !!teamDetail.value &&
      !teamDetail.value.roster?.length &&
      fallbackSquad.value.length > 0
  )

  const POS_ORDER_FALLBACK: Record<string, number> = {
    G: 0,
    GK: 0,
    D: 1,
    CB: 1,
    LB: 1,
    RB: 1,
    WB: 1,
    M: 2,
    CM: 2,
    DM: 2,
    AM: 2,
    F: 3,
    FW: 3,
    LW: 3,
    RW: 3,
    ST: 3,
  }

  const sortedFallbackSquad = computed(() => {
    return [...fallbackSquad.value].sort((a, b) => {
      const ao = POS_ORDER_FALLBACK[a.position] ?? 9
      const bo = POS_ORDER_FALLBACK[b.position] ?? 9
      if (ao !== bo) return ao - bo
      return (
        (a.jersey ? parseInt(a.jersey) : 99) -
        (b.jersey ? parseInt(b.jersey) : 99)
      )
    })
  })

  // ── Fixture short names (compact display in All Fixtures tab) ─────────────
  const FIXTURE_TEAM_NAME: Record<string, string> = {
    'Atlanta United FC': 'Atlanta Utd',
    'Austin FC': 'Austin FC',
    'CF Montréal': 'CF Mtl',
    'Charlotte FC': 'Charlotte',
    'Chicago Fire FC': 'Chicago',
    'Colorado Rapids': 'Colorado',
    'Columbus Crew': 'Columbus',
    'D.C. United': 'DC United',
    'FC Cincinnati': 'Cincinnati',
    'FC Dallas': 'FC Dallas',
    'Houston Dynamo FC': 'Houston',
    'Inter Miami CF': 'Inter Miami',
    'LA Galaxy': 'LA Galaxy',
    LAFC: 'LAFC',
    'Minnesota United FC': 'Minnesota',
    'Nashville SC': 'Nashville',
    'New England Revolution': 'New England',
    'New York City FC': 'NYCFC',
    'Orlando City SC': 'Orlando',
    'Philadelphia Union': 'Philadelphia',
    'Portland Timbers': 'Portland',
    'Real Salt Lake': 'Real SL',
    'Red Bull New York': 'NY Red Bulls',
    'San Diego FC': 'San Diego',
    'San Jose Earthquakes': 'San Jose',
    'Seattle Sounders FC': 'Seattle',
    'Sporting Kansas City': 'Sporting KC',
    'St. Louis City SC': 'St. Louis',
    'St. Louis CITY SC': 'St. Louis',
    'Toronto FC': 'Toronto',
    'Vancouver Whitecaps': 'Vancouver',
  }

  function fixtureTeamName(name: string): string {
    return FIXTURE_TEAM_NAME[name] ?? name
  }

  // ── Stat display config ───────────────────────────────────────────────────
  const STAT_DISPLAY: Record<string, string> = {
    goals: 'Goals',
    assists: 'Assists',
    saves: 'Saves',
    shotsOnTarget: 'Shots on Target',
    totalShots: 'Total Shots',
    accuratePasses: 'Accurate Passes',
    yellowCards: 'Yellow Cards',
    redCards: 'Red Cards',
  }

  const STAT_ORDER = [
    'goals',
    'assists',
    'saves',
    'shotsOnTarget',
    'totalShots',
    'accuratePasses',
    'yellowCards',
    'redCards',
  ]

  const sortedLeaders = computed(() => {
    if (!teamDetail.value?.leaders) return []
    return [...teamDetail.value.leaders].sort((a, b) => {
      const ai = STAT_ORDER.indexOf(a.name)
      const bi = STAT_ORDER.indexOf(b.name)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
  })

  // ── Roster sorted by position ─────────────────────────────────────────────
  const POS_ORDER: Record<string, number> = {
    G: 0,
    GK: 0,
    D: 1,
    CB: 1,
    LB: 1,
    RB: 1,
    WB: 1,
    M: 2,
    CM: 2,
    DM: 2,
    AM: 2,
    F: 3,
    FW: 3,
    LW: 3,
    RW: 3,
    ST: 3,
  }

  const sortedRoster = computed(() => {
    if (!teamDetail.value?.roster) return []
    return [...teamDetail.value.roster].sort((a, b) => {
      const ao = POS_ORDER[a.position] ?? 9
      const bo = POS_ORDER[b.position] ?? 9
      if (ao !== bo) return ao - bo
      return (
        (a.jersey ? parseInt(a.jersey) : 99) -
        (b.jersey ? parseInt(b.jersey) : 99)
      )
    })
  })

  // ── All Fixtures: full season sorted oldest→newest, grouped by month ──────
  const fixturesByMonth = computed(() => {
    const all = scheduleEvents.value
    if (!all.length) return []
    const map = new Map<string, ScheduleEvent[]>()
    for (const evt of all) {
      const d = new Date(evt.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const arr = map.get(key) ?? []
      arr.push(evt)
      map.set(key, arr)
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, events]) => {
        const d = new Date(events[0]!.date)
        const label = d.toLocaleDateString('en-US', {
          month: 'long',
        })
        return { key, label, events }
      })
  })

  function fixtureDate(iso: string): { weekday: string; date: string } {
    const d = new Date(iso)
    const weekday = d.toLocaleDateString('en-US', {
      weekday: 'short',
      timeZone: iana.value,
    })
    const date = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: iana.value,
    })
    return { weekday, date }
  }

  function fixtureTime(iso: string): string {
    const d = new Date(iso)
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: iana.value,
    })
  }

  // ── Header info ───────────────────────────────────────────────────────────
  const displayName = computed(() =>
    displayTeam.value
      ? (TEAM_SHORT_NAME[displayTeam.value] ?? displayTeam.value)
      : ''
  )
  const venue = computed(() =>
    displayTeam.value ? (TEAM_VENUE[displayTeam.value] ?? '') : ''
  )
  const venueShort = computed(() =>
    displayTeam.value
      ? (TEAM_VENUE_SHORT[displayTeam.value] ?? venue.value)
      : ''
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
        :style="backdropStyle"
        @mousedown.self="emit('close')"
      >
        <div
          class="modal-card"
          :style="modalCardStyle"
          role="dialog"
          aria-modal="true"
        >
          <!-- Close button -->
          <button class="modal-close" @click="emit('close')" aria-label="Close">
            <CloseIcon />
          </button>

          <!-- Header -->
          <div class="modal-header">
            <img
              v-if="displayLogoUrl"
              :src="displayLogoUrl"
              :alt="displayTeam ?? ''"
              class="modal-logo"
            />
            <div class="modal-team-info">
              <div class="modal-team-name">
                <span class="name-full">{{ displayTeam }}</span>
                <span class="name-short">{{ displayName }}</span>
              </div>
              <div class="modal-venue">
                <span class="venue-full">{{ venue }}</span>
                <span class="venue-short">{{ venueShort }}</span>
              </div>
              <button
                v-if="conference"
                class="schedule-conference-heading"
                @click="emit('view-standings', conference)"
              >
                {{ conference }}
                <span class="conf-standings-arrow">›</span>
              </button>
            </div>
          </div>

          <!-- Tabs -->
          <div class="modal-tabs">
            <button
              class="modal-tab"
              :class="{ active: activeTab === 'schedule' }"
              @click="setTab('schedule')"
            >
              Schedule
            </button>
            <button
              class="modal-tab"
              :class="{ active: activeTab === 'leaders' }"
              @click="setTab('leaders')"
            >
              Leaders
            </button>
            <button
              class="modal-tab"
              :class="{ active: activeTab === 'lineups' }"
              @click="setTab('lineups')"
            >
              Lineups
            </button>
            <button
              class="modal-tab"
              :class="{ active: activeTab === 'fixtures' }"
              @click="setTab('fixtures')"
            >
              2026 Fixtures
            </button>
          </div>

          <!-- Tab body -->
          <div class="modal-body">
            <Transition :name="`tab-slide-${slideDir}`" mode="out-in">
              <div :key="activeTab" class="tab-pane">
                <!-- ── SCHEDULE TAB ──────────────────────────────────────── -->
                <template v-if="activeTab === 'schedule'">
                  <div v-if="scheduleLoading" class="schedule-loading">
                    <div v-for="i in 4" :key="i" class="skel-row" />
                  </div>
                  <div v-else-if="scheduleError" class="schedule-error">
                    {{ scheduleError }}
                  </div>
                  <template v-else>
                    <div class="schedule-body">
                      <!-- Additional upcoming games -->
                      <div
                        v-if="showMoreGames && moreUpcomingMatches.length"
                        class="schedule-section"
                      >
                        <div class="schedule-list">
                          <GameBlock
                            v-for="match in moreUpcomingMatches"
                            :key="match.id"
                            :match="match"
                            @open-game-detail="emit('open-game-detail', $event)"
                          />
                        </div>
                      </div>

                      <!-- Show More Games button -->
                      <button
                        v-if="moreUpcomingMatches.length"
                        class="show-future-btn"
                        @click="showMoreGames = !showMoreGames"
                      >
                        {{
                          showMoreGames ? 'Hide More Games' : 'Show More Games'
                        }}
                      </button>

                      <!-- Hiatus banner -->
                      <HiatusBanner />

                      <!-- Next game -->
                      <div v-if="nextGame" class="schedule-section">
                        <div class="schedule-list schedule-list--single">
                          <GameBlock
                            :match="nextGame"
                            @open-game-detail="
                              emit(
                                'open-game-detail',
                                toMatch(upcomingEvents[0]!)
                              )
                            "
                          />
                        </div>
                      </div>

                      <!-- Past games -->
                      <div v-if="pastMatches.length" class="schedule-section">
                        <div class="schedule-list">
                          <GameBlock
                            v-for="match in pastMatches"
                            :key="match.id"
                            :match="match"
                            @open-game-detail="emit('open-game-detail', $event)"
                          />
                        </div>
                      </div>

                      <p
                        v-if="!pastMatches.length && !nextGame"
                        class="schedule-empty"
                      >
                        No schedule data available.
                      </p>

                      <!-- Show all fixtures link -->
                      <div
                        v-if="scheduleEvents.length"
                        class="schedule-fixtures-link-row"
                      >
                        <button
                          class="schedule-fixtures-link"
                          @click="setTab('fixtures')"
                        >
                          Show all 2026 fixtures
                        </button>
                      </div>
                    </div>
                  </template>
                </template>

                <!-- ── LEADERS TAB ──────────────────────────────────────── -->
                <template v-else-if="activeTab === 'leaders'">
                  <div v-if="teamDetailLoading" class="schedule-loading">
                    <div v-for="i in 6" :key="i" class="skel-row" />
                  </div>
                  <div v-else-if="teamDetailError" class="schedule-error">
                    {{ teamDetailError }}
                  </div>
                  <div v-else-if="sortedLeaders.length" class="leaders-wrap">
                    <div
                      v-for="(cat, ci) in sortedLeaders"
                      :key="cat.name"
                      class="leaders-category"
                    >
                      <div class="leaders-cat-title">
                        {{ STAT_DISPLAY[cat.name] ?? cat.displayName }}
                      </div>
                      <div class="leaders-table">
                        <div
                          v-for="(leader, li) in cat.leaders"
                          :key="leader.athleteId"
                          class="leaders-row"
                          :class="{ 'row-stripe': li % 2 === 1 }"
                        >
                          <span class="leaders-rank">{{ li + 1 }}</span>
                          <span class="leaders-name">{{
                            leader.displayName
                          }}</span>
                          <span class="leaders-jersey"
                            >#{{ leader.jersey }}</span
                          >
                          <span class="leaders-value">{{
                            leader.displayValue
                          }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else class="schedule-empty">
                    Leaders not yet available.
                  </div>
                </template>

                <!-- ── LINEUPS TAB ──────────────────────────────────────── -->
                <template v-else-if="activeTab === 'lineups'">
                  <div
                    v-if="teamDetailLoading || fallbackSquadLoading"
                    class="schedule-loading"
                  >
                    <div v-for="i in 8" :key="i" class="skel-row" />
                  </div>
                  <div v-else-if="teamDetailError" class="schedule-error">
                    {{ teamDetailError }}
                  </div>
                  <!-- API roster available -->
                  <div
                    v-else-if="sortedRoster.length"
                    class="squads-wrap squads-wrap--roster"
                  >
                    <div class="squads-table">
                      <div class="squads-head">
                        <div class="squads-th-num">#</div>
                        <div class="squads-th-pos">Pos</div>
                        <div class="squads-th-name">Player</div>
                        <div class="squads-th-nat">Nat</div>
                      </div>
                      <div
                        v-for="(player, pi) in sortedRoster"
                        :key="player.id"
                        class="squads-row"
                        :class="{ 'row-stripe': pi % 2 === 1 }"
                      >
                        <div class="squads-num">{{ player.jersey }}</div>
                        <div class="squads-pos">
                          <span class="pos-badge">{{ player.position }}</span>
                        </div>
                        <div class="squads-name">{{ player.displayName }}</div>
                        <div class="squads-nat">{{ player.nationality }}</div>
                      </div>
                    </div>
                  </div>
                  <!-- Fallback: last game's lineup -->
                  <div
                    v-else-if="usingFallbackSquad"
                    class="squads-fallback-wrap"
                  >
                    <div class="squads-wrap">
                      <div class="squads-table">
                        <div class="squads-head">
                          <div class="squads-th-num">#</div>
                          <div class="squads-th-pos">Pos</div>
                          <div class="squads-th-name">Player</div>
                        </div>
                        <div
                          v-for="(player, pi) in sortedFallbackSquad"
                          :key="player.id"
                          class="squads-row"
                          :class="{ 'row-stripe': pi % 2 === 1 }"
                        >
                          <div class="squads-num">{{ player.jersey }}</div>
                          <div class="squads-pos">
                            <span class="pos-badge">{{ player.position }}</span>
                          </div>
                          <div class="squads-name">
                            {{ player.displayName }}
                          </div>
                        </div>
                      </div>
                    </div>
                    <p class="squads-fallback-note">
                      *last lineup from {{ fallbackSquadDateLabel }}
                    </p>
                  </div>
                  <div v-else class="schedule-empty">
                    Lineup not yet available.
                  </div>
                </template>

                <!-- ── ALL FIXTURES TAB ─────────────────────────────────── -->
                <template v-else-if="activeTab === 'fixtures'">
                  <div v-if="scheduleLoading" class="schedule-loading">
                    <div v-for="i in 6" :key="i" class="skel-row" />
                  </div>
                  <div v-else-if="scheduleError" class="schedule-error">
                    {{ scheduleError }}
                  </div>
                  <div v-else-if="fixturesByMonth.length" class="fixtures-wrap">
                    <template
                      v-for="(month, mi) in fixturesByMonth"
                      :key="month.key"
                    >
                      <HiatusBanner
                        v-if="
                          mi > 0 &&
                          (fixturesByMonth[mi - 1]?.key ?? '') < '2026-07' &&
                          month.key >= '2026-07'
                        "
                      />
                      <div class="fixtures-month">
                        <div class="fixtures-month-label">
                          {{ month.label }}
                        </div>
                        <div class="fixtures-table">
                          <div
                            v-for="(evt, ei) in month.events"
                            :key="evt.id"
                            class="fixtures-row"
                            :class="{ 'row-stripe': ei % 2 === 1 }"
                          >
                            <!-- Date -->
                            <div class="fx-date">
                              <span class="fx-date-weekday">{{
                                fixtureDate(evt.date).weekday
                              }}</span>
                              <span class="fx-date-md">{{
                                fixtureDate(evt.date).date
                              }}</span>
                            </div>
                            <!-- Home team -->
                            <button
                              class="fx-home fx-team-btn"
                              @click.stop="emit('select-team', evt.homeTeam)"
                            >
                              <img
                                v-if="TEAM_LOGO[evt.homeTeam]"
                                :src="TEAM_LOGO[evt.homeTeam]"
                                :alt="evt.homeTeam"
                                class="fx-logo"
                              />
                              <span
                                class="fx-team"
                                :class="{
                                  'fx-team-bold': evt.homeTeam === displayTeam,
                                }"
                                >{{ fixtureTeamName(evt.homeTeam) }}</span
                              >
                            </button>
                            <!-- Score or time (center) -->
                            <div class="fx-center">
                              <template
                                v-if="
                                  evt.statusCode === 'ft' ||
                                  evt.statusCode === 'live' ||
                                  evt.statusCode === 'ht'
                                "
                              >
                                <span class="fx-score"
                                  >{{ evt.homeScore }} –
                                  {{ evt.awayScore }}</span
                                >
                                <span
                                  v-if="
                                    evt.statusCode === 'live' ||
                                    evt.statusCode === 'ht'
                                  "
                                  class="fx-badge fx-badge-live"
                                  >{{
                                    evt.statusCode === 'ht'
                                      ? 'HT'
                                      : evt.statusClock || 'LIVE'
                                  }}</span
                                >
                              </template>
                              <template v-else>
                                <span class="fx-time">{{
                                  fixtureTime(evt.date)
                                }}</span>
                              </template>
                            </div>
                            <!-- Away team -->
                            <button
                              class="fx-away fx-team-btn"
                              @click.stop="emit('select-team', evt.awayTeam)"
                            >
                              <img
                                v-if="TEAM_LOGO[evt.awayTeam]"
                                :src="TEAM_LOGO[evt.awayTeam]"
                                :alt="evt.awayTeam"
                                class="fx-logo"
                              />
                              <span
                                class="fx-team"
                                :class="{
                                  'fx-team-bold': evt.awayTeam === displayTeam,
                                }"
                                >{{ fixtureTeamName(evt.awayTeam) }}</span
                              >
                            </button>
                          </div>
                        </div>
                      </div>
                    </template>
                  </div>
                  <div v-else class="schedule-empty">
                    No fixtures available.
                  </div>
                </template>
              </div>
            </Transition>
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
    padding: 1rem;
    padding-bottom: 3rem;
    overflow-y: auto;
    /* Hide the backdrop's own scrollbar — the modal-body has its own scrollbar */
    scrollbar-width: none;
  }
  .modal-backdrop::-webkit-scrollbar {
    display: none;
  }

  /* ── Card ─────────────────────────────────────────────────────────────────── */
  .modal-card {
    position: relative;
    width: 100%;
    max-width: 36rem;
    margin-top: 0;
    margin-bottom: 0;
    /* Body uses the dark stops derived from the secondary color */
    background: var(--color-theme-950, #0f172a);
    border: 1px solid
      color-mix(
        in oklab,
        var(--color-theme-primary, #6b7280) 25%,
        var(--color-theme-700, #374151) 75%
      );
    border-bottom: 3px solid
      color-mix(
        in oklab,
        var(--color-theme-primary, #6b7280) 40%,
        var(--color-theme-700, #374151) 60%
      );
    border-radius: 0.5rem;
    box-shadow: 0 8px 24px oklab(0% 0 0 / 1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* ── Close button ─────────────────────────────────────────────────────────── */
  .modal-close {
    position: absolute;
    top: 0.35rem;
    right: 0.35rem;
    background: transparent;
    border: none;
    color: color-mix(
      in oklab,
      var(--color-theme-on-primary, white) 60%,
      transparent
    );
    cursor: pointer;
    padding: 0.375rem;
    border-radius: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s;
    z-index: 10;
  }
  .modal-close:hover,
  .modal-close:focus-visible {
    color: var(--color-theme-on-primary, white);
    outline: none;
  }
  .modal-close:hover :deep(svg),
  .modal-close:focus-visible :deep(svg) {
    stroke: var(--color-theme-on-primary, white);
  }

  /* ── Header ───────────────────────────────────────────────────────────────── */
  .modal-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1.25rem 1.25rem 0.75rem;
    padding-right: 2rem;
    flex-shrink: 0;
    /* Use the team's primary accent color as the header background */
    background: var(--color-theme-primary, #334155);
  }

  .modal-logo {
    width: 4rem;
    height: 4rem;
    object-fit: contain;
    flex-shrink: 0;
  }

  .modal-team-info {
    display: flex;
    flex-direction: column;
    gap: 0;
    min-width: 0;
    position: relative;
    top: -0.3rem;
  }

  .modal-team-name {
    font-family: var(--font-condensed);
    font-size: 1.65rem;
    font-weight: 400;
    color: var(--color-theme-on-primary, white);
    line-height: 1.2;
    letter-spacing: 0.02em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .name-short {
    display: none;
  }
  .name-full {
    display: inline;
  }

  @media (max-width: 480px) {
    .modal-team-name {
      font-size: 1.35rem;
    }
  }

  .modal-venue {
    font-family: var(--font-condensed);
    font-size: 0.85rem;
    font-weight: 400;
    color: color-mix(
      in oklab,
      var(--color-theme-on-primary, white) 80%,
      transparent
    );
    letter-spacing: 0.04em;
    line-height: 1.38;
  }

  .venue-short {
    display: none;
  }
  .venue-full {
    display: inline;
  }

  @media (max-width: 480px) {
    .venue-full {
      display: none;
    }
    .venue-short {
      display: inline;
    }
  }

  .schedule-conference-heading {
    font-family: var(--font-condensed);
    font-size: 0.85rem;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: color-mix(
      in oklab,
      var(--color-theme-on-primary, white) 80%,
      transparent
    );
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
    color: var(--color-theme-on-primary, white);
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

  /* ── Tabs ─────────────────────────────────────────────────────────────────── */
  .modal-tabs {
    display: flex;
    gap: 0;
    padding: 0 1rem;
    flex-shrink: 0;
    border-bottom: 1px solid oklab(100% 0 0 / 0.1);
    background: oklab(0% 0 0 / 0.2);
    overflow-x: auto;
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE/Edge */
  }
  .modal-tabs::-webkit-scrollbar {
    display: none; /* Chrome/Safari */
  }

  .modal-tab {
    font-family: var(--font-condensed);
    font-size: 0.75rem;
    font-weight: 400;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 0.5rem 0.75rem;
    color: oklab(100% 0 0 / 0.45);
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition:
      color 0.15s,
      border-color 0.15s;
    white-space: nowrap;
    flex-shrink: 0;
  }

  @media (max-width: 400px) {
    .modal-tabs {
      padding: 0 0.25rem;
    }
    .modal-tab {
      font-size: 0.6875rem;
      letter-spacing: 0.07em;
      padding: 0.5rem 0.5rem;
    }
  }

  .modal-tab.active {
    color: oklab(100% 0 0);
    border-bottom-color: var(--color-theme-primary, oklab(100% 0 0));
  }

  .modal-tab:hover:not(.active) {
    color: oklab(100% 0 0 / 0.75);
  }

  /* ── Body ─────────────────────────────────────────────────────────────────── */
  .modal-body {
    overflow-y: auto;
    overflow-x: hidden;
    flex: 1;
    max-height: 70dvh;
    padding: 0.5rem 0.85rem 1rem;
    /* --color-theme-scrollbar cascades from .modal-card via :style binding;
       the global scrollbar.css picks it up automatically */
    scrollbar-width: thin;
  }
  .modal-body::-webkit-scrollbar {
    width: 4px;
  }
  .modal-body::-webkit-scrollbar-track {
    background: transparent;
  }

  /* ── Tab slide transitions ────────────────────────────────────────────────── */
  .tab-pane {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .tab-slide-left-enter-active,
  .tab-slide-left-leave-active,
  .tab-slide-right-enter-active,
  .tab-slide-right-leave-active {
    transition:
      transform 0.12s cubic-bezier(0.4, 0, 0.2, 1),
      opacity 0.1s ease;
  }

  .tab-slide-left-enter-from {
    transform: translateX(16px);
    opacity: 0;
  }
  .tab-slide-left-leave-to {
    transform: translateX(-16px);
    opacity: 0;
  }
  .tab-slide-right-enter-from {
    transform: translateX(-16px);
    opacity: 0;
  }
  .tab-slide-right-leave-to {
    transform: translateX(16px);
    opacity: 0;
  }

  /* ── Schedule tab ─────────────────────────────────────────────────────────── */
  .schedule-body {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .schedule-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .schedule-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.625rem;
  }

  .schedule-list--single {
    grid-template-columns: 1fr;
  }

  /* ── Featured next-game card (full-width single) ──────────────────────── */
  .schedule-list--single :deep(.game-block) {
    padding: 0.875rem 1rem;
    gap: 0.45rem 0.75rem;
    box-shadow: 0 0 0 1px oklab(100% 0 0 / 0.12);
  }

  .schedule-list--single :deep(.team-name-text) {
    font-size: 1.5rem;
    font-weight: 200;
  }

  .schedule-list--single :deep(.team-rec) {
    font-size: 0.9rem;
  }

  .schedule-list--single :deep(.team-logo) {
    width: 1.75rem;
    height: 1.75rem;
  }

  .schedule-list--single :deep(.logo-slot) {
    width: 1.75rem;
  }

  .schedule-list--single :deep(.status-col) {
    width: 5.5rem;
    padding-left: 1rem;
  }

  .schedule-list--single :deep(.status-time) {
    font-size: 1.3rem;
    letter-spacing: 0.02em;
  }

  .schedule-list--single :deep(.status-date) {
    font-size: 1.3rem;
  }

  .schedule-list--single :deep(.team-score) {
    font-size: 1.5rem;
  }

  .schedule-list--single :deep(.badge) {
    font-size: 1rem;
  }

  /* Tighten the featured card on mobile */
  @media (max-width: 530px) {
    .schedule-list--single :deep(.game-block) {
      padding: 0.475rem 0.7rem;
      gap: 0rem 0.55rem;
      box-shadow: 0 0 0 1px oklab(100% 0 0 / 0.2);
      grid-template-columns: 5fr 2fr;
    }
    .schedule-list--single :deep(.status-time) {
      font-size: 1rem;
    }
    .schedule-list--single :deep(.status-date) {
      font-size: 1rem;
    }
    .schedule-list--single :deep(.team-name-text) {
      font-size: 1.2rem;
    }
  }

  /* At 425px+ the card is wide enough for full long team names */
  @media (min-width: 425px) {
    .schedule-list--single :deep(.team-name-text) {
      font-size: 1.3rem;
    }
  }

  @media (max-width: 480px) {
    .schedule-list {
      grid-template-columns: 1fr;
    }
  }

  .show-future-btn {
    font-family: var(--font-condensed);
    font-size: 0.6125rem;
    font-weight: 400;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-text-primary);
    background: oklab(100% 0 0 / 0.05);
    border: 1px solid oklab(100% 0 0 / 0.1);
    border-radius: 20.375rem;
    padding: 0.2rem 0.8rem;
    cursor: pointer;
    align-self: center;
    transition:
      background 0.15s,
      border-color 0.15s;
  }
  .show-future-btn:hover {
    background: oklab(100% 0 0 / 0.09);
    border-color: oklab(100% 0 0 / 0.18);
  }

  /* ── Shared skeleton / error / empty ─────────────────────────────────────── */
  .schedule-loading {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .skel-row {
    height: 2.5rem;
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
    font-size: var(--modal-copy-size);
    color: var(--color-text-secondary);
    text-align: center;
    padding: 1.5rem 0;
  }

  /* ── Shared row stripe ────────────────────────────────────────────────────── */
  .row-stripe {
    background: oklab(100% 0 0 / 0.03);
  }

  /* ── Leaders tab ──────────────────────────────────────────────────────────── */
  .leaders-wrap {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .leaders-category {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .leaders-cat-title {
    font-family: var(--font-condensed);
    font-size: 0.6875rem;
    font-weight: 400;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: color-mix(
      in oklab,
      var(--color-theme-300, oklab(100% 0 0)) 80%,
      white 20%
    );
    padding-bottom: 0.25rem;
    border-bottom: 1px solid oklab(100% 0 0 / 0.08);
  }

  .leaders-table {
    display: flex;
    flex-direction: column;
  }

  .leaders-row {
    display: grid;
    grid-template-columns: 1.5rem 1fr 2.5rem 2rem;
    align-items: center;
    padding: 0.3rem 0.4rem;
    border-radius: 0.25rem;
    gap: 0.5rem;
    min-height: 2rem;
  }

  .leaders-rank {
    font-size: var(--modal-copy-size);
    font-weight: 400;
    color: oklab(100% 0 0 / 0.35);
    text-align: center;
  }

  .leaders-name {
    font-size: var(--modal-copy-size);
    font-weight: 200;
    color: oklab(100% 0 0);
    letter-spacing: 0.03em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .leaders-jersey {
    font-size: var(--modal-copy-size);
    font-weight: 300;
    color: oklab(100% 0 0 / 0.4);
    text-align: right;
    letter-spacing: 0.04em;
  }

  .leaders-value {
    font-size: var(--modal-copy-size);
    font-weight: 400;
    color: oklab(100% 0 0);
    text-align: right;
    letter-spacing: 0.02em;
  }

  /* ── Squads tab ───────────────────────────────────────────────────────────── */

  /* Left-indent wrapper — # sits ~3rem in from the left */
  .squads-wrap {
    /* no padding here — indent is handled per-row via padding-left */
  }

  .squads-table {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  /* Grid: # (2.5rem right-aligned) | Pos (4rem) | Player (auto) */
  .squads-head {
    display: grid;
    grid-template-columns: 2.5rem 4rem 1fr;
    align-items: baseline;
    padding: 0.25rem 0.4rem 0.4rem 3rem;
    border-bottom: 1px solid oklab(100% 0 0 / 0.1);
    gap: 0.75rem;
  }

  .squads-th-num,
  .squads-th-pos,
  .squads-th-name,
  .squads-th-nat {
    font-size: 0.6875rem;
    font-weight: 400;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: oklab(100% 0 0 / 0.45);
  }

  .squads-th-num {
    text-align: right;
  }

  .squads-row {
    display: grid;
    grid-template-columns: 2.5rem 4rem 1fr;
    align-items: center;
    padding: 0.3rem 0.4rem 0.3rem 3rem;
    border-radius: 0.25rem;
    gap: 0.75rem;
    min-height: 2rem;
  }

  /* API roster: has Nat column — 4 cols */
  .squads-wrap--roster .squads-head,
  .squads-wrap--roster .squads-row {
    grid-template-columns: 2.5rem 4rem 1fr 2.5rem;
  }

  .squads-num {
    font-size: var(--modal-copy-size);
    font-weight: 300;
    color: oklab(100% 0 0 / 0.5);
    text-align: right;
  }

  .squads-pos {
    display: flex;
    align-items: center;
  }

  .pos-badge {
    font-size: 0.575rem;
    font-weight: 400;
    letter-spacing: 0.09em;
    color: oklab(100% 0 0 / 0.7);
    background: oklab(100% 0 0 / 0.08);
    border-radius: 0.2rem;
    padding: 0.1rem 0.3rem;
  }

  .squads-name {
    font-size: var(--modal-copy-size);
    font-weight: 200;
    color: oklab(100% 0 0);
    letter-spacing: 0.03em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .squads-nat {
    font-size: var(--modal-copy-size);
    font-weight: 200;
    color: oklab(100% 0 0 / 0.5);
    letter-spacing: 0.04em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Fallback note */
  .squads-fallback-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .squads-fallback-note {
    font-size: 0.6875rem;
    font-weight: 300;
    font-style: italic;
    color: oklab(100% 0 0 / 0.35);
    letter-spacing: 0.02em;
    margin: 0;
    padding: 0.25rem 0 0 3rem;
    text-align: left;
  }

  /* Mobile: fully flush left, minimal gaps */
  @media (max-width: 540px) {
    /* Pull the squads table out to the modal-body edges */
    .squads-wrap,
    .squads-fallback-wrap {
      margin-left: -0.85rem;
      margin-right: -0.85rem;
    }

    .squads-head {
      padding: 0.25rem 0.85rem 0.4rem 0.85rem;
      grid-template-columns: 1.75rem 2.75rem 1fr;
      gap: 0.35rem;
    }

    .squads-row {
      padding: 0.3rem 0.85rem;
      grid-template-columns: 1.75rem 2.75rem 1fr;
      gap: 0.35rem;
      border-radius: 0;
    }

    /* API roster on mobile: tighten Nat col too */
    .squads-wrap--roster .squads-head,
    .squads-wrap--roster .squads-row {
      grid-template-columns: 1.75rem 2.75rem 1fr 1.75rem;
    }

    .squads-fallback-note {
      padding: 0.25rem 0.85rem 0;
    }
  }

  /* Show all fixtures link row */
  .schedule-fixtures-link-row {
    display: flex;
    justify-content: center;
    padding-top: 0.25rem;
  }

  .schedule-fixtures-link {
    font-family: var(--font-condensed);
    font-size: 0.7rem;
    font-weight: 300;
    letter-spacing: 0.06em;
    color: oklab(100% 0 0 / 0.45);
    background: none;
    border: none;
    border-bottom: 1px solid oklab(100% 0 0 / 0.2);
    padding: 0 0 0.05rem;
    cursor: pointer;
    transition:
      color 0.15s,
      border-color 0.15s;
  }

  .schedule-fixtures-link:hover {
    color: oklab(100% 0 0 / 0.75);
    border-bottom-color: oklab(100% 0 0 / 0.5);
  }

  /* ── All Fixtures tab ─────────────────────────────────────────────────────── */
  .fixtures-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .fixtures-month {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .fixtures-month-label {
    font-family: var(--font-condensed);
    font-size: 0.9rem;
    font-weight: 400;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    text-align: center;
    color: color-mix(in oklab, var(--color-theme-300, #93c5fd) 70%, white 30%);
    padding-bottom: 0.3rem;
    border-bottom: 1px solid
      color-mix(in oklab, var(--color-theme-primary, #60a5fa) 30%, transparent);
  }

  .fixtures-table {
    display: flex;
    flex-direction: column;
  }

  .fixtures-head {
    display: grid;
    grid-template-columns: 12ch 1fr 5.5rem;
    align-items: baseline;
    padding: 0.2rem 0.4rem 0.35rem;
    border-bottom: 1px solid oklab(100% 0 0 / 0.08);
    gap: 0.5rem;
  }

  .fx-th-date,
  .fx-th-match,
  .fx-th-result {
    font-size: 0.6rem;
    font-weight: 400;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: oklab(100% 0 0 / 0.35);
  }

  .fx-th-result {
    text-align: right;
  }

  .fixtures-row {
    display: grid;
    grid-template-columns: 1fr 4.5rem 1fr;
    grid-template-rows: auto auto;
    grid-template-areas:
      'date date date'
      'home center away';
    align-items: center;
    padding: 0.3rem 0;
    border-radius: 0.25rem;
  }

  .fx-date {
    grid-area: date;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 0.3em;
    white-space: nowrap;
    padding-right: 0;
    padding-bottom: 0.15rem;
  }

  .fx-date-weekday {
    font-size: var(--modal-copy-size);
    font-weight: 200;
    color: oklab(100% 0 0 / 0.4);
    letter-spacing: 0.02em;
    line-height: 1.2;
  }

  .fx-date-md {
    font-size: var(--modal-copy-size);
    font-weight: 200;
    color: oklab(100% 0 0 / 0.55);
    letter-spacing: 0.02em;
    line-height: 1.2;
  }

  .fx-home {
    grid-area: home;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    min-width: 0;
    overflow: hidden;
    justify-content: flex-end;
    padding-right: 0.4rem;
    flex-direction: row;
  }

  .fx-away {
    grid-area: away;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    min-width: 0;
    overflow: hidden;
    justify-content: flex-start;
    padding-left: 0.4rem;
  }

  /* Reset button styles for team clickable areas */
  .fx-team-btn {
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    font: inherit;
    text-align: inherit;
    border-radius: 0.2rem;
    transition: opacity 0.12s;
  }
  .fx-team-btn:hover .fx-team {
    text-decoration: underline;
    text-underline-offset: 0.15em;
    text-decoration-color: oklab(100% 0 0 / 0.45);
  }
  .fx-team-btn:focus-visible {
    outline: 1px solid oklab(100% 0 0 / 0.4);
    outline-offset: 1px;
  }

  .fx-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.1rem;
    flex-shrink: 0;
  }

  .fx-logo {
    width: 1rem;
    height: 1rem;
    object-fit: contain;
    flex-shrink: 0;
  }

  .fx-team {
    font-size: var(--modal-copy-size);
    font-weight: 200;
    color: oklab(100% 0 0 / 0.75);
    letter-spacing: 0.02em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }

  .fx-team-bold {
    font-weight: 400;
    color: oklab(100% 0 0);
  }

  .fx-score {
    font-size: var(--modal-copy-size);
    font-weight: 400;
    color: oklab(100% 0 0);
    letter-spacing: 0.04em;
    white-space: nowrap;
    text-align: center;
  }

  .fx-time {
    font-size: var(--modal-copy-size);
    font-weight: 200;
    color: oklab(100% 0 0 / 0.55);
    letter-spacing: 0.03em;
    white-space: nowrap;
    text-align: center;
  }

  .fx-badge {
    font-size: 0.5rem;
    font-weight: 400;
    letter-spacing: 0.08em;
    padding: 0.1rem 0.25rem;
    border-radius: 0.2rem;
    flex-shrink: 0;
  }

  .fx-badge-live {
    background: oklab(34.8% -0.072 0.028 / 0.7);
    color: #4ade80;
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
