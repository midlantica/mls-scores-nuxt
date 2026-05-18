<script setup lang="ts">
  import { useScores } from '~/composables/useScores'
  import { useMatchView } from '~/composables/useMatchView'

  const emit = defineEmits<{ 'select-team': [team: string] }>()

  const { weeks, activeTab, selectTab } = useScores()

  const allWeekMatches = computed(() => weeks[activeTab.value].matches)

  // Hiatus message comes from the server (scores API) — it's set when the
  // current week falls inside a known hiatus window (WC break, off-season).
  const hiatusMsg = computed(() => weeks[activeTab.value].hiatus ?? null)

  // Banner: shown on "next" tab when today is inside a hiatus window.
  // Uses the "this week" hiatus flag OR a direct date-range check as fallback
  // (in case "this week" data hasn't loaded yet when the user lands on Next).
  const HIATUS_MSG =
    "The MLS season is on hiatus for the 2026 FIFA World Cup — but we'll be back soon! MLS play resumes July 22, 2026."

  const hiatusBannerMsg = computed((): string | null => {
    if (activeTab.value !== 'next') return null
    if (weeks.this.hiatus) return HIATUS_MSG
    // Show banner on Next tab any time before MLS resumes (Jul 22 2026),
    // covering both the lead-up to the break and the break itself.
    const today = new Date()
    const wcResume = new Date('2026-07-22')
    const wcAnnounced = new Date('2026-05-18') // start showing from today
    if (today >= wcAnnounced && today < wcResume) return HIATUS_MSG
    return null
  })
  const bannerDismissed = ref(false)

  const { weekByDayGroups } = useMatchView(allWeekMatches, activeTab)

  // ── Collapse state ────────────────────────────────────────────────────────
  // Track open/closed state for each day and each time slot.
  // Keys: day key (e.g. "2026-05-13") and slot label (e.g. "6:30PM").
  // Past days and past time slots are auto-collapsed.
  const collapsedDays = ref<Set<string>>(new Set())
  const collapsedSlots = ref<Set<string>>(new Set())

  function toggleDay(key: string) {
    if (collapsedDays.value.has(key)) {
      collapsedDays.value.delete(key)
    } else {
      collapsedDays.value.add(key)
    }
    // trigger reactivity
    collapsedDays.value = new Set(collapsedDays.value)
  }

  function toggleSlot(key: string) {
    if (collapsedSlots.value.has(key)) {
      collapsedSlots.value.delete(key)
    } else {
      collapsedSlots.value.add(key)
    }
    collapsedSlots.value = new Set(collapsedSlots.value)
  }

  // ── Auto-collapse past days/slots ─────────────────────────────────────────
  // Only applies to "This Week" — last/next week show everything open.
  // Rule: past days collapse, but the LAST day with games stays fully open
  // until midnight (so the final game of the week is always visible until 12:01am).
  function buildInitialCollapse() {
    if (activeTab.value !== 'this') {
      collapsedDays.value = new Set()
      collapsedSlots.value = new Set()
      return
    }

    const now = Date.now()
    const todayKey = new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/Chicago',
    })
    const days = new Set<string>()
    const slots = new Set<string>()

    // Find the last day that has any matches this week
    const allDayKeys = weekByDayGroups.value.map(({ day }) => day.key)
    const lastMatchDayKey =
      allDayKeys.length > 0 ? allDayKeys[allDayKeys.length - 1] : null

    for (const { day, slots: daySlots } of weekByDayGroups.value) {
      if (day.key < todayKey) {
        // Past day — collapse it, UNLESS it's the last match day of the week
        // and it's still today (i.e. today IS the last match day — keep open until midnight)
        if (day.key !== lastMatchDayKey) {
          days.add(day.key)
        }
      } else if (day.key === todayKey) {
        // Today — only collapse slots where kickoff was more than 2h ago,
        // BUT only if this is NOT the last match day of the week.
        // On the last match day, keep everything open until midnight.
        if (day.key !== lastMatchDayKey) {
          for (const [slotLabel, slotMatches] of daySlots) {
            const slotTime = slotMatches[0]?.kickoffSlot ?? 0
            if (slotTime > 0 && slotTime + 2 * 60 * 60 * 1000 < now) {
              slots.add(day.key + slotLabel)
            }
          }
        }
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
  <div
    v-if="hiatusBannerMsg && !bannerDismissed"
    class="hiatus-banner"
    role="status"
  >
    <span class="hiatus-banner-icon">⚽</span>
    <span class="hiatus-banner-text">{{ hiatusBannerMsg }}</span>
    <button
      class="hiatus-banner-close"
      aria-label="Dismiss"
      @click="bannerDismissed = true"
    >
      ✕
    </button>
  </div>

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
              @select-team="emit('select-team', $event)"
            />
          </div>
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped>
  /* ── Week sub-tabs ──────────────────────────────────────────────────────── */
  .week-tabs {
    display: flex;
    width: 100%;
    border-left: 1px solid oklab(100% 0 0 / 0.1);
    border-bottom: 1px solid oklab(100% 0 0 / 0.1);
    border-right: 1px solid oklab(100% 0 0 / 0.1);
    border-radius: 0 0 0.5rem 0.5rem;
    overflow: hidden;
    margin-bottom: 1rem;
  }

  .week-tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0.4rem 0.5rem;
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

  /* ── Hiatus banner ──────────────────────────────────────────────────────── */
  .hiatus-banner {
    display: flex;
    align-items: flex-start;
    gap: 0.625rem;
    padding: 0.75rem 1rem;
    margin: 1.3rem 0;
    border-radius: 0.5rem;
    background: oklab(22% 0.01 -0.02);
    border: 1px solid oklab(100% 0 0 / 0.1);
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    line-height: 1.5;
  }

  .hiatus-banner-icon {
    flex-shrink: 0;
    font-size: 1rem;
    margin-top: 0.05em;
  }

  .hiatus-banner-text {
    flex: 1;
  }

  .hiatus-banner-close {
    flex-shrink: 0;
    background: none;
    border: none;
    color: var(--color-text-secondary);
    font-size: 0.75rem;
    cursor: pointer;
    padding: 0.1rem 0.25rem;
    border-radius: 0.25rem;
    opacity: 0.6;
    transition: opacity 0.15s;
    margin-top: 0.1em;
  }

  .hiatus-banner-close:hover {
    opacity: 1;
  }

  /* ── Match list ─────────────────────────────────────────────────────────── */
  .match-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
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
