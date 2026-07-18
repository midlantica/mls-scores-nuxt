<script setup lang="ts">
  interface RosterPlayer {
    id: string
    displayName: string
    jersey: string
    position: string
    nationality: string
  }
  interface FallbackPlayer {
    id: string
    displayName: string
    jersey: string
    position: string
  }

  defineProps<{
    loading: boolean
    fallbackLoading: boolean
    error: string | null
    sortedRoster: RosterPlayer[]
    usingFallbackSquad: boolean
    sortedFallbackSquad: FallbackPlayer[]
    fallbackSquadDateLabel: string
  }>()
</script>

<template>
  <div v-if="loading || fallbackLoading" class="tab-loading">
    <div v-for="i in 8" :key="i" class="skel-row" />
  </div>
  <div v-else-if="error" class="tab-empty">{{ error }}</div>
  <div v-else-if="sortedRoster.length" class="squads-wrap squads-wrap--roster">
    <div class="squads-table">
      <div class="squads-head">
        <div class="squads-th-num">#</div>
        <div class="squads-th-pos">Pos</div>
        <div class="squads-th-name">Player</div>
        <div class="squads-th-nat">Nat</div>
      </div>
      <div
        v-for="(player, pi) in sortedRoster"
        :key="player.id"
        class="squads-row"
        :class="{ 'row-stripe': pi % 2 === 1 }"
      >
        <div class="squads-num">{{ player.jersey }}</div>
        <div class="squads-pos">
          <span class="pos-badge">{{ player.position }}</span>
        </div>
        <div class="squads-name">{{ player.displayName }}</div>
        <div class="squads-nat">{{ player.nationality }}</div>
      </div>
    </div>
  </div>
  <div v-else-if="usingFallbackSquad" class="squads-fallback-wrap">
    <div class="squads-wrap">
      <div class="squads-table">
        <div class="squads-head">
          <div class="squads-th-num">#</div>
          <div class="squads-th-pos">Pos</div>
          <div class="squads-th-name">Player</div>
        </div>
        <div
          v-for="(player, pi) in sortedFallbackSquad"
          :key="player.id"
          class="squads-row"
          :class="{ 'row-stripe': pi % 2 === 1 }"
        >
          <div class="squads-num">{{ player.jersey }}</div>
          <div class="squads-pos">
            <span class="pos-badge">{{ player.position }}</span>
          </div>
          <div class="squads-name">{{ player.displayName }}</div>
        </div>
      </div>
    </div>
    <p class="squads-fallback-note">
      *last lineup from {{ fallbackSquadDateLabel }}
    </p>
  </div>
  <div v-else class="tab-empty">Lineup not yet available.</div>
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

  .squads-table {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .squads-head {
    display: grid;
    grid-template-columns: 2.5rem 4rem 1fr;
    align-items: baseline;
    padding: 0.25rem 0.4rem 0.4rem 3rem;
    border-bottom: 1px solid oklab(100% 0 0 / 0.1);
    gap: 0.75rem;
  }

  .squads-th-num,
  .squads-th-pos,
  .squads-th-name,
  .squads-th-nat {
    font-size: 0.6875rem;
    font-weight: 400;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: oklab(100% 0 0 / 0.45);
  }

  .squads-th-num {
    text-align: right;
  }

  .squads-row {
    display: grid;
    grid-template-columns: 2.5rem 4rem 1fr;
    align-items: center;
    padding: 0.3rem 0.4rem 0.3rem 3rem;
    border-radius: 0.25rem;
    gap: 0.75rem;
    min-height: 2rem;
  }

  .squads-wrap--roster .squads-head,
  .squads-wrap--roster .squads-row {
    grid-template-columns: 2.5rem 4rem 1fr 2.5rem;
  }

  .squads-num {
    font-size: var(--modal-copy-size);
    font-weight: 300;
    color: oklab(100% 0 0 / 0.5);
    text-align: right;
  }

  .squads-pos {
    display: flex;
    align-items: center;
  }

  .pos-badge {
    font-size: 0.575rem;
    font-weight: 400;
    letter-spacing: 0.09em;
    color: oklab(100% 0 0 / 0.7);
    background: oklab(100% 0 0 / 0.08);
    border-radius: 0.2rem;
    padding: 0.1rem 0.3rem;
  }

  .squads-name {
    font-size: var(--modal-copy-size);
    font-weight: 200;
    color: oklab(100% 0 0);
    letter-spacing: 0.03em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .squads-nat {
    font-size: var(--modal-copy-size);
    font-weight: 200;
    color: oklab(100% 0 0 / 0.5);
    letter-spacing: 0.04em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .squads-fallback-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .squads-fallback-note {
    font-size: 0.6875rem;
    font-weight: 300;
    font-style: italic;
    color: oklab(100% 0 0 / 0.35);
    letter-spacing: 0.02em;
    margin: 0;
    padding: 0.25rem 0 0 3rem;
    text-align: left;
  }

  @media (max-width: 540px) {
    .squads-wrap,
    .squads-fallback-wrap {
      margin-left: -0.85rem;
      margin-right: -0.85rem;
    }

    .squads-head {
      padding: 0.25rem 0.85rem 0.4rem 0.85rem;
      grid-template-columns: 1.75rem 2.75rem 1fr;
      gap: 0.35rem;
    }

    .squads-row {
      padding: 0.3rem 0.85rem;
      grid-template-columns: 1.75rem 2.75rem 1fr;
      gap: 0.35rem;
      border-radius: 0;
    }

    .squads-wrap--roster .squads-head,
    .squads-wrap--roster .squads-row {
      grid-template-columns: 1.75rem 2.75rem 1fr 1.75rem;
    }

    .squads-fallback-note {
      padding: 0.25rem 0.85rem 0;
    }
  }
</style>
