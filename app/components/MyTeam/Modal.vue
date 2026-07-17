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

  // ── Stat display config ───────────────────────────────────────────────────
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

  // ── Season progress: total/played/remaining + season-end date ────────────
  const totalGames = computed(() => scheduleEvents.value.length)
  const gamesPlayed = computed(
    () => scheduleEvents.value.filter((e) => e.statusCode === 'ft').length
  )
  const gamesRemaining = computed(() =>
    Math.max(totalGames.value - gamesPlayed.value, 0)
  )
  const seasonEndDate = computed(() => {
    if (!scheduleEvents.value.length) return null
    const last = scheduleEvents.value.at(-1)
    if (!last) return null
    return new Date(last.date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  })

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
                <MyTeamScheduleTab
                  v-if="activeTab === 'schedule'"
                  :schedule-loading="scheduleLoading"
                  :schedule-error="scheduleError"
                  :more-upcoming-matches="moreUpcomingMatches"
                  :next-game="nextGame"
                  :past-matches="pastMatches"
                  :has-fixtures="scheduleEvents.length > 0"
                  :total-games="totalGames"
                  :games-played="gamesPlayed"
                  :games-remaining="gamesRemaining"
                  :season-end-date="seasonEndDate"
                  @open-game-detail="emit('open-game-detail', $event)"
                  @navigate-fixtures="setTab('fixtures')"
                />

                <MyTeamLeadersTab
                  v-else-if="activeTab === 'leaders'"
                  :loading="teamDetailLoading"
                  :error="teamDetailError"
                  :sorted-leaders="sortedLeaders"
                />
                <MyTeamLineupsTab
                  v-else-if="activeTab === 'lineups'"
                  :loading="teamDetailLoading"
                  :fallback-loading="fallbackSquadLoading"
                  :error="teamDetailError"
                  :sorted-roster="sortedRoster"
                  :using-fallback-squad="usingFallbackSquad"
                  :sorted-fallback-squad="sortedFallbackSquad"
                  :fallback-squad-date-label="fallbackSquadDateLabel"
                />
                <MyTeamFixturesTab
                  v-else-if="activeTab === 'fixtures'"
                  :loading="scheduleLoading"
                  :error="scheduleError"
                  :fixtures-by-month="fixturesByMonth"
                  :display-team="displayTeam ?? ''"
                  :total-games="totalGames"
                  :games-played="gamesPlayed"
                  :games-remaining="gamesRemaining"
                  :season-end-date="seasonEndDate"
                  @select-team="emit('select-team', $event)"
                />
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
