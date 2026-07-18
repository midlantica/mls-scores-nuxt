<script setup lang="ts">
  import type { H2HGame } from '~/composables/useMatchDetail'
  import { TEAM_LOGO } from '~/composables/useMyTeam'

  defineProps<{
    h2h: H2HGame[]
    loading: boolean
    homeTeam: string
    awayTeam: string
    homeAbbr: string
    awayAbbr: string
  }>()

  const emit = defineEmits<{
    'select-team': [team: string]
  }>()

  function h2hDate(dateStr: string): { weekday: string; date: string } {
    const d = new Date(dateStr)
    return {
      weekday: d.toLocaleDateString('en-US', {
        weekday: 'short',
        timeZone: 'UTC',
      }),
      date: d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }),
    }
  }

  function h2hScoreClass(myScore: string, theirScore: string): string {
    const a = parseInt(myScore)
    const b = parseInt(theirScore)
    if (isNaN(a) || isNaN(b)) return 'h2h-draw'
    if (a > b) return 'h2h-win'
    if (a < b) return 'h2h-loss'
    return 'h2h-draw'
  }

  function h2hScores(
    scoreStr: string,
    atVs: string
  ): { left: string; right: string } {
    const parts = scoreStr?.split('-') ?? []
    const gameHome = parts[0]?.trim() ?? '–'
    const gameAway = parts[1]?.trim() ?? '–'
    if (atVs === 'vs') return { left: gameHome, right: gameAway }
    return { left: gameAway, right: gameHome }
  }
</script>

<template>
  <div v-if="h2h.length" class="h2h-fixtures-wrap">
    <div class="h2h-fixtures-table">
      <div
        v-for="(game, gi) in h2h"
        :key="game.id"
        class="h2h-fx-row"
        :class="{ 'row-stripe': gi % 2 === 1 }"
      >
        <div class="h2h-fx-date">
          <span class="h2h-fx-date-weekday">{{
            h2hDate(game.date).weekday
          }}</span>
          <span class="h2h-fx-date-md">{{ h2hDate(game.date).date }}</span>
        </div>
        <div class="h2h-fx-home">
          <button
            class="h2h-fx-team-btn"
            @click.stop="
              emit('select-team', game.atVs === 'vs' ? homeTeam : awayTeam)
            "
          >
            <span
              class="h2h-fx-team h2h-fx-team-full"
              :class="{
                'h2h-fx-team-win':
                  h2hScoreClass(
                    h2hScores(game.score, game.atVs).left,
                    h2hScores(game.score, game.atVs).right
                  ) === 'h2h-win',
              }"
              >{{ game.atVs === 'vs' ? homeTeam : awayTeam }}</span
            >
            <span
              class="h2h-fx-team h2h-fx-team-abbr"
              :class="{
                'h2h-fx-team-win':
                  h2hScoreClass(
                    h2hScores(game.score, game.atVs).left,
                    h2hScores(game.score, game.atVs).right
                  ) === 'h2h-win',
              }"
              >{{ game.atVs === 'vs' ? homeAbbr : awayAbbr }}</span
            >
          </button>
          <img
            v-if="TEAM_LOGO[game.atVs === 'vs' ? homeTeam : awayTeam]"
            :src="TEAM_LOGO[game.atVs === 'vs' ? homeTeam : awayTeam]"
            :alt="game.atVs === 'vs' ? homeTeam : awayTeam"
            class="h2h-fx-logo"
          />
        </div>
        <div class="h2h-fx-center">
          <span class="h2h-fx-score">
            <span
              :class="
                h2hScoreClass(
                  h2hScores(game.score, game.atVs).left,
                  h2hScores(game.score, game.atVs).right
                )
              "
              >{{ h2hScores(game.score, game.atVs).left }}</span
            >
            <span class="h2h-fx-sep">–</span>
            <span
              :class="
                h2hScoreClass(
                  h2hScores(game.score, game.atVs).right,
                  h2hScores(game.score, game.atVs).left
                )
              "
              >{{ h2hScores(game.score, game.atVs).right }}</span
            >
          </span>
        </div>
        <div class="h2h-fx-away">
          <img
            v-if="TEAM_LOGO[game.atVs === 'vs' ? awayTeam : homeTeam]"
            :src="TEAM_LOGO[game.atVs === 'vs' ? awayTeam : homeTeam]"
            :alt="game.atVs === 'vs' ? awayTeam : homeTeam"
            class="h2h-fx-logo"
          />
          <button
            class="h2h-fx-team-btn"
            @click.stop="
              emit('select-team', game.atVs === 'vs' ? awayTeam : homeTeam)
            "
          >
            <span
              class="h2h-fx-team h2h-fx-team-full"
              :class="{
                'h2h-fx-team-win':
                  h2hScoreClass(
                    h2hScores(game.score, game.atVs).right,
                    h2hScores(game.score, game.atVs).left
                  ) === 'h2h-win',
              }"
              >{{ game.atVs === 'vs' ? awayTeam : homeTeam }}</span
            >
            <span
              class="h2h-fx-team h2h-fx-team-abbr"
              :class="{
                'h2h-fx-team-win':
                  h2hScoreClass(
                    h2hScores(game.score, game.atVs).right,
                    h2hScores(game.score, game.atVs).left
                  ) === 'h2h-win',
              }"
              >{{ game.atVs === 'vs' ? awayAbbr : homeAbbr }}</span
            >
          </button>
        </div>
      </div>
    </div>
  </div>
  <div v-else-if="loading" class="skeleton-wrap">
    <div v-for="i in 4" :key="i" class="skeleton-row" />
  </div>
  <div v-else class="no-data">No head-to-head data available</div>
</template>

<style scoped>
  .row-stripe {
    background: oklab(100% 0 0 / 0.035);
  }

  .skeleton-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem 0;
  }

  .skeleton-row {
    height: 2.25rem;
    background: oklab(100% 0 0 / 0.06);
    border-radius: 0.25rem;
    animation: skeleton-pulse 1.4s ease-in-out infinite;
  }

  @keyframes skeleton-pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }

  .h2h-fixtures-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    width: 100%;
  }

  .h2h-fixtures-table {
    display: flex;
    flex-direction: column;
  }

  .h2h-fx-row {
    display: grid;
    grid-template-columns: 1fr 4rem 1fr;
    grid-template-rows: auto auto;
    grid-template-areas:
      'date date date'
      'home center away';
    align-items: center;
    padding: 0.3rem 0;
    border-radius: 0.25rem;
  }

  @media (max-width: 599px) {
    .h2h-fx-row {
      grid-template-columns: 1fr 3.5rem 1fr;
    }
  }

  .h2h-fx-date {
    grid-area: date;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 0.3em;
    letter-spacing: 0.02em;
    white-space: nowrap;
    padding-bottom: 0.15rem;
  }

  .h2h-fx-date-weekday,
  .h2h-fx-date-md {
    font-size: var(--modal-copy-size);
    font-weight: 200;
    color: oklab(100% 0 0 / 0.85);
    letter-spacing: 0.02em;
    line-height: 1.2;
  }

  .h2h-fx-home {
    grid-area: home;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    min-width: 0;
    overflow: hidden;
    justify-content: flex-end;
    padding-right: 0.4rem;
  }

  .h2h-fx-away {
    grid-area: away;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    min-width: 0;
    overflow: hidden;
    justify-content: flex-start;
    padding-left: 0.4rem;
  }

  .h2h-fx-center {
    grid-area: center;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .h2h-fx-logo {
    width: 1rem;
    height: 1rem;
    object-fit: contain;
    flex-shrink: 0;
  }

  .h2h-fx-team {
    font-size: var(--modal-copy-size);
    font-weight: 200;
    color: oklab(100% 0 0 / 0.75);
    letter-spacing: 0.02em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }

  .h2h-fx-team-win {
    font-weight: 600;
    color: oklab(100% 0 0);
  }

  .h2h-fx-team-btn {
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    font: inherit;
    text-align: inherit;
    border-radius: 0.2rem;
    display: inline-flex;
    align-items: center;
  }

  .h2h-fx-team-btn:hover .h2h-fx-team {
    text-decoration: underline;
    text-underline-offset: 0.15em;
    text-decoration-color: oklab(100% 0 0 / 0.45);
  }

  .h2h-fx-team-btn:focus-visible {
    outline: 1px solid oklab(100% 0 0 / 0.4);
    outline-offset: 1px;
  }

  .h2h-fx-team-abbr {
    display: none;
  }

  @media (max-width: 599px) {
    .h2h-fx-team-full {
      display: none;
    }
    .h2h-fx-team-abbr {
      display: inline;
    }
  }

  .h2h-fx-score {
    font-size: var(--modal-copy-size);
    font-weight: 400;
    letter-spacing: 0.04em;
    white-space: nowrap;
    text-align: center;
    display: flex;
    align-items: center;
    gap: 0.2rem;
  }

  .h2h-fx-sep {
    color: oklab(100% 0 0 / 0.4);
    font-weight: 100;
  }

  .h2h-win {
    color: oklab(100% 0 0);
  }
  .h2h-loss {
    color: oklab(100% 0 0 / 0.45);
  }
  .h2h-draw {
    color: oklab(100% 0 0 / 0.45);
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
