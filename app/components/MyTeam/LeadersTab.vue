<script setup lang="ts">
  interface StatLeader {
    athleteId: string
    displayName: string
    jersey: string
    value: number
    displayValue: string
  }
  interface StatCategory {
    name: string
    displayName: string
    leaders: StatLeader[]
  }

  defineProps<{
    loading: boolean
    error: string | null
    sortedLeaders: StatCategory[]
  }>()

  const STAT_DISPLAY: Record<string, string> = {
    goals: 'Goals',
    assists: 'Assists',
    saves: 'Saves',
    shotsOnTarget: 'Shots on Target',
    totalShots: 'Total Shots',
    accuratePasses: 'Accurate Passes',
    yellowCards: 'Yellow Cards',
    redCards: 'Red Cards',
  }
</script>

<template>
  <div v-if="loading" class="tab-loading">
    <div v-for="i in 6" :key="i" class="skel-row" />
  </div>
  <div v-else-if="error" class="tab-empty">{{ error }}</div>
  <div v-else-if="sortedLeaders.length" class="leaders-wrap">
    <div
      v-for="(cat, ci) in sortedLeaders"
      :key="cat.name"
      class="leaders-category"
    >
      <div class="leaders-cat-title">
        {{ STAT_DISPLAY[cat.name] ?? cat.displayName }}
      </div>
      <div class="leaders-table">
        <div
          v-for="(leader, li) in cat.leaders"
          :key="leader.athleteId"
          class="leaders-row"
          :class="{ 'row-stripe': li % 2 === 1 }"
        >
          <span class="leaders-rank">{{ li + 1 }}</span>
          <span class="leaders-name">{{ leader.displayName }}</span>
          <span class="leaders-jersey">#{{ leader.jersey }}</span>
          <span class="leaders-value">{{ leader.displayValue }}</span>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="tab-empty">Leaders not yet available.</div>
</template>

<style scoped>
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

  .row-stripe {
    background: oklab(100% 0 0 / 0.03);
  }

  .leaders-wrap {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .leaders-category {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .leaders-cat-title {
    font-family: var(--font-condensed);
    font-size: 0.6875rem;
    font-weight: 400;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: color-mix(
      in oklab,
      var(--color-theme-300, oklab(100% 0 0)) 80%,
      white 20%
    );
    padding-bottom: 0.25rem;
    border-bottom: 1px solid oklab(100% 0 0 / 0.08);
  }

  .leaders-table {
    display: flex;
    flex-direction: column;
  }

  .leaders-row {
    display: grid;
    grid-template-columns: 1.5rem 1fr 2.5rem 2rem;
    align-items: center;
    padding: 0.3rem 0.4rem;
    border-radius: 0.25rem;
    gap: 0.5rem;
    min-height: 2rem;
  }

  .leaders-rank {
    font-size: var(--modal-copy-size);
    font-weight: 400;
    color: oklab(100% 0 0 / 0.35);
    text-align: center;
  }

  .leaders-name {
    font-size: var(--modal-copy-size);
    font-weight: 200;
    color: oklab(100% 0 0);
    letter-spacing: 0.03em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .leaders-jersey {
    font-size: var(--modal-copy-size);
    font-weight: 300;
    color: oklab(100% 0 0 / 0.4);
    text-align: right;
    letter-spacing: 0.04em;
  }

  .leaders-value {
    font-size: var(--modal-copy-size);
    font-weight: 400;
    color: oklab(100% 0 0);
    text-align: right;
    letter-spacing: 0.02em;
  }
</style>
