<script setup lang="ts">
import type { Match } from '../composables/useMatches'

const props = defineProps<{
  match: Match
  showDate?: boolean   // show "Sun, May 24" header row (Today's Best / Week's Best)
  hideTime?: boolean   // hide kickoff time from centre (By Time mode — time is in slot heading)
}>()

// 🔥 shown only when both teams are among the winningest — high combined points
const isHot = computed(() => props.match.qualityScore >= 35)
const showFire = computed(() => props.match.status.code !== 'ft' && isHot.value)

const dayDateLabel = computed(() => {
  if (!props.match.date) return ''
  return new Date(props.match.date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Chicago',
  })
})
</script>

<template>
  <div class="match-card" :class="`quality-${qClass}`">

    <!-- Day + date header -->
    <div v-if="showDate" class="date-row">{{ dayDateLabel }}</div>

    <!-- Main layout: 3 cols desktop, 3 rows mobile -->
    <div class="match-row" :class="{ 'match-row-vs': match.status.code === 'ns' }">

      <!-- Col 1 / Row 1: Home team -->
      <div class="team team-home">
        <span class="team-name">{{ match.home }}</span>
        <span class="team-rec">{{ match.homeRec }}</span>
      </div>

      <!-- Col 2 / Row 2: Scores + badge (flex row) -->
      <div class="scores-row">
        <!-- Home score -->
        <div v-if="match.status.code !== 'ns'" class="score score-active score-home">
          {{ match.homeScore ?? '0' }}
        </div>

        <!-- Centre badge -->
        <div class="status-badge-wrap">
          <span v-if="match.status.code === 'ns' && !hideTime" class="status-vs">
            <span class="status-dash">—</span>
            <span class="status-label">{{ match.kickoffCT }}</span>
            <span class="status-dash">—</span>
          </span>
          <span v-else-if="match.status.code === 'ns' && hideTime" class="status-vs">
            <span class="status-dash">—</span>
            <span class="status-label">VS</span>
            <span class="status-dash">—</span>
          </span>
          <span v-else-if="match.status.code === 'live'" class="badge badge-live">
            {{ match.status.clock || 'LIVE' }}
          </span>
          <span v-else-if="match.status.code === 'ht'" class="badge badge-ht">HT</span>
          <span v-else-if="match.status.code === 'ft'" class="badge badge-ft">FT</span>
        </div>

        <!-- Away score -->
        <div v-if="match.status.code !== 'ns'" class="score score-active score-away">
          {{ match.awayScore ?? '0' }}
        </div>
      </div>

      <!-- Col 3 / Row 3: Away team -->
      <div class="team team-away">
        <span class="team-rec">{{ match.awayRec }}</span>
        <span class="team-name">{{ match.away }}</span>
      </div>
    </div>

    <!-- 🔥 Fire badge for top matchups -->
    <div v-if="showFire" class="quality-row">
      <span class="fire-badge">🔥</span>
    </div>
  </div>
</template>

<style scoped>
.match-card {
  font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
  border-radius: 0.5rem;
  border: 1px solid rgb(255 255 255 / 0.07);
  padding: 0.5rem 0.75rem;
  background: rgb(255 255 255 / 0.03);
  transition: border-color 0.15s, background 0.15s;
}
.match-card:hover {
  border-color: rgb(255 255 255 / 0.14);
  background: rgb(255 255 255 / 0.05);
}

/* Day + date header row */
.date-row {
  font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
  font-size: 0.875rem;
  font-weight: 300;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(255 255 255);
  text-align: center;
  margin-bottom: 0.3125rem;
}

/* ── Desktop: 3 columns ── */
.match-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.5rem;
}

/* scores-row: flex row, score divs grow to push badge to centre */
.scores-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}
.scores-row .score-home { flex: 1; text-align: right; }
.scores-row .score-away { flex: 1; text-align: left; }

/* ── Mobile: 3 rows ── */
@media (max-width: 530px) {
  .match-row {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto;
    row-gap: 0.1875rem;
  }

  /* Each row centred */
  .team-home,
  .team-away,
  .scores-row {
    width: 100%;
    justify-content: center;
    text-align: center;
  }

  /* Team rows: inline name + rec */
  .team-home,
  .team-away {
    display: flex;
    flex-direction: row;
    align-items: baseline;
    gap: 0.5rem;
  }
  /* Away: name before rec */
  .team-away .team-rec  { order: 2; }
  .team-away .team-name { order: 1; }

  .score-active { font-size: 1.25rem; }
  .team-name    { font-size: 0.9375rem; }

  /* status-vs: no extra padding */
  .status-vs    { gap: 0.375rem; padding-inline: 0; }
  .status-label { padding-inline: 0; }
}

/* ── Teams ── */
.team {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

/* Desktop-only alignment — scoped so mobile centre overrides don't get clobbered */
@media (min-width: 531px) {
  .team-home {
    justify-content: flex-end;
    text-align: right;
  }
  .team-away {
    justify-content: flex-start;
    text-align: left;
  }
}
.team-name {
  font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
  font-size: 1rem;
  font-weight: 300;
  letter-spacing: 0.04em;
  color: rgb(243 244 246);
}
.team-rec {
  font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
  font-size: 0.75rem;
  font-weight: 300;
  color: rgb(163 171 188);
  white-space: nowrap;
}

/* ── Scores ── */
.score {
  font-weight: 300;
  line-height: 1;
}
.score-active {
  font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
  font-size: 1.625rem;
  font-weight: 300;
  color: rgb(243 244 246);
}

/* ── Status badge ── */
.status-badge-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}
.status-vs {
  font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
  font-size: 0.875rem;
  font-weight: 300;
  letter-spacing: 0.08em;
  color: rgb(255 255 255);
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
}
.status-dash {
  opacity: 0.5;
}
.status-label {
  padding-inline: 0.75em;
}
.badge {
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
}
.badge-live {
  background: rgb(20 83 45 / 0.6);
  color: rgb(134 239 172);
  border: 1px solid rgb(134 239 172 / 0.2);
}
.badge-ht {
  background: rgb(120 53 15 / 0.6);
  color: rgb(253 186 116);
  border: 1px solid rgb(253 186 116 / 0.2);
}
.badge-ft {
  background: rgb(255 255 255 / 0.06);
  color: rgb(107 114 128);
}

/* ── Fire badge ── */
.quality-row {
  margin-top: 0.25rem;
  display: flex;
  justify-content: center;
}
.fire-badge {
  font-size: 0.875rem;
  line-height: 1;
}
</style>
