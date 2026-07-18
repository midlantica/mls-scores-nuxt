<script setup lang="ts">
  import type { TeamRoster, RosterPlayer } from '~/composables/useMatchDetail'

  defineProps<{
    homeLogo: string | null
    awayLogo: string | null
    homeTeam: string
    awayTeam: string
    homeAbbr: string
    awayAbbr: string
    homeTeamAbbrev: string
    awayTeamAbbrev: string
    homeRoster: TeamRoster | null
    awayRoster: TeamRoster | null
    statusCode: string
  }>()

  const POS_ORDER: Record<string, number> = {
    G: 0,
    GK: 0,
    D: 1,
    CB: 1,
    LB: 1,
    RB: 1,
    WB: 1,
    M: 2,
    CM: 2,
    DM: 2,
    AM: 2,
    F: 3,
    FW: 3,
    LW: 3,
    RW: 3,
    ST: 3,
  }

  function sortedPlayers(roster: TeamRoster | null): RosterPlayer[] {
    if (!roster) return []
    return [...roster.players].sort((a, b) => {
      const ao = POS_ORDER[a.position] ?? 9
      const bo = POS_ORDER[b.position] ?? 9
      if (ao !== bo) return ao - bo
      return (
        (a.jersey ? parseInt(a.jersey) : 99) -
        (b.jersey ? parseInt(b.jersey) : 99)
      )
    })
  }
</script>

<template>
  <div class="squads-table">
    <div class="squads-head">
      <div class="squads-th squads-th-home">
        <img
          v-if="homeLogo"
          :src="homeLogo"
          :alt="homeTeam"
          class="squads-th-logo"
        />
        <span>
          <span class="name-short">{{ homeAbbr }}</span>
          <span class="name-abbrev">{{ homeTeamAbbrev }}</span>
        </span>
      </div>
      <div class="squads-th-center"></div>
      <div class="squads-th squads-th-away">
        <img
          v-if="awayLogo"
          :src="awayLogo"
          :alt="awayTeam"
          class="squads-th-logo"
        />
        <span>
          <span class="name-short">{{ awayAbbr }}</span>
          <span class="name-abbrev">{{ awayTeamAbbrev }}</span>
        </span>
      </div>
    </div>
    <template
      v-for="(_, rowIdx) in Array(
        Math.max(
          sortedPlayers(homeRoster).length,
          sortedPlayers(awayRoster).length
        )
      )"
      :key="rowIdx"
    >
      <div class="squads-row" :class="{ 'row-stripe': rowIdx % 2 === 1 }">
        <div class="squads-player squads-player-home">
          <span
            v-if="
              statusCode !== 'ns' && sortedPlayers(homeRoster)[rowIdx]?.subbedIn
            "
            class="sub-icon sub-in"
          />
          <span
            v-if="
              statusCode !== 'ns' &&
              sortedPlayers(homeRoster)[rowIdx]?.subbedOut
            "
            class="sub-icon sub-out"
          />
          <span v-if="sortedPlayers(homeRoster)[rowIdx]" class="squad-jersey">
            {{ sortedPlayers(homeRoster)[rowIdx]?.jersey ?? '–' }}
          </span>
          <span v-if="sortedPlayers(homeRoster)[rowIdx]" class="squad-pname">
            {{ sortedPlayers(homeRoster)[rowIdx]?.displayName ?? '' }}
          </span>
        </div>
        <div class="squads-pos-col">
          <span
            v-if="
              sortedPlayers(homeRoster)[rowIdx] ||
              sortedPlayers(awayRoster)[rowIdx]
            "
            class="squad-pos"
          >
            {{
              sortedPlayers(homeRoster)[rowIdx]?.position ??
              sortedPlayers(awayRoster)[rowIdx]?.position ??
              ''
            }}
          </span>
        </div>
        <div class="squads-player squads-player-away">
          <span v-if="sortedPlayers(awayRoster)[rowIdx]" class="squad-pname">
            {{ sortedPlayers(awayRoster)[rowIdx]?.displayName ?? '' }}
          </span>
          <span v-if="sortedPlayers(awayRoster)[rowIdx]" class="squad-jersey">
            {{ sortedPlayers(awayRoster)[rowIdx]?.jersey ?? '–' }}
          </span>
          <span
            v-if="
              statusCode !== 'ns' && sortedPlayers(awayRoster)[rowIdx]?.subbedIn
            "
            class="sub-icon sub-in"
          />
          <span
            v-if="
              statusCode !== 'ns' &&
              sortedPlayers(awayRoster)[rowIdx]?.subbedOut
            "
            class="sub-icon sub-out"
          />
        </div>
      </div>
    </template>
    <div
      v-if="
        !sortedPlayers(homeRoster).length && !sortedPlayers(awayRoster).length
      "
      class="no-data"
    >
      Lineups not yet available
    </div>
  </div>
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

  .squads-table {
    display: flex;
    flex-direction: column;
  }

  .squads-head {
    display: grid;
    grid-template-columns: 1fr 3.5rem 1fr;
    align-items: center;
    padding: 0.2rem 0 0.4rem;
    border-bottom: 1px solid oklab(100% 0 0 / 0.1);
    margin-bottom: 0.1rem;
  }

  .squads-th {
    font-size: var(--modal-copy-size);
    font-weight: 400;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: oklab(100% 0 0 / 0.85);
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .squads-th-home {
    justify-content: flex-end;
  }

  .squads-th-away {
    justify-content: flex-start;
  }

  .squads-th-logo {
    width: 1.375rem;
    height: 1.375rem;
    object-fit: contain;
    flex-shrink: 0;
  }

  .squads-row {
    display: grid;
    grid-template-columns: 1fr 3.5rem 1fr;
    align-items: center;
    padding: 0.2rem 0;
    min-height: 2rem;
  }

  .squads-player {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    min-width: 0;
  }

  .squads-player-home {
    flex-direction: row;
    justify-content: flex-end;
  }

  .squads-player-away {
    flex-direction: row;
    justify-content: flex-start;
  }

  .squad-jersey {
    font-size: var(--modal-copy-size);
    font-weight: 300;
    color: oklab(100% 0 0 / 0.5);
    letter-spacing: 0.04em;
    flex-shrink: 0;
    min-width: 1.5ch;
    text-align: center;
  }

  .squad-pname {
    font-size: var(--modal-copy-size);
    font-weight: 100;
    color: oklab(100% 0 0);
    letter-spacing: 0.04em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }

  .squads-pos-col {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .squad-pos {
    font-size: 0.575rem;
    font-weight: 400;
    letter-spacing: 0.09em;
    color: oklab(100% 0 0 / 0.6);
    text-align: center;
    background: oklab(100% 0 0 / 0.06);
    border-radius: 0.15rem;
    padding: 0.1rem 0.25rem;
  }

  .sub-icon {
    display: inline-block;
    flex-shrink: 0;
    width: 0;
    height: 0;
    vertical-align: middle;
    position: relative;
    top: -1px;
  }

  .sub-in {
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-bottom: 8px solid oklab(0.86 -0.27 0.15);
  }

  .sub-out {
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 8px solid oklab(0.6 0.21 0.11);
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
