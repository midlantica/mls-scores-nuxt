<script setup lang="ts">
  import type { Match } from '~/composables/useScores'

  defineProps<{
    scheduleLoading: boolean
    scheduleError: string | null
    moreUpcomingMatches: Match[]
    nextGame: Match | null
    pastMatches: Match[]
    hasFixtures: boolean
    totalGames: number
    gamesPlayed: number
    gamesRemaining: number
    seasonEndDate: string | null
  }>()

  const emit = defineEmits<{
    'open-game-detail': [match: Match]
    'navigate-fixtures': []
  }>()

  const showMoreGames = ref(false)
</script>

<template>
  <div v-if="scheduleLoading" class="tab-loading">
    <div v-for="i in 4" :key="i" class="skel-row" />
  </div>
  <div v-else-if="scheduleError" class="tab-empty">{{ scheduleError }}</div>
  <template v-else>
    <div class="schedule-body">
      <p v-if="totalGames > 0" class="season-progress">
        {{ gamesPlayed }} of {{ totalGames }} games played ·
        {{ gamesRemaining }} remaining<template v-if="seasonEndDate">
          · Season ends {{ seasonEndDate }}</template
        >
      </p>

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

      <button
        v-if="moreUpcomingMatches.length"
        class="show-future-btn"
        @click="showMoreGames = !showMoreGames"
      >
        {{ showMoreGames ? 'Hide More Games' : 'Show More Games' }}
      </button>

      <div v-if="nextGame" class="schedule-section">
        <div class="schedule-list schedule-list--single">
          <GameBlock
            :match="nextGame"
            @open-game-detail="emit('open-game-detail', $event)"
          />
        </div>
      </div>

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

      <p v-if="!pastMatches.length && !nextGame" class="tab-empty">
        No schedule data available.
      </p>

      <div v-if="hasFixtures" class="schedule-fixtures-link-row">
        <button
          class="schedule-fixtures-link"
          @click="emit('navigate-fixtures')"
        >
          Show all 2026 fixtures
        </button>
      </div>
    </div>
  </template>
</template>

<style scoped>
  .schedule-body {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .season-progress {
    font-family: var(--font-condensed);
    font-size: 0.7rem;
    font-weight: 400;
    letter-spacing: 0.04em;
    color: oklab(100% 0 0 / 0.5);
    text-align: center;
    padding-bottom: 0.25rem;
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

  .tab-loading {
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

  .tab-empty {
    font-size: var(--modal-copy-size);
    color: var(--color-text-secondary);
    text-align: center;
    padding: 1.5rem 0;
  }

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
</style>
