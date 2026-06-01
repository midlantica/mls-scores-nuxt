<script setup lang="ts">
  import { TEAM_LOGO } from '~/composables/useMyTeam'
  import { useTimezone } from '~/composables/useTimezone'
  import { POST_WC_NOTICE_TITLE, POST_WC_NOTICE_MESSAGE } from '~/constants/mls'

  interface FixtureEvent {
    id: string
    date: string
    homeTeam: string
    awayTeam: string
    homeScore: string | null
    awayScore: string | null
    statusCode: 'ns' | 'ft' | 'live' | 'ht'
    statusClock?: string
  }
  interface FixtureMonth {
    key: string
    label: string
    events: FixtureEvent[]
  }

  defineProps<{
    loading: boolean
    error: string | null
    fixturesByMonth: FixtureMonth[]
    displayTeam: string
  }>()

  const emit = defineEmits<{
    'select-team': [team: string]
  }>()

  const { iana } = useTimezone()

  const FIXTURE_TEAM_NAME: Record<string, string> = {
    'Atlanta United FC': 'Atlanta Utd',
    'Austin FC': 'Austin FC',
    'CF Montréal': 'CF Mtl',
    'Charlotte FC': 'Charlotte',
    'Chicago Fire FC': 'Chicago',
    'Colorado Rapids': 'Colorado',
    'Columbus Crew': 'Columbus',
    'D.C. United': 'DC United',
    'FC Cincinnati': 'Cincinnati',
    'FC Dallas': 'FC Dallas',
    'Houston Dynamo FC': 'Houston',
    'Inter Miami CF': 'Inter Miami',
    'LA Galaxy': 'LA Galaxy',
    LAFC: 'LAFC',
    'Minnesota United FC': 'Minnesota',
    'Nashville SC': 'Nashville',
    'New England Revolution': 'New England',
    'New York City FC': 'NYCFC',
    'Orlando City SC': 'Orlando',
    'Philadelphia Union': 'Philadelphia',
    'Portland Timbers': 'Portland',
    'Real Salt Lake': 'Real SL',
    'Red Bull New York': 'NY Red Bulls',
    'San Diego FC': 'San Diego',
    'San Jose Earthquakes': 'San Jose',
    'Seattle Sounders FC': 'Seattle',
    'Sporting Kansas City': 'Sporting KC',
    'St. Louis City SC': 'St. Louis',
    'St. Louis CITY SC': 'St. Louis',
    'Toronto FC': 'Toronto',
    'Vancouver Whitecaps': 'Vancouver',
  }

  function fixtureTeamName(name: string): string {
    return FIXTURE_TEAM_NAME[name] ?? name
  }

  function fixtureDate(iso: string): { weekday: string; date: string } {
    const d = new Date(iso)
    return {
      weekday: d.toLocaleDateString('en-US', {
        weekday: 'short',
        timeZone: iana.value,
      }),
      date: d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: iana.value,
      }),
    }
  }

  function fixtureTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: iana.value,
    })
  }
</script>

<template>
  <div v-if="loading" class="tab-loading">
    <div v-for="i in 6" :key="i" class="skel-row" />
  </div>
  <div v-else-if="error" class="tab-empty">{{ error }}</div>
  <div v-else-if="fixturesByMonth.length" class="fixtures-wrap">
    <template v-for="(month, mi) in fixturesByMonth" :key="month.key">
      <HiatusBanner
        v-if="
          mi > 0 &&
          (fixturesByMonth[mi - 1]?.key ?? '') < '2026-07' &&
          month.key >= '2026-07'
        "
      />
      <div class="fixtures-month">
        <div class="fixtures-month-label">{{ month.label }}</div>
        <div class="fixtures-table">
          <div
            v-for="(evt, ei) in month.events"
            :key="evt.id"
            class="fixtures-row"
            :class="{ 'row-stripe': ei % 2 === 1 }"
          >
            <div class="fx-date">
              <span class="fx-date-weekday">{{
                fixtureDate(evt.date).weekday
              }}</span>
              <span class="fx-date-md">{{ fixtureDate(evt.date).date }}</span>
            </div>
            <button
              class="fx-home fx-team-btn"
              @click.stop="emit('select-team', evt.homeTeam)"
            >
              <img
                v-if="TEAM_LOGO[evt.homeTeam]"
                :src="TEAM_LOGO[evt.homeTeam]"
                :alt="evt.homeTeam"
                class="fx-logo"
              />
              <span
                class="fx-team"
                :class="{ 'fx-team-bold': evt.homeTeam === displayTeam }"
                >{{ fixtureTeamName(evt.homeTeam) }}</span
              >
            </button>
            <div class="fx-center">
              <template
                v-if="
                  evt.statusCode === 'ft' ||
                  evt.statusCode === 'live' ||
                  evt.statusCode === 'ht'
                "
              >
                <span class="fx-score"
                  >{{ evt.homeScore }} – {{ evt.awayScore }}</span
                >
                <span
                  v-if="evt.statusCode === 'live' || evt.statusCode === 'ht'"
                  class="fx-badge fx-badge-live"
                  >{{
                    evt.statusCode === 'ht' ? 'HT' : evt.statusClock || 'LIVE'
                  }}</span
                >
              </template>
              <template v-else>
                <span class="fx-time">{{ fixtureTime(evt.date) }}</span>
              </template>
            </div>
            <button
              class="fx-away fx-team-btn"
              @click.stop="emit('select-team', evt.awayTeam)"
            >
              <img
                v-if="TEAM_LOGO[evt.awayTeam]"
                :src="TEAM_LOGO[evt.awayTeam]"
                :alt="evt.awayTeam"
                class="fx-logo"
              />
              <span
                class="fx-team"
                :class="{ 'fx-team-bold': evt.awayTeam === displayTeam }"
                >{{ fixtureTeamName(evt.awayTeam) }}</span
              >
            </button>
          </div>
        </div>
      </div>
    </template>

    <HiatusBanner
      :show-icon="false"
      :title="POST_WC_NOTICE_TITLE"
      :message="POST_WC_NOTICE_MESSAGE"
    />
  </div>

  <div v-else class="tab-empty">No fixtures available.</div>
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

  .fixtures-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .fixtures-month {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .fixtures-month-label {
    font-family: var(--font-condensed);
    font-size: 0.9rem;
    font-weight: 400;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    text-align: center;
    color: color-mix(in oklab, var(--color-theme-300, #93c5fd) 70%, white 30%);
    padding-bottom: 0.3rem;
    border-bottom: 1px solid
      color-mix(in oklab, var(--color-theme-primary, #60a5fa) 30%, transparent);
  }

  .fixtures-table {
    display: flex;
    flex-direction: column;
  }

  .fixtures-row {
    display: grid;
    grid-template-columns: 1fr 4.5rem 1fr;
    grid-template-rows: auto auto;
    grid-template-areas:
      'date date date'
      'home center away';
    align-items: center;
    padding: 0.3rem 0;
    border-radius: 0.25rem;
  }

  .fx-date {
    grid-area: date;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 0.3em;
    white-space: nowrap;
    padding-bottom: 0.15rem;
  }

  .fx-date-weekday {
    font-size: var(--modal-copy-size);
    font-weight: 200;
    color: oklab(100% 0 0 / 0.4);
    letter-spacing: 0.02em;
    line-height: 1.2;
  }

  .fx-date-md {
    font-size: var(--modal-copy-size);
    font-weight: 200;
    color: oklab(100% 0 0 / 0.55);
    letter-spacing: 0.02em;
    line-height: 1.2;
  }

  .fx-home {
    grid-area: home;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    min-width: 0;
    overflow: hidden;
    justify-content: flex-end;
    padding-right: 0.4rem;
  }

  .fx-away {
    grid-area: away;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    min-width: 0;
    overflow: hidden;
    justify-content: flex-start;
    padding-left: 0.4rem;
  }

  .fx-team-btn {
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
    gap: 0.3rem;
    min-width: 0;
    overflow: hidden;
  }
  .fx-team-btn:hover .fx-team {
    text-decoration: underline;
    text-underline-offset: 0.15em;
    text-decoration-color: oklab(100% 0 0 / 0.45);
  }
  .fx-team-btn:focus-visible {
    outline: 1px solid oklab(100% 0 0 / 0.4);
    outline-offset: 1px;
  }

  .fx-center {
    grid-area: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.1rem;
    flex-shrink: 0;
  }

  .fx-logo {
    width: 1rem;
    height: 1rem;
    object-fit: contain;
    flex-shrink: 0;
  }

  .fx-team {
    font-size: var(--modal-copy-size);
    font-weight: 200;
    color: oklab(100% 0 0 / 0.75);
    letter-spacing: 0.02em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }

  .fx-team-bold {
    font-weight: 400;
    color: oklab(100% 0 0);
  }

  .fx-score {
    font-size: var(--modal-copy-size);
    font-weight: 400;
    color: oklab(100% 0 0);
    letter-spacing: 0.04em;
    white-space: nowrap;
    text-align: center;
  }

  .fx-time {
    font-size: var(--modal-copy-size);
    font-weight: 200;
    color: oklab(100% 0 0 / 0.55);
    letter-spacing: 0.03em;
    white-space: nowrap;
    text-align: center;
  }

  .fx-badge {
    font-size: 0.5rem;
    font-weight: 400;
    letter-spacing: 0.08em;
    padding: 0.1rem 0.25rem;
    border-radius: 0.2rem;
    flex-shrink: 0;
  }

  .fx-badge-live {
    background: oklab(34.8% -0.072 0.028 / 0.7);
    color: #4ade80;
  }
</style>
