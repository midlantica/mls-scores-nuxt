<script setup lang="ts">
import type { Match } from '../composables/useScores'
import { useTimezone } from '../composables/useTimezone'

const props = defineProps<{
  match: Match
  showDate?: boolean   // show "Sun, May 24" header row (Today's Best / Week's Best)
  hideTime?: boolean   // hide kickoff time from centre (By Time mode — time is in slot heading)
}>()

const { formatTime, iana } = useTimezone()

// 🔥 shown only when both teams are genuinely elite — top ~15% of matchups
const isHot = computed(() => props.match.qualityScore >= 50)
const showFire = computed(() => props.match.status.code !== 'ft' && isHot.value)

// Quality tier class for styling
const qClass = computed(() => {
  const q = props.match.qualityScore
  if (q >= 50) return 'high'
  if (q >= 35) return 'mid'
  return 'low'
})

// Kickoff time formatted in the user's selected timezone
const kickoffLabel = computed(() => formatTime(props.match.date))

const dayDateLabel = computed(() => {
  if (!props.match.date) return ''
  return new Date(props.match.date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: iana.value,
  })
})
</script>

<template>
  <div class="match-card" :class="`quality-${qClass}`">

    <!-- Day + date header -->
    <div v-if="showDate" class="date-row">{{ dayDateLabel }}</div>

    <!-- Main layout: 3 cols desktop, 2 rows mobile -->
    <div class="match-row" :class="{ 'match-row-vs': match.status.code === 'ns' }">

      <!-- Col 1 / Row 1: Home team -->
      <div class="team team-home">
        <span class="team-swatch" :style="{ background: match.homeColor }" aria-hidden="true" />
        <span class="team-name">{{ match.home }}</span>
        <span class="team-rec">{{ match.homeRec }}</span>
        <!-- Mobile-only inline score -->
        <span v-if="match.status.code !== 'ns'" class="team-score-inline">{{ match.homeScore ?? '0' }}</span>
      </div>

      <!-- Col 2 / Row 2 (desktop only): Scores + badge (flex row) -->
      <div class="scores-row">
        <!-- Home score -->
        <div v-if="match.status.code !== 'ns'" class="score score-active score-home">
          {{ match.homeScore ?? '0' }}
        </div>

        <!-- Centre badge -->
        <div class="status-badge-wrap">
          <span v-if="match.status.code === 'ns' && !hideTime" class="status-vs">
            <span class="status-dash">—</span>
            <span class="status-label">{{ kickoffLabel }}</span>
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

      <!-- Col 3 / Row 2: Away team -->
      <div class="team team-away">
        <span class="team-swatch" :style="{ background: match.awayColor }" aria-hidden="true" />
        <span class="team-name">{{ match.away }}</span>
        <span class="team-rec">{{ match.awayRec }}</span>
        <!-- Mobile-only inline score -->
        <span v-if="match.status.code !== 'ns'" class="team-score-inline">{{ match.awayScore ?? '0' }}</span>
      </div>
    </div>

    <!-- Mobile-only: status badge row for live/ht (not ft, not ns) -->
    <div v-if="match.status.code === 'live' || match.status.code === 'ht'" class="mobile-status-row">
      <span v-if="match.status.code === 'live'" class="badge badge-live">
        {{ match.status.clock || 'LIVE' }}
      </span>
      <span v-else-if="match.status.code === 'ht'" class="badge badge-ht">HT</span>
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
  position: relative;
}
.match-card:hover {
  border-color: rgb(255 255 255 / 0.14);
  background: rgb(255 255 255 / 0.05);
}

/* Day + date header row */
.date-row {
  font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-tropical-mint-600);
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

/* Mobile-only inline score — hidden on desktop */
.team-score-inline { display: none; }

/* Mobile-only status row — hidden on desktop */
.mobile-status-row { display: none; }

/* ── Mobile: 2 rows (home + away), Google-style ── */
@media (max-width: 530px) {
  .match-row {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  /* Hide the desktop scores-row entirely when there are scores to show inline */
  .match-row:not(.match-row-vs) .scores-row {
    display: none;
  }

  /* For pre-match (ns): hide team inline scores (none rendered), show scores-row as VS/time */
  .match-row-vs .scores-row {
    display: flex;
    justify-content: center;
    order: 2; /* between home and away */
  }
  .match-row-vs .team-home { order: 1; }
  .match-row-vs .team-away { order: 3; }

  /* Each team row: swatch + name + rec flush left, score pinned right */
  .team-home,
  .team-away {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    justify-content: center;
  }

  /* Score pushed to far right */
  .team-score-inline {
    display: block;
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-size: 0.9375rem;
    font-weight: 600;
    color: rgb(243 244 246);
    line-height: 1;
  }

  .team-name { font-size: 0.9375rem; }

  /* status-vs: no extra padding */
  .status-vs    { gap: 0.375rem; padding-inline: 0; }
  .status-label { padding-inline: 0; }

  /* Live/HT badge shown below the two team rows */
  .mobile-status-row {
    display: flex;
    justify-content: center;
    margin-top: 0.25rem;
  }
}

/* ── Teams ── */
.team {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

/* Desktop-only alignment */
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
.team-swatch {
  display: inline-block;
  width: 1em;
  height: 1em;
  border-radius: 0.15em;
  flex-shrink: 0;
  align-self: center;
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
  font-size: 1rem;
  font-weight: 600;
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
  position: absolute;
  top: -0.2em;
  right: -0.2em;
  line-height: 1;
}
.fire-badge {
  font-size: 1rem;
  line-height: 1;
}
</style>
