<script setup lang="ts">
  import { useScores, transformMatches } from '~/composables/useScores'
  import { useStandings } from '~/composables/useStandings'
  import { useStats } from '~/composables/useStats'
  import type { Match } from '~/composables/useScores'

  // Register all app routes on this single page component
  definePageMeta({
    alias: ['/scores', '/standings', '/stats', '/team', '/game'],
  })

  const router = useRouter()
  const route = useRoute()

  // ── Main tab ──────────────────────────────────────────────────────────────────
  type MainTab = 'scores' | 'standings' | 'stats'
  const VALID_TABS: MainTab[] = ['scores', 'standings', 'stats']

  function tabFromPath(): MainTab {
    const p = route.path.replace(/^\//, '') as MainTab
    return VALID_TABS.includes(p) ? p : 'scores'
  }

  const mainTab = ref<MainTab>(tabFromPath())

  // ── Scores composable ─────────────────────────────────────────────────────────
  const { weeks, activeTab, lastUpdated, fetchWeek, selectTab } = useScores()

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

  function openGameDetail(match: Match) {
    // Store the match first so the route watcher can find it even if it's
    // not in the scoreboard weeks cache (e.g. opened from team schedule).
    gameDetailMatch.value = match
    gameDetailOpen.value = true
    router.push({ path: '/game', query: { id: match.id } })
  }

  // Called from MyTeamModal when a game card is clicked.
  // We set state first so the route watcher's /game branch sees gameDetailOpen=true
  // and treats it as a no-op (already open), avoiding any double-open or close.
  function openGameDetailFromTeamModal(match: Match) {
    console.log(
      '[DBG] openGameDetailFromTeamModal',
      match.id,
      'url=',
      window.location.href
    )
    teamModalOpen.value = false
    viewTeam.value = null
    gameDetailMatch.value = match
    gameDetailOpen.value = true
    console.log(
      '[DBG] state set: open=',
      gameDetailOpen.value,
      'match=',
      gameDetailMatch.value?.id
    )
    router.push({ path: '/game', query: { id: match.id } })
    console.log('[DBG] router.push called')
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

  function openTeamModal() {
    teamModalOpen.value = true
    viewTeam.value = null
    router.push({ path: '/team' })
  }

  function openTeamModalFor(teamName: string) {
    viewTeam.value = teamName
    teamModalOpen.value = true
    router.push({ path: '/team', query: { name: teamName } })
  }

  function switchTeamModal(teamName: string) {
    viewTeam.value = teamName
    teamModalOpen.value = true
    router.replace({ path: '/team', query: { name: teamName } })
  }

  function closeTeamModal() {
    teamModalOpen.value = false
    viewTeam.value = null
    router.push({ path: `/${mainTab.value === 'scores' ? '' : mainTab.value}` })
  }

  function closeAllModals() {
    console.log(
      '[DBG] closeAllModals called',
      new Error().stack?.split('\n').slice(1, 4).join(' | ')
    )
    gameDetailOpen.value = false
    gameDetailMatch.value = null
    teamModalOpen.value = false
    viewTeam.value = null
    router.push({ path: `/${mainTab.value === 'scores' ? '' : mainTab.value}` })
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
    router.push(tab === 'scores' ? '/' : `/${tab}`)
  }

  // ── Watch route changes (back/forward, direct URL entry) ─────────────────────
  watch(
    () => route.path,
    async (path) => {
      if (path === '/team') {
        const name = route.query.name as string | undefined
        viewTeam.value = name ?? null
        teamModalOpen.value = true
      } else if (path === '/game') {
        // If gameDetailOpen is already true and match is set, this navigation
        // was triggered programmatically by openGameDetail — nothing to do.
        if (gameDetailOpen.value && gameDetailMatch.value) {
          // already open, no-op
        } else {
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
        }
      } else {
        // Close modals when navigating away
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
    if (val) console.log(`[MLS Scores] Updated ${val}`)
  })

  const hasLiveMatches = computed(() =>
    weeks[activeTab.value].matches.some(
      (m) => m.status.code === 'live' || m.status.code === 'ht'
    )
  )

  let pollTimer: ReturnType<typeof setInterval> | null = null

  function startPoll() {
    if (pollTimer) return
    pollTimer = setInterval(() => {
      if (hasLiveMatches.value && mainTab.value === 'scores') {
        fetchWeek(activeTab.value)
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
    await fetchWeek('this')

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
    if (path === '/team') {
      const name = route.query.name as string | undefined
      viewTeam.value = name ?? null
      teamModalOpen.value = true
      await applyTab('scores')
    } else if (path === '/game') {
      gameDetailOpen.value = true
      await applyTab('scores')
    } else {
      const tab = path.replace(/^\//, '') as MainTab
      await applyTab(VALID_TABS.includes(tab) ? tab : 'scores')
    }

    await initialLoad()
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
    align-items: stretch;
    gap: 0.25rem;
    border-bottom: 1px solid oklab(100% 0 0 / 0.08);
  }

  .tabs-spacer {
    flex: 1;
  }

  .team-picker-in-tabs {
    align-self: flex-end;
  }

  .main-tab {
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-size: 0.9375rem;
    font-weight: 300;
    letter-spacing: 0.06em;
    padding: 0.4rem 0.625rem;
    border-radius: 0.375rem 0.375rem 0 0;
    color: var(--color-text-secondary);
    background: transparent;
    border: none;
    cursor: pointer;
    transition:
      color 0.15s,
      background 0.15s;
    position: relative;
    bottom: -1px;
  }

  .main-tab:hover:not(.active) {
    color: var(--color-text-secondary);
  }

  .main-tab.active {
    color: var(--color-theme-300);
    border: 1px solid oklab(100% 0 0 / 0.1);
    border-bottom-color: var(--app-bg, oklch(12.9% 0.042 264.3));
    background: var(--color-theme-900);
  }

  /* ── Standings ──────────────────────────────────────────────────────────── */
  .standings-section {
    margin-top: 1rem;
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
    margin-bottom: 1rem;
  }

  .conf-tab {
    flex: 1;
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
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
    font-weight: 600;
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
