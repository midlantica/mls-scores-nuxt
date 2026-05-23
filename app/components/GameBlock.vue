<script setup lang="ts">
  import type { Match } from '../composables/useScores'
  import { useTimezone } from '../composables/useTimezone'

  const props = defineProps<{
    match: Match
    showDate?: boolean // show full date instead of just time (Week's Best)
  }>()

  const emit = defineEmits<{
    'open-game-detail': [match: Match]
  }>()

  const { formatTimeHtml, iana } = useTimezone()

  const kickoffLabel = computed(() => formatTimeHtml(props.match.date))

  const dateTimeLabel = computed(() => {
    const d = new Date(props.match.date)
    const day = d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: iana.value,
    })
    const time = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: iana.value,
    })
    return { day, time }
  })

  const isLive = computed(() => props.match.status.code === 'live')
  const isHT = computed(() => props.match.status.code === 'ht')
  const isFT = computed(() => props.match.status.code === 'ft')
  const isNS = computed(() => props.match.status.code === 'ns')

  const isFire = computed(() => props.match.badge === 'fire')
  const isWild = computed(() => props.match.badge === 'wild')

  // ── Winner / loser (FT only) ──────────────────────────────────────────────
  const homeWins = computed(() => {
    if (!isFT.value) return false
    const h = parseInt(props.match.homeScore ?? '0', 10)
    const a = parseInt(props.match.awayScore ?? '0', 10)
    return h > a
  })
  const awayWins = computed(() => {
    if (!isFT.value) return false
    const h = parseInt(props.match.homeScore ?? '0', 10)
    const a = parseInt(props.match.awayScore ?? '0', 10)
    return a > h
  })

  // ── Local clock ticker ────────────────────────────────────────────────────
  // Parse "MM:SS" → total seconds, tick every second, display as "MM:SS"
  // Resets whenever the prop clock changes (i.e. after each API refresh).
  // Runs freely past 90:00 into stoppage/extra time. Won't tick during HT.
  const localClock = ref<string | null>(null)
  let clockBase = 0 // total seconds at last prop update
  let clockTickedAt = 0 // Date.now() when we last synced from the prop
  let clockTimer: ReturnType<typeof setInterval> | null = null

  function parseClock(clock: string): number {
    const [m = '0', s = '0'] = clock.split(':')
    return parseInt(m, 10) * 60 + parseInt(s, 10)
  }

  function formatClock(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  function startClockTicker() {
    stopClockTicker()
    if (!isLive.value || !props.match.status.clock) return
    clockBase = parseClock(props.match.status.clock)
    clockTickedAt = Date.now()
    localClock.value = props.match.status.clock

    clockTimer = setInterval(() => {
      if (!isLive.value) {
        stopClockTicker()
        return
      }
      const elapsed = Math.floor((Date.now() - clockTickedAt) / 1000)
      localClock.value = formatClock(clockBase + elapsed)
    }, 1000)
  }

  function stopClockTicker() {
    if (clockTimer) {
      clearInterval(clockTimer)
      clockTimer = null
    }
  }

  // Re-sync whenever the API clock prop changes
  watch(
    () => props.match.status.clock,
    (newClock) => {
      if (isLive.value && newClock) {
        startClockTicker()
      } else {
        stopClockTicker()
        localClock.value = null
      }
    }
  )

  // Also react to status code changes (e.g. going live or ending)
  watch(isLive, (live) => {
    if (live && props.match.status.clock) {
      startClockTicker()
    } else {
      stopClockTicker()
      localClock.value = null
    }
  })

  onMounted(() => {
    if (isLive.value && props.match.status.clock) startClockTicker()
  })

  onUnmounted(stopClockTicker)

  // The clock label shown in the badge: prefer local ticker, fall back to prop
  const displayClock = computed(
    () => localClock.value ?? props.match.status.clock ?? 'LIVE'
  )

  // ── Goal flash animation ──────────────────────────────────────────────────
  const justScored = ref(false)
  let flashTimer: ReturnType<typeof setTimeout> | null = null

  watch(
    () => `${props.match.homeScore}-${props.match.awayScore}`,
    (newVal, oldVal) => {
      // Only trigger during live/HT matches, and skip the initial render
      if (!oldVal || !isLive.value) return
      justScored.value = true
      if (flashTimer) clearTimeout(flashTimer)
      flashTimer = setTimeout(() => {
        justScored.value = false
      }, 425) // animation duration
    }
  )

  onUnmounted(() => {
    if (flashTimer) clearTimeout(flashTimer)
  })
</script>

<template>
  <div
    class="game-block"
    :class="{
      'game-block-live': isLive || isHT,
      'game-block-fire': isFire,
      'game-block-wild': isWild,
      'game-block-goal': justScored,
      'game-block-home-wins': homeWins,
      'game-block-away-wins': awayWins,
    }"
    role="button"
    tabindex="0"
    @click="emit('open-game-detail', match)"
    @keydown.enter.space.prevent="emit('open-game-detail', match)"
  >
    <!-- Badge indicator -->
    <span v-if="isFire" class="fire-badge" aria-label="Top match">🔥</span>
    <span v-else-if="isWild" class="fire-badge" aria-label="Wild card">🎲</span>

    <!-- Home team row -->
    <div class="team-row team-row-home">
      <div class="team-left">
        <span class="logo-slot" aria-hidden="true">
          <img
            v-if="match.homeLogo"
            :src="match.homeLogo"
            :alt="match.home"
            class="team-logo"
          />
          <span
            v-else
            class="swatch"
            :style="{ background: match.homeColor }"
          />
        </span>
        <span class="team-name-text">{{ match.home }}</span>
        <span v-if="!isFT" class="team-rec">{{ match.homeRec }}</span>
      </div>
      <div v-if="!isNS" class="score-cell">
        <span
          class="team-score"
          :class="{
            'score-winner': homeWins,
            'score-loser': isFT && !homeWins,
          }"
          >{{ match.homeScore ?? '0' }}</span
        >
      </div>
    </div>

    <!-- Away team row -->
    <div class="team-row team-row-away">
      <div class="team-left">
        <span class="logo-slot" aria-hidden="true">
          <img
            v-if="match.awayLogo"
            :src="match.awayLogo"
            :alt="match.away"
            class="team-logo"
          />
          <span
            v-else
            class="swatch"
            :style="{ background: match.awayColor }"
          />
        </span>
        <span class="team-name-text">{{ match.away }}</span>
        <span v-if="!isFT" class="team-rec">{{ match.awayRec }}</span>
      </div>
      <div v-if="!isNS" class="score-cell">
        <span
          class="team-score"
          :class="{
            'score-winner': awayWins,
            'score-loser': isFT && !awayWins,
          }"
          >{{ match.awayScore ?? '0' }}</span
        >
      </div>
    </div>

    <!-- Right column: status / time -->
    <div class="status-col">
      <template v-if="isLive">
        <span class="badge badge-live">{{ displayClock }}</span>
        <span class="status-date">{{ dateTimeLabel.day }}</span>
      </template>
      <template v-else-if="isHT">
        <span class="badge badge-ht">HT</span>
        <span class="status-date">{{ dateTimeLabel.day }}</span>
      </template>
      <template v-else-if="isFT">
        <span class="badge badge-ft">FT</span>
        <span class="status-date">{{ dateTimeLabel.day }}</span>
      </template>
      <template v-else>
        <!-- Not started -->
        <span class="status-time" v-html="kickoffLabel" />
        <span class="status-date">{{ dateTimeLabel.day }}</span>
      </template>
    </div>
  </div>
</template>

<style scoped>
  /* Fire badge — absolutely positioned top-right corner */
  .game-block {
    position: relative; /* needed for fire-badge absolute positioning */
  }

  .fire-badge {
    position: absolute;
    top: -0.15rem;
    right: -0.15rem;
    font-size: 1rem;
    line-height: 1;
    pointer-events: none;
    user-select: none;
  }

  .game-block-fire {
    border-color: oklab(100% 0 0 / 0.12);
  }

  .game-block {
    font-family: var(--font-condensed);
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    grid-template-areas:
      'home home status'
      'away away status';
    align-items: center;
    gap: 0.3rem 0.5rem;
    padding: 0.425rem 0.5rem;
    border-radius: 0.375rem;
    background: oklab(100% 0 0 / 0.06);
    transition: border-color 0.15s;
    min-width: 0;
    cursor: pointer;
  }

  .game-block:hover {
    border-color: oklab(100% 0 0 / 0.2);
  }

  .game-block-live {
    outline: 1px solid oklab(100% 0 0 / 0.25);
    outline-offset: -1px;
  }

  /* ── Goal scored: shimmy-shake — rotation + expand only, no color change ── */
  @keyframes goal-flash {
    0% {
      transform: rotate(0deg) scale(1);
    }
    10% {
      transform: rotate(-4deg) scale(1.04);
    }
    25% {
      transform: rotate(3.5deg) scale(1.05);
    }
    40% {
      transform: rotate(-2.5deg) scale(1.03);
    }
    55% {
      transform: rotate(2deg) scale(1.02);
    }
    70% {
      transform: rotate(-1deg) scale(1.01);
    }
    85% {
      transform: rotate(0.5deg) scale(1);
    }
    100% {
      transform: rotate(0deg) scale(1);
    }
  }

  .game-block-goal {
    animation: goal-flash 0.425s ease-out forwards;
    /* Override the global transition so the flash keyframes aren't smoothed */
    transition: none !important;
  }

  /* Team rows */
  .team-row {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    min-width: 0;
    padding: 0.125rem 0;
    position: relative; /* needed for winner-caret ::after positioning */
  }

  @media (max-width: 530px) {
    .team-row {
      padding: 0rem 0;
    }
  }

  .team-row-home {
    grid-area: home;
  }
  .team-row-away {
    grid-area: away;
  }

  .team-left {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    flex: 1;
    min-width: 0;
  }

  /* Logo slot — fixed size, holds either an <img> or a color swatch */
  .logo-slot {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.3em;
    height: auto;
    flex-shrink: 0;
  }

  .team-logo {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .swatch {
    display: inline-block;
    width: 0.875em;
    height: 0.875em;
    border-radius: 0.125em;
    flex-shrink: 0;
  }

  .team-name-text {
    font-size: var(--modal-copy-size);
    font-weight: 200;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    min-width: 0;
  }

  .team-rec {
    font-size: 1rem;
    font-weight: 300;
    color: oklab(80% 0 0);
    white-space: nowrap;
    flex-shrink: 0;
  }

  /* Score cell wraps the number + optional winner caret side-by-side */
  .score-cell {
    display: flex;
    align-items: center;
    gap: 0.2rem;
    position: relative;
    right: 3px;
  }

  .team-score {
    font-size: 0.9375rem;
    font-weight: 100;
    color: var(--color-text-primary);
    line-height: 1;
    min-width: 1ch;
    text-align: right;
  }

  /* FT winner: hard white */
  .score-winner {
    color: #ffffff;
    font-weight: 400;
  }

  /* FT loser: muted — distinct from winner but not invisible */
  .score-loser {
    color: oklab(65% 0 0);
  }

  /* Green winner caret ◀ */
  .winner-caret {
    font-size: 0.6rem;
    line-height: 1;
    color: #4ade80; /* green-400 */
    flex-shrink: 0;
  }

  /* Status column — fixed width so cards always line up down the page */
  .status-col {
    grid-area: status;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.075rem;
    padding-left: 0.5rem;
    border-left: 1px solid oklab(100% 0 0 / 0.07);
    /* width: 3.5rem; */
    flex-shrink: 0;
    text-align: center;
    position: relative;
  }

  /* Winner caret — CSS triangle on the right edge of the winning team row,
     sitting right on the vertical border between scores and status column.
     Using ::after on the team-row means it's always perfectly centered on
     that row regardless of row height. */
  .game-block-home-wins .team-row-home::after,
  .game-block-away-wins .team-row-away::after {
    content: '';
    position: absolute;
    right: calc(-0.1rem - 6px);
    top: 52%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-top: 6px solid transparent;
    border-bottom: 6px solid transparent;
    border-right: 5px solid #aaaaaa; /* pointing left */
    pointer-events: none;
  }

  .status-time {
    font-size: 1rem;
    font-weight: 100;
    color: var(--color-text-primary);
    white-space: nowrap;
    line-height: 1;
    letter-spacing: 0.03rem;
  }

  .status-time :deep(.ampm) {
    font-size: 1em;
  }

  .status-date {
    font-size: 1rem;
    font-weight: 100;
    color: oklab(90% 0 0);
    white-space: nowrap;
    letter-spacing: 0.03rem;
  }

  /* Shared badge base */
  .badge {
    font-size: 1rem;
    font-weight: 200;
    letter-spacing: 0.12em;
    color: white;
    padding: 0.15rem 0.35rem;
    border-radius: 0.2rem;
    white-space: nowrap;
    text-align: center;
    background: oklab(28% -0.01 -0.02 / 0.85);
  }

  /* Live clock: fill the full column width so the clock never shifts the layout.
     Tabular nums keep each digit the same width as it ticks. */
  .badge-live {
    width: 100%;
    font-variant-numeric: tabular-nums;
    font-feature-settings: 'tnum';
    box-sizing: border-box;
  }

  /* HT / FT: stay compact (roughly square), centered in the column */
  .badge-ht,
  .badge-ft {
    width: auto;
  }
</style>
