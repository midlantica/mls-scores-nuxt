<script setup lang="ts">
import { useScores } from '~/composables/useScores'
import { useStandings } from '~/composables/useStandings'
import { useTimezone, TZ_OPTIONS } from '~/composables/useTimezone'
import type { Match } from '~/composables/useScores'

// ── Main tab ──────────────────────────────────────────────────────────────────
type MainTab = 'scores' | 'standings'
const mainTab = ref<MainTab>('scores')

// ── Timezone ──────────────────────────────────────────────────────────────────
const { selectedTz, kickoffKey: tzKickoffKey } = useTimezone()

// ── Scores composable ─────────────────────────────────────────────────────────
const { weeks, activeTab, lastUpdated, fetchWeek, selectTab } = useScores()

// ── Standings composable ──────────────────────────────────────────────────────
const { conferences, loading: standingsLoading, error: standingsError, loaded: standingsLoaded, fetchStandings } = useStandings()

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
  key: string        // e.g. "2026-05-14"
  label: string      // e.g. "Wed"
  shortDate: string  // e.g. "May 14"
  matches: Match[]
}

function toCTDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }) // YYYY-MM-DD
}
function toCTDayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/Chicago' })
}
function toCTShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Chicago' })
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
// Computed synchronously so SSR and client agree on the initial value.
// User overrides are stored in _manualDayKey; null means "use auto".
const _manualDayKey = ref<string | null>(null)

function autoSelectDay(days: DayTab[]): string {
  if (days.length === 0) return ''
  const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  const todayTab = days.find(d => d.key === todayKey)
  if (todayTab) return todayKey
  // Pick nearest day to today (prefer future if equidistant)
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
    // If user manually picked a day that still exists in current week, use it
    if (_manualDayKey.value && dayTabs.value.some(d => d.key === _manualDayKey.value)) {
      return _manualDayKey.value
    }
    return autoSelectDay(dayTabs.value)
  },
  set(val: string) {
    _manualDayKey.value = val
  },
})

// Reset manual selection when week changes
watch(allWeekMatches, () => { _manualDayKey.value = null })

// Matches for the selected day
const selectedDayMatches = computed(() => {
  if (viewMode.value === 'weekbest') return allWeekMatches.value
  const day = dayTabs.value.find(d => d.key === activeDayKey.value)
  return day?.matches ?? []
})

// ── By Time: group by kickoffSlot (epoch ms), label via tzKickoffKey ──────────
// Returns [slotLabel, matches[]] sorted chronologically, each slot sorted by quality
const byTimeGroups = computed((): [string, Match[]][] => {
  const matches = selectedDayMatches.value
  // Group by kickoffSlot (stable numeric key)
  const slotMap = new Map<number, Match[]>()
  for (const m of matches) {
    const arr = slotMap.get(m.kickoffSlot) ?? []
    arr.push(m)
    slotMap.set(m.kickoffSlot, arr)
  }
  // Sort slots chronologically, then sort each slot's matches by quality desc
  return [...slotMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([slot, slotMatches]) => [
      tzKickoffKey(new Date(slot).toISOString()),
      [...slotMatches].sort((a, b) => b.qualityScore - a.qualityScore),
    ])
})

// ── Day's Best / Week's Best: sorted by quality desc ─────────────────────────
const bestMatches = computed(() =>
  [...selectedDayMatches.value].sort((a, b) => b.qualityScore - a.qualityScore)
)

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
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
  const allDone = weeks.this.matches.every(m => m.status.code === 'ft')
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
        <p class="site-date">{{ todayLabel() }}</p>
      </div>
      <div class="header-right">
        <!-- Row 1: Updated … [↻ Refresh] -->
        <div class="header-row1">
          <span class="update-label">
            {{ weeks[activeTab].loading ? 'Loading…' : lastUpdated ? `Updated ${lastUpdated}` : '' }}
          </span>
          <button
            class="btn-refresh"
            :disabled="weeks[activeTab].loading || mainTab !== 'scores'"
            @click="fetchWeek(activeTab)"
          >
            ↻ Refresh
          </button>
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
              @click="selectedTz = tz.code"
            >{{ tz.code }}</button>
          </div>
        </div>
      </div>
    </header>

    <!-- ── Main tabs: Scores / Standings ─────────────────────────────────── -->
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
    </div>

    <!-- ════════════════════════════════════════════════════════════════════ -->
    <!-- SCORES TAB                                                          -->
    <!-- ════════════════════════════════════════════════════════════════════ -->
    <section v-if="mainTab === 'scores'">

      <!-- Week sub-tabs -->
      <div class="week-tabs">
        <button
          v-for="tab in (['last', 'this', 'next'] as const)"
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
      <div v-if="weeks[activeTab].loading && !allWeekMatches.length" class="skeleton-list">
        <div v-for="i in 6" :key="i" class="skeleton-row" />
      </div>

      <!-- No matches -->
      <p v-else-if="!weeks[activeTab].loading && !allWeekMatches.length" class="empty-msg">
        No MLS matches found for this period.
      </p>

      <template v-else>

        <!-- View toggle: By Time / Day's Best / Week's Best -->
        <div class="controls-row">
          <!-- Day sub-tabs: always visible; in Week's Best all tabs appear selected -->
          <div class="day-tabs">
            <button
              v-for="day in dayTabs"
              :key="day.key"
              class="day-tab"
              :class="{ active: viewMode === 'weekbest' || activeDayKey === day.key }"
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
          <p v-if="!selectedDayMatches.length" class="empty-msg">No games on this day.</p>
          <section v-for="[slot, slotMatches] in byTimeGroups" :key="slot" class="slot-section">
            <h2 class="slot-heading">{{ slot }}</h2>
            <div class="cards">
              <MatchCard v-for="m in slotMatches" :key="m.id" :match="m" :hide-time="true" />
            </div>
          </section>
        </div>

        <!-- ── TODAY'S BEST / WEEK'S BEST view ───────────────────────── -->
        <div v-else class="match-list">
          <p v-if="!bestMatches.length" class="empty-msg">No games found.</p>
          <div class="cards">
            <MatchCard v-for="m in bestMatches" :key="m.id" :match="m" :show-date="viewMode === 'weekbest'" />
          </div>
        </div>

      </template>

    </section>

    <!-- ════════════════════════════════════════════════════════════════════ -->
    <!-- STANDINGS TAB                                                       -->
    <!-- ════════════════════════════════════════════════════════════════════ -->
    <section v-else-if="mainTab === 'standings'" class="standings-section">

      <div v-if="standingsLoading" class="skeleton-list">
        <div v-for="i in 4" :key="i" class="skeleton-row" style="height: 2rem;" />
      </div>

      <div v-else-if="standingsError" class="error-box">
        {{ standingsError }}
      </div>

      <div v-else-if="conferences.length" class="conferences-grid">
        <StandingsTable
          v-for="conf in conferences"
          :key="conf.name"
          :conference="conf"
        />
      </div>

    </section>

    <!-- ── Footer ─────────────────────────────────────────────────────────── -->
    <footer class="footer">
      <span>Live data via ESPN API</span>
      <span v-if="mainTab === 'scores'">Quality = MLS pts formula · 🔥 best games</span>
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
  color: var(--color-tropical-mint-500);
  cursor: pointer;
  user-select: none;
}
.site-title:hover {
  color: var(--color-tropical-mint-400);
}
.site-date {
  font-size: 0.6875rem;
  color: rgb(75 85 99);
  margin-top: 0.125rem;
}
.update-label {
  font-size: 0.6875rem;
  color: rgb(75 85 99);
}
.btn-refresh {
  font-size: 0.6rem;
  color: rgb(107 114 128);
  border: 1px solid rgb(255 255 255 / 0.1);
  border-radius: 0.375rem;
  padding: 0.25rem 0.5rem;
  background: transparent;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.btn-refresh:hover:not(:disabled) {
  background: rgb(255 255 255 / 0.06);
  color: rgb(209 213 219);
}
.btn-refresh:disabled { opacity: 0.4; cursor: default; }
.btn-refresh.invisible { visibility: hidden; }

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
  color: rgb(90 102 119);
  white-space: nowrap;
}

/* ── Timezone toggle ────────────────────────────────────────────────────── */
.tz-toggle {
  display: flex;
  border: 1px solid rgb(255 255 255 / 0.08);
  border-radius: 0.3rem;
  overflow: hidden;
}
.tz-btn {
  font-size: 0.5625rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 0.1875rem 0.375rem;
  color: rgb(75 85 99);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.tz-btn + .tz-btn {
  border-left: 1px solid rgb(255 255 255 / 0.06);
}
.tz-btn:hover:not(.active) {
  color: rgb(156 163 175);
  background: rgb(255 255 255 / 0.04);
}
.tz-btn.active {
  color: var(--color-tropical-mint-500);
  background: var(--color-tropical-mint-950);
}

/* ── Main tabs ──────────────────────────────────────────────────────────── */
.main-tabs {
  display: flex;
  gap: 0.25rem;
  border-bottom: 1px solid rgb(255 255 255 / 0.08);
  margin-bottom: 1.25rem;
}
.main-tab {
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem 0.375rem 0 0;
  color: rgb(107 114 128);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
  position: relative;
  bottom: -1px;
}
.main-tab:hover:not(.active) { color: rgb(209 213 219); }
.main-tab.active {
  color: var(--color-tropical-mint-500);
  border: 1px solid var(--color-tropical-mint-900);
  border-bottom-color: rgb(3 7 18);
  background: var(--color-tropical-mint-950);
}

/* ── Week sub-tabs ──────────────────────────────────────────────────────── */
.week-tabs {
  display: flex;
  width: 100%;
  border: 1px solid rgb(255 255 255 / 0.1);
  border-radius: 0.5rem;
  overflow: hidden;
  margin-bottom: 1rem;
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
  color: rgb(75 85 99);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}
.week-tab + .week-tab {
  border-left: 1px solid rgb(255 255 255 / 0.08);
}
.week-tab:hover:not(.active) {
  color: rgb(156 163 175);
  background: rgb(255 255 255 / 0.04);
}
.week-tab.active {
  color: var(--color-tropical-mint-500);
  background: var(--color-tropical-mint-950);
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
  flex-wrap: wrap;
}

/* ── Day sub-tabs ───────────────────────────────────────────────────────── */
.day-tabs {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}
.day-tabs-placeholder {
  flex: 1;
}
.day-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.4rem 1.25rem;
  border-radius: 0.375rem;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  transition: color 0.15s, background 0.15s, border-color 0.15s;
}
.day-tab:hover:not(.active) {
  background: rgb(255 255 255 / 0.04);
  border-color: rgb(255 255 255 / 0.07);
}
.day-tab.active {
  background: var(--color-tropical-mint-950);
  border-color: var(--color-tropical-mint-900);
}
.day-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgb(209 213 219);
}
.day-tab:not(.active) .day-label { color: rgb(107 114 128); }
.day-tab.active .day-label { color: var(--color-tropical-mint-500); }
.day-date {
  font-size: 0.65rem;
  color: rgb(75 85 99);
  margin-top: 0.0625rem;
}
.day-tab.active .day-date { color: var(--color-tropical-mint-800); }

/* ── View toggle ────────────────────────────────────────────────────────── */
.view-toggle {
  display: flex;
  border: 1px solid rgb(255 255 255 / 0.1);
  border-radius: 0.375rem;
  overflow: hidden;
  flex-shrink: 0;
}
.toggle-btn {
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 0.3125rem 0.625rem;
  color: rgb(107 114 128);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}
.toggle-btn + .toggle-btn {
  border-left: 1px solid rgb(255 255 255 / 0.08);
}
.toggle-btn:hover:not(.active) {
  background: rgb(255 255 255 / 0.05);
  color: rgb(156 163 175);
}
.toggle-btn.active {
  background: var(--color-tropical-mint-950);
  color: var(--color-tropical-mint-500);
}

/* ── Error / empty / skeleton ───────────────────────────────────────────── */
.error-box {
  margin-bottom: 1rem;
  border-radius: 0.5rem;
  background: rgb(127 29 29 / 0.3);
  border: 1px solid rgb(248 113 113 / 0.2);
  padding: 0.625rem 1rem;
  font-size: 0.75rem;
  color: rgb(252 165 165);
}
.skeleton-list { display: flex; flex-direction: column; gap: 0.5rem; }
.skeleton-row {
  height: 2.75rem;
  border-radius: 0.5rem;
  background: rgb(255 255 255 / 0.05);
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.empty-msg {
  font-size: 0.875rem;
  color: rgb(75 85 99);
  text-align: center;
  padding: 3rem 0;
}

/* ── Match list ─────────────────────────────────────────────────────────── */
.match-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.slot-section { display: flex; flex-direction: column; gap: 0.5rem; }
.slot-heading {
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-tropical-mint-600);
  text-align: center;
}
.cards { display: flex; flex-direction: column; gap: 0.375rem; }

/* ── Standings ──────────────────────────────────────────────────────────── */
.standings-section { margin-top: 0.5rem; }
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
  border-top: 1px solid rgb(255 255 255 / 0.06);
  font-size: 0.6875rem;
  color: rgb(55 65 81);
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.25rem;
}
</style>
