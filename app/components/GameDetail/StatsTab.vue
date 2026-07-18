<script setup lang="ts">
  import type { MatchDetail } from '~/composables/useMatchDetail'

  const props = defineProps<{
    detail: MatchDetail
    homeLogo: string | null
    awayLogo: string | null
    homeTeam: string
    awayTeam: string
    homeAbbr: string
    awayAbbr: string
    homeTeamAbbrev: string
    awayTeamAbbrev: string
  }>()

  const STAT_LABELS: Record<string, string> = {
    possessionPct: 'Possession',
    totalShots: 'Shots',
    shotsOnTarget: 'On Target',
    saves: 'Saves',
    wonCorners: 'Corners',
    foulsCommitted: 'Fouls',
    yellowCards: 'Yellow Cards',
    redCards: 'Red Cards',
    offsides: 'Offsides',
    accuratePasses: 'Accurate Passes',
    passPct: 'Pass Accuracy',
    effectiveTackles: 'Tackles Won',
    interceptions: 'Interceptions',
    blockedShots: 'Blocked Shots',
  }

  const FEATURED_STATS = [
    'possessionPct',
    'totalShots',
    'shotsOnTarget',
    'saves',
    'wonCorners',
    'foulsCommitted',
    'yellowCards',
    'offsides',
  ]

  function getStat(teamId: string, statName: string): string {
    const ts = props.detail.teamStats.find((t) => t.teamId === teamId)
    return ts?.stats.find((s) => s.name === statName)?.displayValue ?? '–'
  }

  function getStatDisplay(teamId: string, statName: string): string {
    const val = getStat(teamId, statName)
    if (statName === 'possessionPct' && val !== '–') return val + '%'
    return val
  }
</script>

<template>
  <div v-if="detail.teamStats.length >= 2" class="stats-table">
    <div class="stats-head">
      <div class="stats-th stats-th-home">
        <img
          v-if="homeLogo"
          :src="homeLogo"
          :alt="homeTeam"
          class="head-logo"
        />
        <span class="name-short">{{ homeAbbr }}</span>
        <span class="name-abbrev">{{ homeTeamAbbrev }}</span>
      </div>
      <div class="stats-th-center"></div>
      <div class="stats-th stats-th-away">
        <img
          v-if="awayLogo"
          :src="awayLogo"
          :alt="awayTeam"
          class="head-logo"
        />
        <span class="name-short">{{ awayAbbr }}</span>
        <span class="name-abbrev">{{ awayTeamAbbrev }}</span>
      </div>
    </div>
    <template v-for="(statName, idx) in FEATURED_STATS" :key="statName">
      <div class="stats-row" :class="{ 'row-stripe': idx % 2 === 1 }">
        <div class="stats-val-cell stats-val-home">
          <span
            :class="[
              'stats-num',
              parseFloat(getStat(detail.teamStats[0]?.teamId ?? '', statName)) >
              parseFloat(getStat(detail.teamStats[1]?.teamId ?? '', statName))
                ? 'stats-num-hi'
                : '',
            ]"
            >{{
              getStatDisplay(detail.teamStats[0]?.teamId ?? '', statName)
            }}</span
          >
        </div>
        <div class="stats-label-col">
          {{ STAT_LABELS[statName] ?? statName }}
        </div>
        <div class="stats-val-cell stats-val-away">
          <span
            :class="[
              'stats-num',
              parseFloat(getStat(detail.teamStats[1]?.teamId ?? '', statName)) >
              parseFloat(getStat(detail.teamStats[0]?.teamId ?? '', statName))
                ? 'stats-num-hi'
                : '',
            ]"
            >{{
              getStatDisplay(detail.teamStats[1]?.teamId ?? '', statName)
            }}</span
          >
        </div>
      </div>
    </template>
  </div>
  <div v-else class="no-data">Stats not yet available</div>
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

  .stats-table {
    display: flex;
    flex-direction: column;
  }

  .stats-head {
    display: grid;
    grid-template-columns: 1fr 7rem 1fr;
    gap: 0;
    align-items: center;
    padding: 0.2rem 0 0.4rem;
    border-bottom: 1px solid oklab(100% 0 0 / 0.1);
    margin-bottom: 0.1rem;
  }

  .stats-th {
    font-size: var(--modal-copy-size);
    font-weight: 400;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: oklab(100% 0 0 / 0.85);
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .stats-th-home {
    justify-content: flex-end;
  }

  .stats-th-away {
    justify-content: flex-start;
  }

  .stats-row {
    display: grid;
    grid-template-columns: 1fr 7rem 1fr;
    gap: 0;
    align-items: center;
    padding: 0.2rem 0;
    min-height: 2rem;
  }

  .stats-val-cell {
    display: flex;
    align-items: center;
  }

  .stats-val-home {
    justify-content: flex-end;
  }

  .stats-val-away {
    justify-content: flex-start;
  }

  .stats-num {
    font-size: var(--modal-copy-size);
    font-weight: 300;
    color: oklab(100% 0 0);
    letter-spacing: 0.02em;
    min-width: 2.5ch;
    text-align: center;
  }

  .stats-label-col {
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
