<script setup lang="ts">
  import { useScores, transformMatches } from '~/composables/useScores'
  import { useStandings } from '~/composables/useStandings'
  import { useStats } from '~/composables/useStats'
  import { useAnalytics } from '~/composables/useAnalytics'
  import type { Match } from '~/composables/useScores'

  // Register all app routes on this single page component
  definePageMeta({
    alias: ['/scores', '/standings', '/stats', '/team', '/game'],
  })

  const router = useRouter()
  const route = useRoute()
  const { trackPageview } = useAnalytics()

  // ── Main tab ──────────────────────────────────────────────────────────────────
  type MainTab = 'scores' | 'standings' | 'stats'
  const VALID_TABS: MainTab[] = ['scores', 'standings', 'stats']

  function tabFromPath(): MainTab {
    const p = route.path.replace(/^\//, '') as MainTab
    return VALID_TABS.includes(p) ? p : 'scores'
  }

  const mainTab = ref<MainTab>(tabFromPath())

  // ── Scores composable ─────────────────────────────────────────────────────────
  const { weeks, activeTab, lastUpdated, fetchWeek, selectTab, hasLiveGames } =
    useScores()

  // ── SSR pre-fetch: seed "this week" data before first paint ──────────────────
  await useAsyncData('scores-this', async () => {
    if (weeks.this.loaded) return null
    try {
      const data = await $fetch<Record<string, unknown>>(
        '/api/scores?week=this'
      )
      if (!data._error) {
        weeks.this.matches = transformMatches(data)
        weeks.this.label = (data._weekLabel as string) || weeks.this.label
        weeks.this.hiatus = (data._hiatus as string) ?? null
        weeks.this.loaded = true
      }
    } catch {
      // silently ignore — client-side initialLoad will retry
    }
    return null
  })

  // ── Standings composable ──────────────────────────────────────────────────────
  const {
    conferences,
    loading: standingsLoading,
    error: standingsError,
    loaded: standingsLoaded,
    fetchStandings,
  } = useStandings()

  // ── Stats composable ──────────────────────────────────────────────────────────
  const { loaded: statsLoaded, fetchStats } = useStats()

  // ── Standings conference tab (mobile) ─────────────────────────────────────────
  const confTab = ref('')
  watch(conferences, (val) => {
    if (val.length && !confTab.value) confTab.value = val[0]?.name ?? ''
  })

  // ── Game detail modal state ───────────────────────────────────────────────────
  const gameDetailOpen = ref(false)
  const gameDetailMatch = ref<Match | null>(null)

  // Flag to suppress the route watcher when we're doing our own navigation.
  // Set to true before any programmatic router call that should not trigger
  // modal close logic, cleared after the watcher fires.
  let suppressRouteWatch = false

  function openGameDetail(match: Match) {
    gameDetailMatch.value = match
    gameDetailOpen.value = true
    // Update the URL directly without going through Vue Router,
    // so the route watcher never fires and can't interfere.
    history.replaceState(history.state, '', `/game?id=${match.id}`)
    // Track the modal open as a /game pageview (no game ID — we only care
    // that the modal was opened, not which specific game)
    trackPageview('/game')
  }

  // Called from MyTeamModal when a game card is clicked.
  // We close the team modal first, then defer opening the game detail to the
  // next tick so the click event that triggered this doesn't bubble through
  // to the new GameDetailModal backdrop and immediately close it.
  // NOTE: We do NOT call router.push here because Vue Router cancels the
  // navigation when called during an active navigation (the /team route is
  // still resolving). Instead we update the URL directly via history API
  // and set state manually.
  async function openGameDetailFromTeamModal(match: Match) {
    teamModalOpen.value = false
    viewTeam.value = null
    await nextTick()
    gameDetailMatch.value = match
    gameDetailOpen.value = true
    // Update the URL without triggering the route watcher
    history.replaceState(history.state, '', `/game?id=${match.id}`)
    trackPageview('/game')
  }

  function closeGameDetail() {
    gameDetailOpen.value = false
    gameDetailMatch.value = null
    router.push({ path: `/${mainTab.value === 'scores' ? '' : mainTab.value}` })
  }

  // Called when user clicks a team name inside GameDetailModal.
  // Must properly close game detail (using .value) before opening team modal.
  function openTeamModalFromGameDetail(teamName: string) {
    gameDetailOpen.value = false
    gameDetailMatch.value = null
    openTeamModalFor(teamName)
  }

  // ── Team modal state ──────────────────────────────────────────────────────────
  const teamModalOpen = ref(false)
  const viewTeam = ref<string | null>(null)
  // Remember which main tab was active when the team modal was opened,
  // so we can restore it when the modal closes.
  let tabBeforeTeamModal: MainTab = 'scores'

  function openTeamModal() {
    tabBeforeTeamModal = mainTab.value
    teamModalOpen.value = true
    viewTeam.value = null
    // Use history API directly so the route watcher never fires and
    // can't reset mainTab (e.g. from 'standings' back to 'scores').
    history.pushState(history.state, '', '/team')
    // Track the modal open as a /team pageview (no team name — we only care
    // that the modal was opened, not which specific team)
    trackPageview('/team')
  }

  function openTeamModalFor(teamName: string) {
    tabBeforeTeamModal = mainTab.value
    viewTeam.value = teamName
    teamModalOpen.value = true
    // Use history API directly so the route watcher never fires.
    history.pushState(
      history.state,
      '',
      `/team?name=${encodeURIComponent(teamName)}`
    )
    // Track as /team — we don't record which team, just that the modal opened
    trackPageview('/team')
  }

  function switchTeamModal(teamName: string) {
    viewTeam.value = teamName
    teamModalOpen.value = true
    history.replaceState(
      history.state,
      '',
      `/team?name=${encodeURIComponent(teamName)}`
    )
  }

  function closeTeamModal() {
    teamModalOpen.value = false
    viewTeam.value = null
    const returnTab = tabBeforeTeamModal
    tabBeforeTeamModal = 'scores'
    mainTab.value = returnTab
    history.replaceState(
      history.state,
      '',
      `/${returnTab === 'scores' ? '' : returnTab}`
    )
  }

  function closeAllModals() {
    gameDetailOpen.value = false
    gameDetailMatch.value = null
    teamModalOpen.value = false
    viewTeam.value = null
    // Restore the tab that was active before the modal was opened.
    const returnTab = tabBeforeTeamModal
    tabBeforeTeamModal = 'scores'
    mainTab.value = returnTab
    // Use history.replaceState directly so the route watcher never fires
    // and can't race with an immediately-following openGameDetail call.
    const closePath = `/${returnTab === 'scores' ? '' : returnTab}`
    history.replaceState(history.state, '', closePath)
  }

  async function goToStandings(conferenceName: string) {
    teamModalOpen.value = false
    viewTeam.value = null
    await switchMainTab('standings')
    await nextTick()
    const headings = document.querySelectorAll('.conf-title')
    for (const el of headings) {
      if (
        el.textContent
          ?.trim()
          .toLowerCase()
          .includes(conferenceName.toLowerCase().split(' ')[0] ?? '')
      ) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        break
      }
    }
  }

  // ── Apply tab (load data if needed) ──────────────────────────────────────────
  async function applyTab(tab: MainTab) {
    mainTab.value = tab
    if (tab === 'standings' && !standingsLoaded.value) {
      await fetchStandings()
    }
    if (tab === 'stats' && !statsLoaded.value) {
      await fetchStats()
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────────
  function goHome() {
    mainTab.value = 'scores'
    selectTab('this')
    router.push('/')
  }

  async function switchMainTab(tab: MainTab) {
    await applyTab(tab)
    // router.push silently no-ops on aliased routes (same component), so use
    // history.pushState directly to keep the URL in sync.
    const path = tab === 'scores' ? '/' : `/${tab}`
    history.pushState(history.state, '', path)
  }

  // ── Watch route changes (back/forward, direct URL entry) ─────────────────────
  watch(
    () => route.path,
    async (path) => {
      // If this navigation was triggered by our own code (openGameDetail,
      // closeAllModals, etc.), skip all modal logic — the caller already
      // set the correct state directly.
      if (suppressRouteWatch) {
        suppressRouteWatch = false
        // Still update the main tab if we landed on a non-modal path
        if (path !== '/game' && path !== '/team') {
          const tab = path.replace(/^\//, '') as MainTab
          await applyTab(VALID_TABS.includes(tab) ? tab : 'scores')
        }
        return
      }

      if (path === '/team') {
        const name = route.query.name as string | undefined
        viewTeam.value = name ?? null
        teamModalOpen.value = true
      } else if (path === '/game') {
        // Back/forward navigation: try to find match in scoreboard cache
        const id = route.query.id as string | undefined
        if (id) {
          const allMatches = [
            ...weeks.this.matches,
            ...weeks.last.matches,
            ...weeks.next.matches,
          ]
          const match = allMatches.find((m) => m.id === id)
          if (match) {
            gameDetailMatch.value = match
            gameDetailOpen.value = true
          }
        } else {
          gameDetailOpen.value = true
        }
      } else {
        // Genuine navigation away — close any open modals
        gameDetailOpen.value = false
        gameDetailMatch.value = null
        teamModalOpen.value = false
        viewTeam.value = null
        const tab = path.replace(/^\//, '') as MainTab
        await applyTab(VALID_TABS.includes(tab) ? tab : 'scores')
      }
    }
  )

  // ── Auto-poll every 30 s when live matches are on screen ──────────────────────
  watch(lastUpdated, (val) => {
    if (val) console.log(`[MLS Fire] Updated ${val}`)
  })

  // Poll when there are live/HT matches, OR when there are "not started" matches
  // whose kickoff time has already passed (they may have gone live since last fetch).
  const hasLiveMatches = computed(() => {
    const now = Date.now()
    return weeks[activeTab.value].matches.some(
      (m) =>
        m.status.code === 'live' ||
        m.status.code === 'ht' ||
        (m.status.code === 'ns' && new Date(m.date).getTime() <= now)
    )
  })

  let pollTimer: ReturnType<typeof setInterval> | null = null

  function startPoll() {
    if (pollTimer) return
    pollTimer = setInterval(async () => {
      if (!hasLiveMatches.value) return
      // Force-refresh the active tab so scores + W-T-L update live
      await fetchWeek(activeTab.value, true)
      // Also refresh the 'next' tab if 'this' week has live games —
      // so next week's game cards show updated W-T-L after games complete.
      if (
        activeTab.value === 'this' &&
        hasLiveGames('this') &&
        weeks.next.loaded
      ) {
        fetchWeek('next', true)
      }
      // Keep the open game detail modal in sync with the refreshed match data
      if (gameDetailOpen.value && gameDetailMatch.value) {
        const id = gameDetailMatch.value.id
        const allMatches = [
          ...weeks.this.matches,
          ...weeks.last.matches,
          ...weeks.next.matches,
        ]
        const refreshed = allMatches.find((m) => m.id === id)
        if (refreshed) gameDetailMatch.value = refreshed
      }
    }, 30_000)
  }

  function stopPoll() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  // ── Initial load (client-side) ────────────────────────────────────────────────
  async function initialLoad() {
    // Always force-refresh on the client so we never show stale SSR data.
    // SSR seeds the initial render; this call gets the true live state.
    await fetchWeek('this', true)

    const thisMatches = weeks.this.matches
    if (thisMatches.length === 0) {
      activeTab.value = 'last'
      await fetchWeek('last')
    } else {
      const hasUpcoming = thisMatches.some((m) => m.status.code === 'ns')
      const hasLive = thisMatches.some(
        (m) => m.status.code === 'live' || m.status.code === 'ht'
      )
      const allDone =
        thisMatches.length > 0 &&
        thisMatches.every((m) => m.status.code === 'ft')
      if (allDone && !hasUpcoming && !hasLive) {
        activeTab.value = 'next'
        await fetchWeek('next')
      }
    }
  }

  onMounted(async () => {
    // Apply initial route state
    const path = route.path
    const isGameRoute = path === '/game'
    const gameId = isGameRoute
      ? (route.query.id as string | undefined)
      : undefined

    if (path === '/team') {
      const name = route.query.name as string | undefined
      viewTeam.value = name ?? null
      teamModalOpen.value = true
      await applyTab('scores')
    } else if (isGameRoute) {
      // Open modal immediately — match data will be set after initialLoad
      gameDetailOpen.value = true
      await applyTab('scores')
    } else {
      const tab = path.replace(/^\//, '') as MainTab
      await applyTab(VALID_TABS.includes(tab) ? tab : 'scores')
    }

    await initialLoad()

    // After scores are loaded, resolve the match for a /game?id= refresh
    if (isGameRoute && gameId) {
      // Search all loaded weeks
      let allMatches = [
        ...weeks.this.matches,
        ...weeks.last.matches,
        ...weeks.next.matches,
      ]
      let match = allMatches.find((m) => m.id === gameId)

      // If not found, eagerly fetch last + next weeks and try again
      if (!match) {
        await Promise.all([fetchWeek('last'), fetchWeek('next')])
        allMatches = [
          ...weeks.this.matches,
          ...weeks.last.matches,
          ...weeks.next.matches,
        ]
        match = allMatches.find((m) => m.id === gameId)
      }

      if (match) {
        gameDetailMatch.value = match
      } else {
        // Game not found in any week — close the modal gracefully
        gameDetailOpen.value = false
        history.replaceState(history.state, '', '/')
      }
    }

    startPoll()
  })

  onUnmounted(() => {
    stopPoll()
  })
</script>

<template>
  <main class="page">
    <!-- ── Header (client-only: timezone detection) ──────────────────────── -->
    <ClientOnly>
      <AppHeader @go-home="goHome" @open-team-modal="openTeamModal" />
    </ClientOnly>

    <!-- ── Main tabs: Scores / Standings / Stats ────────────────────────── -->
    <div class="main-tabs">
      <button
        class="main-tab"
        :class="{ active: mainTab === 'scores' }"
        @click="switchMainTab('scores')"
      >
        Scores
      </button>
      <button
        class="main-tab"
        :class="{ active: mainTab === 'standings' }"
        @click="switchMainTab('standings')"
      >
        Standings
      </button>
      <button
        class="main-tab"
        :class="{ active: mainTab === 'stats' }"
        @click="switchMainTab('stats')"
      >
        Stats
      </button>
      <div class="tabs-spacer" />
      <!-- TeamPicker is client-only: reads localStorage for saved team -->
      <ClientOnly>
        <TeamPicker class="team-picker-in-tabs" @open-modal="openTeamModal" />
      </ClientOnly>
    </div>

    <!-- ── Content area ──────────────────────────────────────────────────── -->
    <div class="content-area">
      <!-- ── Scores tab ────────────────────────────────────────────────── -->
      <section v-if="mainTab === 'scores'" class="tab-section">
        <ScoresSection
          @select-team="openTeamModalFor"
          @open-game-detail="openGameDetail"
        />
      </section>

      <!-- ── Stats tab ─────────────────────────────────────────────────── -->
      <section
        v-else-if="mainTab === 'stats'"
        class="tab-section stats-tab-section"
      >
        <StatsSection @select-team="openTeamModalFor" />
      </section>

      <!-- ── Standings tab ─────────────────────────────────────────────── -->
      <section
        v-else-if="mainTab === 'standings'"
        class="tab-section standings-section"
      >
        <div v-if="standingsLoading" class="skeleton-list">
          <div
            v-for="i in 4"
            :key="i"
            class="skeleton-row"
            style="height: 2rem"
          />
        </div>

        <div v-else-if="standingsError" class="error-box">
          {{ standingsError }}
        </div>

        <template v-else-if="conferences.length">
          <!-- Desktop: side-by-side -->
          <div class="conferences-grid">
            <StandingsTable
              v-for="conf in conferences"
              :key="conf.name"
              :conference="conf"
              @select-team="openTeamModalFor"
            />
          </div>

          <!-- Mobile: tabbed -->
          <div class="conferences-mobile">
            <div class="conf-tabs" role="tablist">
              <button
                v-for="conf in conferences"
                :key="conf.name"
                class="conf-tab"
                :class="{ active: confTab === conf.name }"
                role="tab"
                :aria-selected="confTab === conf.name"
                @click="confTab = conf.name"
              >
                <span class="conf-tab-full">{{ conf.name }}</span>
                <span class="conf-tab-short">{{
                  conf.name.includes('Eastern') ? 'Eastern' : 'Western'
                }}</span>
              </button>
            </div>
            <StandingsTable
              v-for="conf in conferences"
              v-show="confTab === conf.name"
              :key="conf.name"
              :conference="conf"
              @select-team="openTeamModalFor"
            />
          </div>
        </template>
      </section>

      <!-- ── Footer ───────────────────────────────────────────────────── -->
      <AppFooter :show-score-legend="mainTab === 'scores'" />
    </div>

    <!-- ── My Team Modal (client-only) ──────────────────────────────────── -->
    <ClientOnly>
      <MyTeamModal
        :open="teamModalOpen"
        :view-team="viewTeam"
        @close="closeAllModals"
        @select-team="switchTeamModal"
        @view-standings="goToStandings"
        @open-game-detail="openGameDetailFromTeamModal"
      />
    </ClientOnly>

    <!-- ── Game Detail Modal (client-only) ──────────────────────────────── -->
    <ClientOnly>
      <GameDetailModal
        :open="gameDetailOpen"
        :match="gameDetailMatch"
        @close="closeAllModals"
        @select-team="openTeamModalFromGameDetail"
      />
    </ClientOnly>
  </main>
</template>

<style scoped>
  .page {
    max-width: 56rem;
    margin: 0 auto;
    padding: 0.5rem 1rem 0.5rem;
  }

  @media (max-width: 420px) {
    .page {
      padding: 0.3rem 0.625rem 0.5rem;
    }
  }

  /* ── Content area ───────────────────────────────────────────────────────── */
  .content-area {
    display: flex;
    flex-direction: column;
    min-height: calc(100vh - 8rem);
  }

  @media (max-width: 768px) {
    .content-area {
      min-height: calc(100vh - 8rem);
    }
  }

  .tab-section {
    flex: 1;
  }

  /* ── Main tabs ──────────────────────────────────────────────────────────── */
  .main-tabs {
    display: flex;
    align-items: flex-end;
    gap: 0;
    border-bottom: 1px solid oklab(100% 0 0 / 0.08);
  }

  .tabs-spacer {
    flex: 1;
  }

  .team-picker-in-tabs {
    align-self: flex-end;
    padding-bottom: 4px;
  }

  .main-tab {
    font-family: var(--font-condensed);
    font-size: 0.9375rem;
    font-weight: 300;
    letter-spacing: 0.06em;
    padding: 0.4rem 0.5rem;
    color: var(--color-text-secondary);
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition:
      color 0.15s,
      border-color 0.15s;
    position: relative;
    bottom: -1px;
    white-space: nowrap;
  }

  .main-tab:hover:not(.active) {
    color: var(--color-text-primary);
  }

  .main-tab.active {
    color: var(--color-theme-300);
    border-bottom-color: var(--color-theme-400);
    font-weight: 500;
  }

  /* ── Standings ──────────────────────────────────────────────────────────── */
  .standings-section {
    margin-top: 0;
  }

  .conferences-grid {
    display: none;
  }

  .conferences-mobile {
    display: block;
  }

  @media (min-width: 768px) {
    .conferences-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2.5rem;
    }
    .conferences-mobile {
      display: none;
    }
  }

  /* Hide the redundant conf-title heading inside the mobile tabbed view */
  .conferences-mobile :deep(.conf-title) {
    display: none;
  }

  /* ── Conference tabs (mobile) ───────────────────────────────────────────── */
  .conf-tabs {
    display: flex;
    border-bottom: 1px solid oklab(100% 0 0 / 0.1);
    margin-bottom: 0.5rem;
  }

  .conf-tab {
    flex: 1;
    font-family: var(--font-condensed);
    font-size: 0.9375rem;
    font-weight: 400;
    letter-spacing: 0.02em;
    padding: 0.4rem 0.5rem 0.5rem;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition:
      color 0.15s,
      border-color 0.15s;
    position: relative;
    bottom: -1px;
    text-align: center;
    white-space: nowrap;
  }

  .conf-tab:hover:not(.active) {
    color: var(--color-text-primary);
  }

  .conf-tab.active {
    color: var(--color-text-primary);
    border-bottom-color: var(--color-theme-400, #60a5fa);
    font-weight: 200;
    letter-spacing: 0.1rem;
  }

  .conf-tab-short {
    display: none;
  }

  .conf-tab-full {
    display: inline;
  }

  @media (max-width: 480px) {
    .conf-tab-full {
      display: none;
    }
    .conf-tab-short {
      display: inline;
    }
  }

  /* ── Skeleton / error ───────────────────────────────────────────────────── */
  .initial-skeleton {
    padding-top: 0.5rem;
  }

  .skeleton-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .skeleton-row {
    height: 2.75rem;
    border-radius: 0.5rem;
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

  .error-box {
    margin-bottom: 1rem;
    border-radius: 0.5rem;
    background: oklab(30.8% 0.072 0.028 / 0.3);
    border: 1px solid oklab(68.5% 0.13 0.048 / 0.2);
    padding: 0.625rem 1rem;
    font-size: 0.75rem;
    color: oklab(75.8% 0.107 0.04);
  }
</style>
