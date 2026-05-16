<script setup lang="ts">
  import type { Match } from '../composables/useScores'
  import { useTimezone } from '../composables/useTimezone'

  const props = defineProps<{
    match: Match
    showDate?: boolean // show full date instead of just time (Week's Best)
  }>()

  const emit = defineEmits<{ 'select-team': [team: string] }>()

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

  // 🔥 fire threshold: qualityScore ≥ 50
  const isFire = computed(() => props.match.qualityScore >= 50)
</script>

<template>
  <div
    class="game-block"
    :class="{ 'game-block-live': isLive, 'game-block-fire': isFire }"
  >
    <!-- Fire indicator -->
    <span v-if="isFire" class="fire-badge" aria-label="Top match">🔥</span>

    <!-- Home team row -->
    <div class="team-row">
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
        <button class="team-name-btn" @click="emit('select-team', match.home)">
          {{ match.home }}
        </button>
        <span v-if="!isFT" class="team-rec">{{ match.homeRec }}</span>
      </div>
      <span v-if="!isNS" class="team-score">{{ match.homeScore ?? '0' }}</span>
    </div>

    <!-- Away team row -->
    <div class="team-row">
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
        <button class="team-name-btn" @click="emit('select-team', match.away)">
          {{ match.away }}
        </button>
        <span v-if="!isFT" class="team-rec">{{ match.awayRec }}</span>
      </div>
      <span v-if="!isNS" class="team-score">{{ match.awayScore ?? '0' }}</span>
    </div>

    <!-- Right column: status / time -->
    <div class="status-col">
      <template v-if="isLive">
        <span class="badge badge-live">{{ match.status.clock || 'LIVE' }}</span>
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
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    grid-template-areas:
      'home status'
      'away status';
    align-items: center;
    gap: 0.3rem 0.5rem;
    padding: 0.625rem 0.75rem;
    border-radius: 0.375rem;
    background: oklab(100% 0 0 / 0.06);
    transition:
      border-color 0.15s,
      background 0.15s;
    min-width: 0;
  }

  .game-block:hover {
    border-color: oklab(100% 0 0 / 0.2);
    background: oklab(100% 0 0 / 0.13);
  }

  .game-block-live {
    border-color: oklab(95% 0 0 / 0.6);
    box-shadow: 0 0 6px 1px oklab(95% 0 0 / 0.15);
  }

  /* Team rows */
  .team-row {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    min-width: 0;
    padding: 0.125rem 0;
  }

  .team-row:first-child {
    grid-area: home;
  }
  .team-row:nth-child(2) {
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

  .team-name-btn {
    font-size: 0.8125rem;
    font-weight: 300;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    min-width: 0;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    font-family: inherit;
    letter-spacing: inherit;
    cursor: pointer;
    text-align: left;
  }
  .team-name-btn:hover {
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }

  .team-rec {
    font-size: 0.75rem;
    font-weight: 300;
    color: oklab(80% 0 0);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .team-score {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--color-text-primary);
    line-height: 1;
    min-width: 1ch;
    text-align: right;
  }

  /* Status column */
  .status-col {
    grid-area: status;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    padding-left: 0.5rem;
    border-left: 1px solid oklab(100% 0 0 / 0.07);
    min-width: 3.5rem;
    text-align: center;
  }

  .status-time {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-text-primary);
    white-space: nowrap;
    line-height: 1.2;
  }

  .status-time :deep(.ampm) {
    font-size: 0.85em;
  }

  .status-date {
    font-size: 0.75rem;
    font-weight: 400;
    color: oklab(90% 0 0);
    white-space: nowrap;
  }

  .badge {
    font-size: calc(0.75rem * 1.15);
    font-weight: 200;
    letter-spacing: 0.12em;
    color: white;
    padding: 0.15rem 0.45rem 0.15rem 0.6rem;
    border-radius: 0.2rem;
    white-space: nowrap;
    min-width: 3ch;
    text-align: center;
  }

  .badge-live {
    background: oklab(28% -0.01 -0.02 / 0.85);
    color: white;
  }

  .badge-ht {
    background: oklab(28% -0.01 -0.02 / 0.85);
    color: white;
  }

  .badge-ft {
    background: oklab(28% -0.01 -0.02 / 0.85);
    color: white;
  }
</style>
