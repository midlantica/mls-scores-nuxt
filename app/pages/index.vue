<script setup lang="ts">
  import { useScores } from '~/composables/useScores'
  import { useStandings } from '~/composables/useStandings'
  import { useTimezone, TZ_OPTIONS } from '~/composables/useTimezone'
  import {
    useMyTeam,
    TEAM_LIST,
    TEAM_SHORT_NAME,
  } from '~/composables/useMyTeam'
  import type { Match } from '~/composables/useScores'

  // ── Main tab ──────────────────────────────────────────────────────────────────
  type MainTab = 'scores' | 'standings'
  const mainTab = ref<MainTab>('scores')

  // ── Timezone ──────────────────────────────────────────────────────────────────
  const {
    selectedTz,
    setTz,
    kickoffKey: tzKickoffKey,
    kickoffKeyHtml: tzKickoffKeyHtml,
  } = useTimezone()

  // ── Scores composable ─────────────────────────────────────────────────────────
  const { weeks, activeTab, lastUpdated, fetchWeek, selectTab } = useScores()

  // ── Standings composable ──────────────────────────────────────────────────────
  const {
    conferences,
    loading: standingsLoading,
    error: standingsError,
    loaded: standingsLoaded,
    fetchStandings,
  } = useStandings()

  // ── My Team ───────────────────────────────────────────────────────────────────
  const { selectedTeam, selectTeam, logoUrl } = useMyTeam()
  const teamPickerOpen = ref(false)
  const teamModalOpen = ref(false)
  const viewTeam = ref<string | null>(null)
  const teamPickerRef = ref<HTMLElement | null>(null)

  function toggleTeamPicker() {
    teamPickerOpen.value = !teamPickerOpen.value
  }

  function openTeamModal() {
    if (selectedTeam.value) {
      teamModalOpen.value = true
    } else {
      teamPickerOpen.value = !teamPickerOpen.value
    }
  }

  function openTeamModalFor(teamName: string) {
    viewTeam.value = teamName
    teamModalOpen.value = true
  }

  function closeTeamModal() {
    teamModalOpen.value = false
    viewTeam.value = null
  }

  async function goToStandings(conferenceName: string) {
    closeTeamModal()
    await switchMainTab('standings')
    // Scroll to the matching conference section after a tick
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

  function chooseTeam(name: string | null) {
    selectTeam(name)
    teamPickerOpen.value = false
  }

  // Close picker on outside click
  onMounted(() => {
    document.addEventListener('click', (e) => {
      if (
        teamPickerOpen.value &&
        teamPickerRef.value &&
        !teamPickerRef.value.contains(e.target as Node)
      ) {
        teamPickerOpen.value = false
      }
    })
  })

  // ── Auto-poll every 90 seconds when there are live/HT matches ────────────────
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
    }, 90_000)
  }

  function stopPoll() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  onMounted(startPoll)
  onUnmounted(stopPoll)

  async function switchMainTab(tab: MainTab) {
    mainTab.value = tab
    if (tab === 'standings' && !standingsLoaded.value) {
      await fetchStandings()
    }
  }

  function goHome() {
    mainTab.value = 'scores'
    selectTab('this')
    viewMode.value = 'bytime'
  }

  // ── View mode: By Time / Day's Best / Week's Best ────────────────────────────
  type ViewMode = 'bytime' | 'todaybest' | 'weekbest'
  const viewMode = ref<ViewMode>('bytime')

  // ── All matches for active week ───────────────────────────────────────────────
  const allWeekMatches = computed(() => weeks[activeTab.value].matches)

  // ── Day sub-tabs ──────────────────────────────────────────────────────────────
  // Build list of unique days that have games (CT date label)
  interface DayTab {
    key: string // e.g. "2026-05-14"
    label: string // e.g. "Wed"
    shortDate: string // e.g. "May 14"
    matches: Match[]
  }

  function toCTDateKey(iso: string): string {
    return new Date(iso).toLocaleDateString('en-CA', {
      timeZone: 'America/Chicago',
    }) // YYYY-MM-DD
  }
  function toCTDayLabel(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'short',
      timeZone: 'America/Chicago',
    })
  }
  function toCTShortDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'America/Chicago',
    })
  }

  const dayTabs = computed<DayTab[]>(() => {
    const map = new Map<string, Match[]>()
    for (const m of allWeekMatches.value) {
      const key = toCTDateKey(m.date)
      const arr = map.get(key) ?? []
      arr.push(m)
      map.set(key, arr)
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, matches]) => ({
        key,
        label: toCTDayLabel(matches[0]!.date),
        shortDate: toCTShortDate(matches[0]!.date),
        matches,
      }))
  })

  // ── Active day key ────────────────────────────────────────────────────────────
  const _manualDayKey = ref<string | null>(null)

  function autoSelectDay(days: DayTab[]): string {
    if (days.length === 0) return ''
    const todayKey = new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/Chicago',
    })
    const todayTab = days.find((d) => d.key === todayKey)
    if (todayTab) return todayKey
    const todayMs = new Date(todayKey).getTime()
    return days.reduce((best: DayTab, d: DayTab) => {
      const dMs = new Date(d.key).getTime()
      const bestMs = new Date(best.key).getTime()
      const dDiff = Math.abs(dMs - todayMs)
      const bestDiff = Math.abs(bestMs - todayMs)
      if (dDiff < bestDiff) return d
      if (dDiff === bestDiff && dMs > bestMs) return d
      return best
    }).key
  }

  const activeDayKey = computed({
    get() {
      if (
        _manualDayKey.value &&
        dayTabs.value.some((d) => d.key === _manualDayKey.value)
      ) {
        return _manualDayKey.value
      }
      return autoSelectDay(dayTabs.value)
    },
    set(val: string) {
      _manualDayKey.value = val
    },
  })

  watch(allWeekMatches, () => {
    _manualDayKey.value = null
  })

  const selectedDayMatches = computed(() => {
    if (viewMode.value === 'weekbest') return allWeekMatches.value
    const day = dayTabs.value.find((d) => d.key === activeDayKey.value)
    return day?.matches ?? []
  })

  // ── By Time: group by kickoffSlot ─────────────────────────────────────────────
  const byTimeGroups = computed((): [string, Match[]][] => {
    const matches = selectedDayMatches.value
    const slotMap = new Map<number, Match[]>()
    for (const m of matches) {
      const arr = slotMap.get(m.kickoffSlot) ?? []
      arr.push(m)
      slotMap.set(m.kickoffSlot, arr)
    }
    return [...slotMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([slot, slotMatches]) => [
        tzKickoffKeyHtml(new Date(slot).toISOString()),
        [...slotMatches].sort((a, b) => b.qualityScore - a.qualityScore),
      ])
  })

  // ── Day's Best / Week's Best ──────────────────────────────────────────────────
  const bestMatches = computed(() =>
    [...selectedDayMatches.value].sort(
      (a, b) => b.qualityScore - a.qualityScore
    )
  )

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function todayLabel(): string {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  function selectDay(key: string) {
    activeDayKey.value = key
    if (viewMode.value === 'weekbest') viewMode.value = 'todaybest'
  }

  // ── Initial load ──────────────────────────────────────────────────────────────
  await fetchWeek('this')

  if (weeks.this.matches.length === 0) {
    activeTab.value = 'last'
    await fetchWeek('last')
  } else {
    const allDone = weeks.this.matches.every((m) => m.status.code === 'ft')
    if (allDone) {
      activeTab.value = 'next'
      await fetchWeek('next')
    }
  }
</script>

<template>
  <main class="page">
    <!-- ── Header ─────────────────────────────────────────────────────────── -->
    <header class="header">
      <div>
        <h1 class="site-title" role="button" @click="goHome">⚽ MLS Scores</h1>
        <ClientOnly
          ><p class="site-date">{{ todayLabel() }}</p></ClientOnly
        >
      </div>
      <div class="header-right">
        <!-- Row 1: Updated timestamp -->
        <div class="header-row1">
          <ClientOnly>
            <span class="update-label">
              {{
                weeks[activeTab].loading
                  ? 'Loading…'
                  : lastUpdated
                    ? `Updated ${lastUpdated}`
                    : ''
              }}
            </span>
          </ClientOnly>
        </div>
        <!-- Row 2: Time zone: [ ET | CT | MT | PT ] -->
        <div class="header-row2">
          <span class="tz-label">Time Zone</span>
          <div class="tz-toggle">
            <button
              v-for="tz in TZ_OPTIONS"
              :key="tz.code"
              class="tz-btn"
              :class="{ active: selectedTz === tz.code }"
              @click="setTz(tz.code)"
            >
              {{ tz.code }}
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- ── Main tabs: Scores / Standings / [My Team picker] ──────────────── -->
    <ClientOnly>
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

        <!-- Spacer -->
        <div class="tabs-spacer" />

        <!-- My Team picker -->
        <div ref="teamPickerRef" class="my-team-wrap">
          <button
            class="my-team-btn"
            :class="{ 'has-team': !!selectedTeam }"
            :title="
              selectedTeam ? `My Team: ${selectedTeam}` : 'Choose your team'
            "
            @click="openTeamModal"
          >
            <!-- Logo or placeholder box -->
            <span class="team-logo-slot">
              <img
                v-if="logoUrl"
                :src="logoUrl"
                :alt="selectedTeam ?? ''"
                class="team-logo-img"
              />
              <span v-else class="team-logo-placeholder" />
            </span>
            <span class="my-team-label">
              {{
                selectedTeam
                  ? (TEAM_SHORT_NAME[selectedTeam] ?? selectedTeam)
                  : 'My Team'
              }}
            </span>
          </button>
          <!-- Separate caret button — always opens the dropdown -->
          <button
            class="my-team-caret-btn"
            :class="{ 'has-team': !!selectedTeam }"
            :title="'Change team'"
            @click.stop="toggleTeamPicker"
            aria-label="Choose team"
          >
            <span class="my-team-caret">▾</span>
          </button>

          <!-- Dropdown -->
          <div v-if="teamPickerOpen" class="team-dropdown">
            <div class="team-dropdown-inner">
              <!-- Clear option -->
              <button
                class="team-option team-option-clear"
                @click="chooseTeam(null)"
              >
                — No team —
              </button>
              <button
                v-for="team in TEAM_LIST"
                :key="team"
                class="team-option"
                :class="{ selected: selectedTeam === team }"
                @click="chooseTeam(team)"
              >
                {{ team }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ════════════════════════════════════════════════════════════════════ -->
      <!-- SCORES TAB                                                          -->
      <!-- ════════════════════════════════════════════════════════════════════ -->
      <section v-if="mainTab === 'scores'">
        <!-- Week sub-tabs -->
        <div class="week-tabs">
          <button
            v-for="tab in ['last', 'this', 'next'] as const"
            :key="tab"
            class="week-tab"
            :class="{ active: activeTab === tab }"
            @click="selectTab(tab)"
          >
            <span v-if="tab === 'last'">← Last</span>
            <span v-else-if="tab === 'this'">This Week</span>
            <span v-else>Next →</span>
            <span class="week-label">{{ weeks[tab].label }}</span>
          </button>
        </div>

        <!-- Loading skeleton -->
        <div
          v-if="weeks[activeTab].loading && !allWeekMatches.length"
          class="skeleton-list"
        >
          <div v-for="i in 6" :key="i" class="skeleton-row" />
        </div>

        <!-- No matches -->
        <p
          v-else-if="!weeks[activeTab].loading && !allWeekMatches.length"
          class="empty-msg"
        >
          No MLS matches found for this period.
        </p>

        <template v-else>
          <!-- View toggle: By Time / Day's Best / Week's Best -->
          <div class="controls-row">
            <!-- Day sub-tabs -->
            <div class="day-tabs">
              <button
                v-for="day in dayTabs"
                :key="day.key"
                class="day-tab"
                :class="{
                  active: viewMode === 'weekbest' || activeDayKey === day.key,
                }"
                @click="selectDay(day.key)"
              >
                <span class="day-label">{{ day.label }}</span>
                <span class="day-date">{{ day.shortDate }}</span>
              </button>
            </div>

            <div class="view-toggle">
              <button
                class="toggle-btn"
                :class="{ active: viewMode === 'bytime' }"
                @click="viewMode = 'bytime'"
              >
                By Time
              </button>
              <button
                class="toggle-btn"
                :class="{ active: viewMode === 'todaybest' }"
                @click="viewMode = 'todaybest'"
              >
                Day's Best
              </button>
              <button
                class="toggle-btn"
                :class="{ active: viewMode === 'weekbest' }"
                @click="viewMode = 'weekbest'"
              >
                Week's Best
              </button>
            </div>
          </div>

          <!-- ── BY TIME view ───────────────────────────────────────────── -->
          <div v-if="viewMode === 'bytime'" class="match-list">
            <p v-if="!selectedDayMatches.length" class="empty-msg">
              No games on this day.
            </p>
            <section
              v-for="[slot, slotMatches] in byTimeGroups"
              :key="slot"
              class="slot-section"
            >
              <h2 class="slot-heading" v-html="slot" />
              <div class="cards-grid">
                <GameBlock
                  v-for="m in slotMatches"
                  :key="m.id"
                  :match="m"
                  @select-team="openTeamModalFor"
                />
              </div>
            </section>
          </div>

          <!-- ── TODAY'S BEST / WEEK'S BEST view ───────────────────────── -->
          <div v-else class="match-list">
            <p v-if="!bestMatches.length" class="empty-msg">No games found.</p>
            <div class="cards-grid">
              <GameBlock
                v-for="m in bestMatches"
                :key="m.id"
                :match="m"
                :show-date="viewMode === 'weekbest'"
                @select-team="openTeamModalFor"
              />
            </div>
          </div>
        </template>
      </section>

      <!-- ════════════════════════════════════════════════════════════════════ -->
      <!-- STANDINGS TAB                                                       -->
      <!-- ════════════════════════════════════════════════════════════════════ -->
      <section v-else-if="mainTab === 'standings'" class="standings-section">
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

        <div v-else-if="conferences.length" class="conferences-grid">
          <StandingsTable
            v-for="conf in conferences"
            :key="conf.name"
            :conference="conf"
            @select-team="openTeamModalFor"
          />
        </div>
      </section>

      <!-- ── My Team Modal ──────────────────────────────────────────────────── -->
      <MyTeamModal
        :open="teamModalOpen"
        :view-team="viewTeam"
        @close="closeTeamModal"
        @select-team="openTeamModalFor"
        @view-standings="goToStandings"
      />

      <!-- ── Footer ─────────────────────────────────────────────────────────── -->
      <footer class="footer">
        <span>Live data via ESPN API</span>
        <span v-if="mainTab === 'scores'"
          >Quality = MLS pts formula · 🔥 best games</span
        >
      </footer>
    </ClientOnly>
  </main>
</template>

<style scoped>
  .page {
    max-width: 56rem;
    margin: 0 auto;
    padding: 1rem 1rem 2rem;
  }

  /* ── Header ─────────────────────────────────────────────────────────────── */
  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 1.5rem;
  }
  .site-title {
    font-size: 1.125rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--color-theme-400);
    cursor: pointer;
    user-select: none;
    transition: color 0.15s;
  }
  .site-title:hover {
    color: var(--color-theme-300);
  }
  .site-date {
    font-size: 0.6875rem;
    color: var(--color-text-secondary);
    margin-top: 0.125rem;
  }
  .update-label {
    font-size: 0.6875rem;
    color: var(--color-text-secondary);
  }
  @media (max-width: 530px) {
    .update-label {
      display: none;
    }
  }
  .btn-refresh {
    font-size: 0.6rem;
    color: var(--color-text-secondary);
    border: 1px solid oklab(100% 0 0 / 0.1);
    border-radius: 0.375rem;
    padding: 0.25rem 0.5rem;
    background: transparent;
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s;
  }
  .btn-refresh:hover:not(:disabled) {
    background: oklab(100% 0 0 / 0.06);
    color: var(--color-text-secondary);
  }
  .btn-refresh:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .btn-refresh.invisible {
    visibility: hidden;
  }

  /* ── Header right: two rows, flush right ───────────────────────────────── */
  .header-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
  }
  .header-row1 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .header-row2 {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }
  .tz-label {
    font-size: 0.647rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-text-secondary);
    white-space: nowrap;
  }
  @media (max-width: 530px) {
    .tz-label {
      display: none;
    }
  }

  /* ── Timezone toggle ────────────────────────────────────────────────────── */
  .tz-toggle {
    display: flex;
    border: 1px solid oklab(100% 0 0 / 0.08);
    border-radius: 0.3rem;
    overflow: hidden;
  }
  .tz-btn {
    font-size: 0.5625rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    padding: 0.1875rem 0.375rem;
    color: var(--color-text-secondary);
    background: transparent;
    border: none;
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s;
  }
  .tz-btn + .tz-btn {
    border-left: 1px solid oklab(100% 0 0 / 0.06);
  }
  .tz-btn:hover:not(.active) {
    color: var(--color-text-secondary);
    background: oklab(100% 0 0 / 0.04);
  }
  .tz-btn.active {
    color: var(--color-theme-300);
    background: var(--color-theme-900);
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
  .main-tab {
    font-size: 0.875rem;
    font-weight: 500;
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
    border: 1px solid var(--color-theme-700);
    border-bottom-color: var(--app-bg, oklch(12.9% 0.042 264.3));
    background: var(--color-theme-900);
  }

  /* ── My Team picker ─────────────────────────────────────────────────────── */
  .my-team-wrap {
    position: relative;
    display: flex;
    align-items: stretch;
    gap: 2px;
    margin-bottom: 4px;
  }

  .my-team-btn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.3rem 0.5rem;
    border-radius: 0.375rem 0 0 0.375rem;
    border: none;
    background: transparent;
    cursor: pointer;
    transition: background 0.15s;
    white-space: nowrap;
  }
  .my-team-btn:hover {
    background: oklab(100% 0 0 / 0.06);
  }
  .my-team-btn.has-team {
    background: var(--color-theme-900);
  }

  /* Logo slot: fixed-size box, slate bg until a logo fills it */
  .team-logo-slot {
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .team-logo-placeholder {
    display: block;
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 0.2rem;
    background: var(--color-theme-800);
    opacity: 0.5;
  }
  .team-logo-img {
    width: 1.5rem;
    height: 1.5rem;
    object-fit: contain;
    border-radius: 0.15rem;
  }

  .my-team-label {
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-size: 0.75rem;
    font-weight: 100;
    letter-spacing: 0.04em;
    color: var(--color-theme-300);
    max-width: 8rem;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .my-team-caret-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.3rem 0.375rem;
    border-radius: 0 0.375rem 0.375rem 0;
    border: none;
    background: transparent;
    cursor: pointer;
    transition: background 0.15s;
    flex-shrink: 0;
  }
  .my-team-caret-btn:hover {
    background: oklab(100% 0 0 / 0.08);
  }
  .my-team-caret-btn.has-team {
    background: var(--color-theme-900);
  }
  .my-team-caret-btn.has-team:hover {
    background: color-mix(in oklab, var(--color-theme-900) 80%, white);
  }

  .my-team-caret {
    font-size: 1.5rem;
    color: var(--color-theme-400);
    line-height: 1;
    margin: -0.15rem 0.1rem 0;
    padding: 0;
  }

  /* Dropdown */
  .team-dropdown {
    position: absolute;
    top: calc(100% + 0.375rem);
    right: 0;
    z-index: 100;
    background: oklch(18% 0.025 260);
    border: 1px solid var(--color-theme-800);
    border-radius: 0.5rem;
    box-shadow: 0 8px 24px oklab(0% 0 0 / 0.5);
    min-width: 14rem;
    max-height: 22rem;
    overflow: hidden;
  }
  .team-dropdown-inner {
    overflow-y: auto;
    max-height: 22rem;
    padding: 0.25rem 0;
  }
  .team-option {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.4rem 0.875rem;
    font-size: 0.8125rem;
    font-weight: 400;
    color: oklab(88% 0 0);
    background: transparent;
    border: none;
    cursor: pointer;
    transition:
      background 0.1s,
      color 0.1s;
    white-space: nowrap;
  }
  .team-option:hover {
    background: var(--color-theme-900);
    color: var(--color-theme-300);
  }
  .team-option.selected {
    color: var(--color-theme-400);
    background: var(--color-theme-950);
    font-weight: 600;
  }
  .team-option-clear {
    font-style: italic;
    opacity: 0.6;
    border-bottom: 1px solid oklab(100% 0 0 / 0.06);
    margin-bottom: 0.125rem;
  }
  .team-option-clear:hover {
    opacity: 1;
  }

  /* ── Week sub-tabs ──────────────────────────────────────────────────────── */
  .week-tabs {
    display: flex;
    width: 100%;
    border-left: 1px solid oklab(100% 0 0 / 0.1);
    border-bottom: 1px solid oklab(100% 0 0 / 0.1);
    border-right: 1px solid oklab(100% 0 0 / 0.1);
    border-radius: 0rem 0rem 0.5rem 0.5rem;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }
  .week-tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0.5rem 0.5rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    background: transparent;
    border: none;
    cursor: pointer;
    transition:
      color 0.15s,
      background 0.15s;
  }
  .week-tab + .week-tab {
    border-left: 1px solid oklab(100% 0 0 / 0.08);
  }
  .week-tab:hover:not(.active) {
    color: var(--color-text-secondary);
    background: oklab(100% 0 0 / 0.04);
  }
  .week-tab.active {
    color: var(--color-theme-300);
    background: var(--color-theme-900);
  }
  .week-label {
    font-size: 0.625rem;
    font-weight: 400;
    opacity: 0.6;
    margin-top: 0.125rem;
  }

  /* ── Controls row (day tabs + view toggle) ──────────────────────────────── */
  .controls-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  /* ── Day sub-tabs — segmented control ───────────────────────────────────── */
  .day-tabs {
    display: flex;
    border: 1px solid oklab(100% 0 0 / 0.1);
    border-radius: 0.375rem;
    overflow: hidden;
    flex-shrink: 1;
    min-width: 0;
  }
  .day-tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.4rem 0.75rem;
    border: none;
    border-left: 1px solid oklab(100% 0 0 / 0.08);
    background: transparent;
    cursor: pointer;
    transition:
      color 0.15s,
      background 0.15s;
    white-space: nowrap;
  }
  .day-tab:first-child {
    border-left: none;
  }
  .day-tab:hover:not(.active) {
    background: oklab(100% 0 0 / 0.04);
  }
  .day-tab.active {
    background: var(--color-theme-900);
  }
  .day-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-secondary);
  }
  .day-tab:not(.active) .day-label {
    color: var(--color-text-secondary);
  }
  .day-tab.active .day-label {
    color: var(--color-theme-300);
  }
  .day-date {
    font-size: 0.65rem;
    color: var(--color-text-secondary);
    margin-top: 0.0625rem;
  }
  .day-tab.active .day-date {
    color: var(--color-theme-500);
  }

  /* ── View toggle ────────────────────────────────────────────────────────── */
  .view-toggle {
    display: flex;
    border: 1px solid oklab(100% 0 0 / 0.1);
    border-radius: 0.375rem;
    overflow: hidden;
    flex-shrink: 0;
  }
  .toggle-btn {
    font-size: 0.6875rem;
    font-weight: 500;
    padding: 0.3125rem 0.625rem;
    color: var(--color-text-secondary);
    background: transparent;
    border: none;
    cursor: pointer;
    transition:
      background 0.15s,
      color 0.15s;
    white-space: nowrap;
  }
  .toggle-btn + .toggle-btn {
    border-left: 1px solid oklab(100% 0 0 / 0.08);
  }
  .toggle-btn:hover:not(.active) {
    background: oklab(100% 0 0 / 0.05);
    color: var(--color-text-secondary);
  }
  .toggle-btn.active {
    background: var(--color-theme-900);
    color: var(--color-theme-300);
  }

  /* ── Mobile: full-width day tabs + attached view toggle ─────────────────── */
  @media (max-width: 530px) {
    .controls-row {
      flex-direction: column;
      align-items: stretch;
      gap: 0;
    }
    .day-tabs {
      border-radius: 0.375rem 0.375rem 0 0;
      border-bottom: none;
    }
    .view-toggle {
      border-radius: 0 0 0.375rem 0.375rem;
      border-top: 1px solid oklab(100% 0 0 / 0.08);
    }
    .day-tab {
      padding: 0.5rem 0.5rem;
    }
    .toggle-btn {
      flex: 1;
      text-align: center;
    }
  }

  /* ── Error / empty / skeleton ───────────────────────────────────────────── */
  .error-box {
    margin-bottom: 1rem;
    border-radius: 0.5rem;
    background: oklab(30.8% 0.072 0.028 / 0.3);
    border: 1px solid oklab(68.5% 0.13 0.048 / 0.2);
    padding: 0.625rem 1rem;
    font-size: 0.75rem;
    color: oklab(75.8% 0.107 0.04);
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
  .empty-msg {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    text-align: center;
    padding: 3rem 0;
  }

  /* ── Match list ─────────────────────────────────────────────────────────── */
  .match-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .slot-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .slot-heading {
    font-size: 0.9344rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-theme-300);
    text-align: left;
  }
  .slot-heading :deep(.ampm) {
    font-size: 0.8em;
  }
  .cards {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  /* ── GameBlock multi-column grid ────────────────────────────────────────── */
  .cards-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  @media (min-width: 560px) {
    .cards-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (min-width: 820px) {
    .cards-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  /* ── Standings ──────────────────────────────────────────────────────────── */
  .standings-section {
    margin-top: 1rem;
  }

  .conferences-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  @media (min-width: 768px) {
    .conferences-grid {
      grid-template-columns: 1fr 1fr;
      gap: 2.5rem;
    }
  }

  /* ── Footer ─────────────────────────────────────────────────────────────── */
  .footer {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid oklab(100% 0 0 / 0.06);
    font-size: 0.6875rem;
    color: oklab(30.8% -0.005 -0.021);
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.25rem;
  }
</style>
