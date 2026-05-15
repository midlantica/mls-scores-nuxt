<script setup lang="ts">
  import type { ConferenceStandings } from '~/composables/useStandings'
  import { getTeamColor } from '~/composables/useTeamColors'

  defineProps<{ conference: ConferenceStandings }>()
</script>

<template>
  <div class="standings-wrap">
    <h3 class="conf-title">{{ conference.name }}</h3>
    <div class="table-scroll">
      <table class="standings-table">
        <thead>
          <tr>
            <th class="col-rank">#</th>
            <th class="col-team">Team</th>
            <th class="col-num" title="Games Played">GP</th>
            <th class="col-num col-pts" title="Points">Pts</th>
            <th class="col-num" title="Goals For">GF</th>
            <th class="col-num" title="Goals Against">GA</th>
            <th class="col-num" title="Goal Difference">GD</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="entry in conference.entries"
            :key="entry.team"
            class="entry-row"
          >
            <td class="col-rank">
              <span class="rank-num">{{ entry.rank }}</span>
              <span
                v-if="entry.rankChange > 0"
                class="rank-change rank-up"
                :title="`Up ${entry.rankChange}`"
                >▲</span
              >
              <span
                v-else-if="entry.rankChange < 0"
                class="rank-change rank-down"
                :title="`Down ${Math.abs(entry.rankChange)}`"
                >▼</span
              >
            </td>
            <td class="col-team">
              <span
                class="team-swatch"
                :style="{ background: getTeamColor(entry.team) }"
                aria-hidden="true"
              />
              {{ entry.team }}
              <span v-if="entry.overall" class="overall-rec">{{
                entry.overall
              }}</span>
            </td>
            <td class="col-num">{{ entry.gp }}</td>
            <td class="col-num col-pts">{{ entry.pts }}</td>
            <td class="col-num">{{ entry.gf }}</td>
            <td class="col-num">{{ entry.ga }}</td>
            <td
              class="col-num"
              :class="entry.gd > 0 ? 'gd-pos' : entry.gd < 0 ? 'gd-neg' : ''"
            >
              {{ entry.gd > 0 ? '+' : '' }}{{ entry.gd }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
  .standings-wrap {
    min-width: 0;
  }

  .conf-title {
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-tropical-mint-600);
    margin-bottom: 0.5rem;
    text-align: center;
  }

  .table-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .standings-table {
    width: 100%;
    border-collapse: collapse;
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-size: 0.8125rem;
    font-weight: 300;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }

  .standings-table thead tr {
    border-bottom: 1px solid oklab(100% 0 0 / 0.08);
  }

  .standings-table th {
    font-size: 0.625rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-text-secondary);
    padding: 0.2rem 0;
    text-align: right;
  }

  .standings-table th.col-team,
  .standings-table th.col-rank {
    text-align: left;
  }

  .entry-row {
    border-bottom: 1px solid oklab(100% 0 0 / 0.04);
    transition: background 0.1s;
  }
  .entry-row:hover {
    background: oklab(100% 0 0 / 0.04);
  }
  .entry-row:last-child {
    border-bottom: none;
  }

  .standings-table td {
    padding: 0.2rem 0;
    color: var(--color-text-secondary);
    text-align: right;
  }

  .col-rank {
    text-align: left !important;
    color: var(--color-text-secondary) !important;
    font-size: 0.6875rem;
    white-space: nowrap;
  }

  .rank-num {
    display: inline-block;
    min-width: 1rem;
  }

  .rank-change {
    font-size: 0.5rem;
    margin-left: 0.125rem;
    vertical-align: middle;
  }
  .rank-up {
    color: var(--color-text-accent);
  }
  .rank-down {
    color: oklab(68.5% 0.13 0.048);
  }

  .col-team {
    text-align: left !important;
    color: var(--color-text-primary) !important;
    font-weight: 500;
    min-width: 10rem;
  }

  .team-swatch {
    display: inline-block;
    width: 1em;
    height: 1em;
    border-radius: 0.15em;
    vertical-align: middle;
    margin-right: 0.375rem;
    flex-shrink: 0;
    position: relative;
    top: -0.05em;
  }

  .overall-rec {
    font-size: 0.85rem;
    font-weight: 300;
    color: var(--color-text-secondary);
    margin-left: 0.375rem;
  }

  .col-num {
    width: 2.25rem;
  }

  .col-pts {
    font-weight: 700;
    color: var(--color-text-primary) !important;
  }

  .col-ppg {
    color: var(--color-text-secondary) !important;
    font-size: 0.75rem;
  }

  .gd-pos {
    color: var(--color-text-accent) !important;
  }
  .gd-neg {
    color: oklab(68.5% 0.13 0.048) !important;
  }
</style>
