<script setup lang="ts">
  import type { TeamLeaders } from '~/composables/useMatchDetail'

  defineProps<{
    homeLogo: string | null
    awayLogo: string | null
    homeTeam: string
    awayTeam: string
    homeAbbr: string
    awayAbbr: string
    homeTeamAbbrev: string
    awayTeamAbbrev: string
    homeLeaders: TeamLeaders | null
    awayLeaders: TeamLeaders | null
  }>()

  const LEADER_LABELS: Record<string, string> = {
    totalShots: 'Shots',
    accuratePasses: 'Passes',
    saves: 'Saves',
    goals: 'Goals',
    assists: 'Assists',
  }
</script>

<template>
  <div v-if="homeLeaders || awayLeaders" class="leaders-table">
    <div class="leaders-head">
      <div class="leaders-th leaders-th-home">
        <img
          v-if="homeLogo"
          :src="homeLogo"
          :alt="homeTeam"
          class="head-logo"
        />
        <span>
          <span class="name-short">{{ homeAbbr }}</span>
          <span class="name-abbrev">{{ homeTeamAbbrev }}</span>
        </span>
      </div>
      <div class="leaders-th-center"></div>
      <div class="leaders-th leaders-th-away">
        <img
          v-if="awayLogo"
          :src="awayLogo"
          :alt="awayTeam"
          class="head-logo"
        />
        <span>
          <span class="name-short">{{ awayAbbr }}</span>
          <span class="name-abbrev">{{ awayTeamAbbrev }}</span>
        </span>
      </div>
    </div>
    <template
      v-for="(cat, idx) in (
        homeLeaders?.categories ??
        awayLeaders?.categories ??
        []
      ).filter((c) => LEADER_LABELS[c.name])"
      :key="cat.name"
    >
      <div class="leaders-row" :class="{ 'row-stripe': idx % 2 === 1 }">
        <div class="leaders-name leaders-name-home">
          {{
            homeLeaders?.categories.find((c) => c.name === cat.name)?.athlete ??
            '–'
          }}
        </div>
        <div class="leaders-val leaders-val-home">
          {{
            homeLeaders?.categories.find((c) => c.name === cat.name)?.value ??
            '–'
          }}
        </div>
        <div class="leaders-cat-col">
          {{ LEADER_LABELS[cat.name] ?? cat.shortDisplayName }}
        </div>
        <div class="leaders-val leaders-val-away">
          {{
            awayLeaders?.categories.find((c) => c.name === cat.name)?.value ??
            '–'
          }}
        </div>
        <div class="leaders-name leaders-name-away">
          {{
            awayLeaders?.categories.find((c) => c.name === cat.name)?.athlete ??
            '–'
          }}
        </div>
      </div>
    </template>
  </div>
  <div v-else class="no-data">Leaders not yet available</div>
</template>

<style scoped>
  .row-stripe {
    background: oklab(100% 0 0 / 0.035);
  }

  .name-abbrev {
    display: none;
  }

  @media (max-width: 425px) {
    .name-short {
      display: none;
    }
    .name-abbrev {
      display: inline;
    }
  }

  .head-logo {
    width: 1.375rem;
    height: 1.375rem;
    object-fit: contain;
    flex-shrink: 0;
  }

  .leaders-table {
    display: flex;
    flex-direction: column;
  }

  .leaders-head {
    display: grid;
    grid-template-columns: 1fr 3.5rem 1fr;
    align-items: center;
    padding: 0.2rem 0 0.4rem;
    border-bottom: 1px solid oklab(100% 0 0 / 0.1);
    margin-bottom: 0.1rem;
  }

  @media (min-width: 600px) {
    .leaders-head {
      grid-template-columns: 1fr 6.4rem 1fr;
    }
  }

  .leaders-th {
    font-size: var(--modal-copy-size);
    font-weight: 400;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: oklab(100% 0 0 / 0.85);
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .leaders-th-home {
    justify-content: flex-end;
  }

  .leaders-th-away {
    justify-content: flex-start;
  }

  .leaders-row {
    display: grid;
    grid-template-columns: 1fr 2.5rem 5rem 2.5rem 1fr;
    align-items: center;
    padding: 0.2rem 0;
    min-height: 2rem;
  }

  @media (max-width: 420px) {
    .leaders-row {
      grid-template-columns: 1fr 2rem 3.5rem 2rem 1fr;
    }
  }

  .leaders-name {
    font-size: var(--modal-copy-size);
    font-weight: 100;
    color: oklab(100% 0 0);
    letter-spacing: 0.04em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }

  .leaders-name-home {
    text-align: right;
  }

  .leaders-name-away {
    text-align: left;
  }

  .leaders-val {
    font-size: var(--modal-copy-size);
    font-weight: 300;
    color: oklab(100% 0 0);
    letter-spacing: 0.02em;
    text-align: center;
  }

  .leaders-cat-col {
    font-size: var(--modal-copy-size);
    font-weight: 100;
    color: oklab(100% 0 0 / 1);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    text-align: center;
    padding: 0 0.25rem;
  }

  .no-data {
    font-size: var(--modal-copy-size);
    font-weight: 100;
    color: oklab(100% 0 0);
    text-align: center;
    padding: 2rem 0;
    letter-spacing: 0.06em;
  }
</style>
