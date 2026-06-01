<script setup lang="ts">
  import { useScores } from '~/composables/useScores'
  import { useMatchView } from '~/composables/useMatchView'
  import {
    WC_ANNOUNCED,
    WC_RESUME,
    POST_WC_NOTICE_TITLE,
    POST_WC_NOTICE_MESSAGE,
  } from '~/constants/mls'

  import type { Match } from '~/composables/useScores'
  const emit = defineEmits<{
    'select-team': [team: string]
    'open-game-detail': [match: Match]
  }>()

  const { weeks, activeTab, selectTab } = useScores()

  const allWeekMatches = computed(() => weeks[activeTab.value].matches)

  // Hiatus message comes from the server (scores API) — it's set when the
  // current week falls inside a known hiatus window (WC break, off-season).
  const hiatusMsg = computed(() => weeks[activeTab.value].hiatus ?? null)

  // Banner: shown on "next" tab when today is inside a hiatus window.
  // Uses the "this week" hiatus flag OR a direct date-range check as fallback
  // (in case "this week" data hasn't loaded yet when the user lands on Next).
  const showHiatusBanner = computed((): boolean => {
    if (activeTab.value !== 'next') return false
    if (weeks.this.hiatus) return true
    // Show banner on Next tab any time before MLS resumes (Jul 22 2026),
    // covering both the lead-up to the break and the break itself.
    const today = new Date()
    return today >= WC_ANNOUNCED && today < WC_RESUME
  })

  const { weekByDayGroups } = useMatchView(allWeekMatches, activeTab)

  // ── Collapse state ────────────────────────────────────────────────────────
  // Track open/closed state for each day and each time slot.
  // Keys: day key (e.g. "2026-05-13") and slot label (e.g. "6:30PM").
  // Past days are auto-collapsed. Time slots stay open unless the user
  // manually closes them (user intent is remembered).
  //
  // User-toggled state is persisted to localStorage keyed by today's CT date
  // (e.g. "mls-collapse-2026-05-23") so it survives page refreshes for the
  // rest of the day. The key changes at midnight CT, so state resets daily.
  const collapsedDays = ref<Set<string>>(new Set())
  const collapsedSlots = ref<Set<string>>(new Set())
  // Track which items were manually toggled by the user (vs auto-collapsed)
  const manuallyToggledDays = ref<Set<string>>(new Set())
  const manuallyToggledSlots = ref<Set<string>>(new Set())

  // ── localStorage persistence ──────────────────────────────────────────────
  function todayCTKey(): string {
    return new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/Chicago',
    })
  }

  function storageKey(): string {
    return `mls-collapse-${todayCTKey()}`
  }

  interface CollapseStorage {
    days: string[]
    slots: string[]
  }

  function loadSavedCollapse(): CollapseStorage {
    if (typeof localStorage === 'undefined') return { days: [], slots: [] }
    try {
      const raw = localStorage.getItem(storageKey())
      if (!raw) return { days: [], slots: [] }
      return JSON.parse(raw) as CollapseStorage
    } catch {
      return { days: [], slots: [] }
    }
  }

  function saveCollapse() {
    if (typeof localStorage === 'undefined') return
    const payload: CollapseStorage = {
      days: [...manuallyToggledDays.value]
        .filter((k) => collapsedDays.value.has(k))
        .concat(
          // Also save days that were manually OPENED (toggled but not collapsed)
          [...manuallyToggledDays.value]
            .filter((k) => !collapsedDays.value.has(k))
            .map((k) => `open:${k}`)
        ),
      slots: [...manuallyToggledSlots.value]
        .filter((k) => collapsedSlots.value.has(k))
        .concat(
          [...manuallyToggledSlots.value]
            .filter((k) => !collapsedSlots.value.has(k))
            .map((k) => `open:${k}`)
        ),
    }
    localStorage.setItem(storageKey(), JSON.stringify(payload))
  }

  function toggleDay(key: string) {
    manuallyToggledDays.value.add(key)
    if (collapsedDays.value.has(key)) {
      collapsedDays.value.delete(key)
    } else {
      collapsedDays.value.add(key)
    }
    collapsedDays.value = new Set(collapsedDays.value)
    saveCollapse()
  }

  function toggleSlot(key: string) {
    // Mark as manually toggled so auto-collapse won't override user intent
    manuallyToggledSlots.value.add(key)
    if (collapsedSlots.value.has(key)) {
      collapsedSlots.value.delete(key)
    } else {
      collapsedSlots.value.add(key)
    }
    collapsedSlots.value = new Set(collapsedSlots.value)
    saveCollapse()
  }

  // ── Auto-collapse past days/slots ─────────────────────────────────────────
  // Only applies to "This Week" — last/next week show everything open.
  // Rule: past days collapse, but the LAST day with games stays fully open
  // until midnight (so the final game of the week is always visible until 12:01am).
  // User-toggled state (from localStorage) always wins over auto-collapse.
  function buildInitialCollapse() {
    if (activeTab.value !== 'this') {
      collapsedDays.value = new Set()
      collapsedSlots.value = new Set()
      return
    }

    const todayKey = todayCTKey()

    // Load any user-toggled state saved earlier today
    const saved = loadSavedCollapse()
    const savedCollapsedDays = new Set(
      saved.days.filter((k) => !k.startsWith('open:'))
    )
    const savedOpenDays = new Set(
      saved.days.filter((k) => k.startsWith('open:')).map((k) => k.slice(5))
    )
    const savedCollapsedSlots = new Set(
      saved.slots.filter((k) => !k.startsWith('open:'))
    )
    const savedOpenSlots = new Set(
      saved.slots.filter((k) => k.startsWith('open:')).map((k) => k.slice(5))
    )

    // Restore manually-toggled tracking sets from saved state
    for (const k of savedCollapsedDays) manuallyToggledDays.value.add(k)
    for (const k of savedOpenDays) manuallyToggledDays.value.add(k)
    for (const k of savedCollapsedSlots) manuallyToggledSlots.value.add(k)
    for (const k of savedOpenSlots) manuallyToggledSlots.value.add(k)

    // Find the last day that has any matches this week
    const allDayKeys = weekByDayGroups.value.map(({ day }) => day.key)
    const lastMatchDayKey =
      allDayKeys.length > 0 ? allDayKeys[allDayKeys.length - 1] : null

    const days = new Set<string>()
    for (const { day } of weekByDayGroups.value) {
      if (manuallyToggledDays.value.has(day.key)) {
        // User explicitly toggled this day — honour their choice
        if (savedCollapsedDays.has(day.key)) days.add(day.key)
        // (if savedOpenDays, leave it out of collapsed set = open)
      } else if (day.key < todayKey && day.key !== lastMatchDayKey) {
        // Auto-collapse past days (except the last match day)
        days.add(day.key)
      }
    }

    // Slots: start from saved collapsed state, honour saved open overrides
    const slots = new Set<string>(savedCollapsedSlots)
    for (const k of savedOpenSlots) slots.delete(k)
    // Also preserve any in-memory manually-toggled slots not yet in saved state
    for (const k of manuallyToggledSlots.value) {
      if (!savedCollapsedSlots.has(k) && !savedOpenSlots.has(k)) {
        if (collapsedSlots.value.has(k)) slots.add(k)
      }
    }

    collapsedDays.value = days
    collapsedSlots.value = slots
  }

  // Run when data first arrives, and whenever the week tab changes
  watch(
    [weekByDayGroups, activeTab],
    ([groups]) => {
      if (groups.length > 0) buildInitialCollapse()
    },
    { immediate: true }
  )
</script>

<template>
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

  <!-- Hiatus banner: always shown at top of content when on Next tab during WC break -->
  <HiatusBanner v-if="showHiatusBanner" :dismissible="true" />

  <!-- Hiatus message (only after load completes and no matches) -->
  <div
    v-if="hiatusMsg && !allWeekMatches.length && !weeks[activeTab].loading"
    class="empty-state"
  >
    <h3 class="hiatus-msg">{{ hiatusMsg }}</h3>
  </div>

  <!-- All week's games: grouped by day → time slot, quality-sorted within each slot -->
  <div v-else-if="allWeekMatches.length" class="match-list">
    <section
      v-for="{ day, slots } in weekByDayGroups"
      :key="day.key"
      class="day-section"
    >
      <!-- Day heading (collapsible) -->
      <button
        class="day-heading"
        :class="{ collapsed: collapsedDays.has(day.key) }"
        @click="toggleDay(day.key)"
      >
        <span
          class="chevron"
          :class="{ 'chevron-closed': collapsedDays.has(day.key) }"
          >›</span
        >
        {{ day.label }}, {{ day.shortDate }}
      </button>

      <!-- Day content -->
      <template v-if="!collapsedDays.has(day.key)">
        <div
          v-for="[slot, slotMatches] in slots"
          :key="slot"
          class="slot-section"
        >
          <!-- Slot heading (collapsible) -->
          <button
            class="slot-heading"
            :class="{ collapsed: collapsedSlots.has(day.key + slot) }"
            @click="toggleSlot(day.key + slot)"
          >
            <span
              class="chevron chevron-sm"
              :class="{ 'chevron-closed': collapsedSlots.has(day.key + slot) }"
              >›</span
            >
            <span v-html="slot" />
          </button>

          <!-- Slot content -->
          <div v-if="!collapsedSlots.has(day.key + slot)" class="cards-grid">
            <GameBlock
              v-for="m in slotMatches"
              :key="m.id"
              :match="m"
              @open-game-detail="emit('open-game-detail', $event)"
            />
          </div>
        </div>
      </template>
    </section>

    <!-- Post-World Cup schedule notice: only on the Next tab, at the very
         bottom of the listings so people know why no more games are shown. -->
    <HiatusBanner
      v-if="activeTab === 'next'"
      :show-icon="false"
      :title="POST_WC_NOTICE_TITLE"
      :message="POST_WC_NOTICE_MESSAGE"
    />
  </div>
</template>

<style scoped>
  /* ── Week sub-tabs ──────────────────────────────────────────────────────── */
  .week-tabs {
    display: flex;
    width: 100%;
    border-bottom: 1px solid oklab(100% 0 0 / 0.1);
    margin-bottom: 1rem;
    margin-top: 0rem;
  }

  .week-tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0.4rem 0.5rem;
    font-size: 0.8125rem;
    font-weight: 400;
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

  .week-tab:hover:not(.active) {
    color: var(--color-text-primary);
  }

  .week-tab.active {
    color: var(--color-theme-300);
    border-bottom-color: var(--color-theme-400);
    font-weight: 500;
  }

  .week-label {
    font-size: 0.625rem;
    font-weight: 400;
    opacity: 0.6;
    margin-top: 0.025rem;
  }

  /* ── Empty state ────────────────────────────────────────────────────────── */
  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4rem 1rem;
  }

  .hiatus-msg {
    font-size: 1rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    text-align: center;
    max-width: 36rem;
    line-height: 1.6;
  }

  /* ── Match list ─────────────────────────────────────────────────────────── */
  .match-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 0.5rem;
  }

  /* ── Day section ────────────────────────────────────────────────────────── */
  .day-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  /* ── Day heading (collapsible button) ───────────────────────────────────── */
  .day-heading {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    width: 100%;
    background: none;
    border: none;
    border-bottom: 1px solid oklab(100% 0 0 / 0.1);
    padding: 0 0 0.375rem 0;
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-theme-300);
    font-family: inherit;
    letter-spacing: inherit;
    cursor: pointer;
    text-align: left;
  }

  .day-heading:hover {
    color: var(--color-theme-100);
  }

  /* ── Slot section ───────────────────────────────────────────────────────── */
  .slot-section {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  /* ── Slot heading (collapsible button) ──────────────────────────────────── */
  .slot-heading {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    width: 100%;
    background: none;
    border: none;
    padding: 0;
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: white;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
  }

  .slot-heading:hover {
    color: var(--color-theme-100);
  }

  .slot-heading :deep(.ampm) {
    font-size: 0.8em;
  }

  /* ── Chevron ────────────────────────────────────────────────────────────── */
  .chevron {
    display: inline-block;
    font-size: 1.4rem;
    line-height: 1;
    font-style: normal;
    font-weight: 300;
    /* Start pointing down (rotated 90°) */
    transform: rotate(90deg);
    transition: transform 0.2s ease;
    flex-shrink: 0;
    /* Optical alignment */
    margin-top: -0.05em;
  }

  .chevron-sm {
    font-size: 1.1rem;
  }

  /* When closed, point right (0°) */
  .chevron-closed {
    transform: rotate(0deg);
  }

  /* ── Cards grid ─────────────────────────────────────────────────────────── */
  .cards-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
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
</style>
