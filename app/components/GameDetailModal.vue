<script setup lang="ts">
  import type { Match } from '../composables/useScores'
  import {
    useMatchDetail,
    normaliseOdds,
    fractionalToMoneyline,
  } from '../composables/useMatchDetail'
  import { TEAM_LOGO, TEAM_VENUE, TEAM_ESPN_ID } from '../composables/useMyTeam'
  import { useTimezone } from '../composables/useTimezone'

  // ── Club history / founding year ─────────────────────────────────────────────
  const TEAM_FOUNDED: Record<string, number> = {
    'Atlanta United FC': 2017,
    'Austin FC': 2021,
    'CF Montréal': 1993,
    'Charlotte FC': 2022,
    'Chicago Fire FC': 1997,
    'Colorado Rapids': 1996,
    'Columbus Crew': 1996,
    'D.C. United': 1996,
    'FC Cincinnati': 2019,
    'FC Dallas': 1996,
    'Houston Dynamo FC': 2006,
    'Inter Miami CF': 2020,
    'LA Galaxy': 1996,
    LAFC: 2018,
    'Minnesota United FC': 2017,
    'Nashville SC': 2020,
    'New England Revolution': 1996,
    'New York City FC': 2015,
    'Orlando City SC': 2015,
    'Philadelphia Union': 2010,
    'Portland Timbers': 2011,
    'Real Salt Lake': 2005,
    'Red Bull New York': 1996,
    'San Diego FC': 2025,
    'San Jose Earthquakes': 1996,
    'Seattle Sounders FC': 2009,
    'Sporting Kansas City': 1996,
    'St. Louis City SC': 2023,
    'Toronto FC': 2007,
    'Vancouver Whitecaps': 2011,
  }

  // ── Brief club blurbs ─────────────────────────────────────────────────────────
  const TEAM_BIO: Record<string, string> = {
    'Atlanta United FC':
      'Founded in 2017, Atlanta United set MLS attendance records in their debut season and won the MLS Cup in 2018 — the fastest expansion team to win the title.',
    'Austin FC':
      'Austin FC joined MLS in 2021 as the first major professional sports team in Austin, TX. They play at Q2 Stadium, one of the most soccer-specific venues in the league.',
    'CF Montréal':
      'One of the original MLS clubs (1993), CF Montréal has been a consistent Eastern Conference contender and a pipeline for Canadian national team talent.',
    'Charlotte FC':
      'Charlotte FC launched in 2022 and immediately broke MLS single-game attendance records at Bank of America Stadium, home of the NFL Panthers.',
    'Chicago Fire FC':
      'A founding MLS club (1997), the Fire won the MLS Cup in their inaugural season. They returned to Soldier Field in 2020 after years at suburban Toyota Park.',
    'Colorado Rapids':
      'One of the ten charter MLS clubs (1996), the Rapids won the MLS Cup in 2010. They play at altitude in Commerce City, CO — a genuine home-field advantage.',
    'Columbus Crew':
      'The Crew are the oldest MLS franchise (1996) and the first to build a soccer-specific stadium. They won MLS Cups in 2008 and 2020.',
    'D.C. United':
      'D.C. United are one of the most decorated clubs in MLS history, winning four MLS Cups (1996–99). They moved to Audi Field in 2018.',
    'FC Cincinnati':
      'FC Cincinnati joined MLS in 2019 after setting USL attendance records. They opened TQL Stadium in 2021, widely regarded as one of the best soccer venues in North America.',
    'FC Dallas':
      'FC Dallas (formerly Dallas Burn) is a founding MLS club. They are known for their youth academy, one of the most productive in the league.',
    'Houston Dynamo FC':
      'The Dynamo won back-to-back MLS Cups in 2006 and 2007 in their first two seasons. They play at Shell Energy Stadium in downtown Houston.',
    'Inter Miami CF':
      'Co-owned by David Beckham, Inter Miami launched in 2020. The arrival of Lionel Messi in 2023 transformed the club into a global phenomenon.',
    'LA Galaxy':
      'The Galaxy are the most decorated club in MLS history with five MLS Cups. They have hosted global stars including Beckham, Gerrard, Keane, and Ibrahimović.',
    LAFC: "LAFC launched in 2018 and immediately became a force, winning the Supporters' Shield in 2019 and the MLS Cup in 2022 on penalties against the Galaxy.",
    'Minnesota United FC':
      'Minnesota United joined MLS in 2017 and opened Allianz Field in 2019 — a stunning 19,400-seat soccer-specific stadium in St. Paul.',
    'Nashville SC':
      'Nashville SC joined MLS in 2020 and opened GEODIS Park in 2022 — the largest soccer-specific stadium in the United States.',
    'New England Revolution':
      'A founding MLS club, the Revolution have appeared in five MLS Cup finals. They set the all-time MLS points record in 2021 (73 pts) under coach Bruce Arena.',
    'New York City FC':
      'NYCFC launched in 2015 as a City Football Group club. They won their first MLS Cup in 2021 on penalties and play home games at Yankee Stadium.',
    'Orlando City SC':
      'Orlando City joined MLS in 2015 and opened Inter&Co Stadium in 2017. They reached their first MLS Cup final in 2022.',
    'Philadelphia Union':
      "The Union joined MLS in 2010 and have become one of the league's most analytically progressive clubs, winning the Supporters' Shield in 2020 and 2022.",
    'Portland Timbers':
      'The Timbers joined MLS in 2011 with one of the most passionate supporter cultures in North American soccer. They won the MLS Cup in 2015.',
    'Real Salt Lake':
      'RSL won the MLS Cup in 2009 as a lower-seeded team, one of the biggest upsets in league history. They play at America First Field in Sandy, UT.',
    'Red Bull New York':
      "One of the original MLS clubs (1996), the Red Bulls have won four Supporters' Shields but are still seeking their first MLS Cup.",
    'San Diego FC':
      'San Diego FC is the newest MLS franchise, launching in 2025. They play at Snapdragon Stadium and are backed by the Sycuan Tribe and the Elliott family.',
    'San Jose Earthquakes':
      'The Earthquakes are a founding MLS club and won MLS Cups in 2001 and 2003. They play at PayPal Park, a soccer-specific stadium opened in 2008.',
    'Seattle Sounders FC':
      "The Sounders joined MLS in 2009 and immediately set attendance records. They have won four Supporters' Shields and MLS Cups in 2016 and 2019.",
    'Sporting Kansas City':
      "Sporting KC (formerly Wizards) won the MLS Cup in 2000 and 2013. They opened Children's Mercy Park in 2011, a model for soccer-specific stadium design.",
    'St. Louis City SC':
      'St. Louis City SC launched in 2023 as the first MLS team from St. Louis. They won their first Western Conference title in their debut season.',
    'Toronto FC':
      'Toronto FC joined MLS in 2007 as the first Canadian franchise. They won the MLS Cup in 2017 with a record-breaking season, going undefeated at home.',
    'Vancouver Whitecaps':
      'The Whitecaps joined MLS in 2011 and play at BC Place. They are one of three Canadian MLS clubs and have a strong youth development tradition.',
  }

  // ── Props / emits ─────────────────────────────────────────────────────────────
  const props = defineProps<{
    open: boolean
    match: Match | null
  }>()

  const emit = defineEmits<{ close: [] }>()

  // ── Data fetching ─────────────────────────────────────────────────────────────
  const { detail, loading, error, fetchDetail, clear } = useMatchDetail()
  const { iana } = useTimezone()

  watch(
    () => props.match,
    (m) => {
      if (m && props.open) fetchDetail(m.id)
    }
  )

  watch(
    () => props.open,
    (open) => {
      if (open && props.match) {
        fetchDetail(props.match.id)
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = ''
        if (!open) clear()
      }
    }
  )

  onUnmounted(() => {
    document.body.style.overflow = ''
  })

  // ── Keyboard close ────────────────────────────────────────────────────────────
  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') emit('close')
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onUnmounted(() => window.removeEventListener('keydown', onKeydown))

  // ── Tab state ─────────────────────────────────────────────────────────────────
  type ModalTab = 'overview' | 'squad' | 'clubs'
  const activeTab = ref<ModalTab>('overview')

  watch(
    () => props.open,
    (open) => {
      if (open) activeTab.value = 'overview'
    }
  )

  // ── Derived data ──────────────────────────────────────────────────────────────
  const home = computed(() => props.match)
  const homeTeam = computed(() => props.match?.home ?? '')
  const awayTeam = computed(() => props.match?.away ?? '')

  const homeLogo = computed(
    () => TEAM_LOGO[homeTeam.value] ?? props.match?.homeLogo ?? null
  )
  const awayLogo = computed(
    () => TEAM_LOGO[awayTeam.value] ?? props.match?.awayLogo ?? null
  )

  const homeEspnId = computed(() => TEAM_ESPN_ID[homeTeam.value] ?? null)
  const awayEspnId = computed(() => TEAM_ESPN_ID[awayTeam.value] ?? null)

  const homeVenue = computed(() => TEAM_VENUE[homeTeam.value] ?? null)

  const homeFounded = computed(() => TEAM_FOUNDED[homeTeam.value] ?? null)
  const awayFounded = computed(() => TEAM_FOUNDED[awayTeam.value] ?? null)

  const homeBio = computed(() => TEAM_BIO[homeTeam.value] ?? null)
  const awayBio = computed(() => TEAM_BIO[awayTeam.value] ?? null)

  const matchDate = computed(() => {
    if (!props.match?.date) return ''
    return new Date(props.match.date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: iana.value,
    })
  })

  const matchTime = computed(() => {
    if (!props.match?.date) return ''
    return new Date(props.match.date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
      timeZone: iana.value,
    })
  })

  // ── Stats helpers ─────────────────────────────────────────────────────────────
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
    const ts = detail.value?.teamStats.find((t) => t.teamId === teamId)
    return ts?.stats.find((s) => s.name === statName)?.displayValue ?? '–'
  }

  // Stat bar width: for possession it's a direct %, for others we compare the two
  function statBarWidth(
    teamId: string,
    statName: string,
    side: 'home' | 'away'
  ): number {
    if (!detail.value) return 50
    const teams = detail.value.teamStats
    if (teams.length < 2) return 50

    if (statName === 'possessionPct') {
      const val = parseFloat(getStat(teamId, statName))
      return isNaN(val) ? 50 : val
    }

    const homeVal = parseFloat(getStat(teams[0]?.teamId ?? '', statName))
    const awayVal = parseFloat(getStat(teams[1]?.teamId ?? '', statName))
    const total = homeVal + awayVal
    if (!total) return 50
    return side === 'home'
      ? Math.round((homeVal / total) * 100)
      : Math.round((awayVal / total) * 100)
  }

  // ── Odds / win probability ────────────────────────────────────────────────────
  const winProb = computed(() => {
    if (!detail.value) return null
    const o = detail.value.odds

    // Try moneyline first (live odds), then convert pre-match fractional
    let homeML = o.home.moneyLine
    let awayML = o.away.moneyLine
    let drawML = o.draw.moneyLine

    if (!homeML && o.preMatchHome)
      homeML = fractionalToMoneyline(o.preMatchHome)
    if (!awayML && o.preMatchAway)
      awayML = fractionalToMoneyline(o.preMatchAway)
    if (!drawML && o.preMatchDraw)
      drawML = fractionalToMoneyline(o.preMatchDraw)

    return normaliseOdds(homeML, drawML, awayML)
  })

  // ── Rosters ───────────────────────────────────────────────────────────────────
  const homeRoster = computed(() => {
    if (!detail.value) return null
    const homeId = homeEspnId.value
    return (
      detail.value.rosters.find((r) => r.teamId === homeId) ??
      detail.value.rosters[0] ??
      null
    )
  })

  const awayRoster = computed(() => {
    if (!detail.value) return null
    const awayId = awayEspnId.value
    return (
      detail.value.rosters.find((r) => r.teamId === awayId) ??
      detail.value.rosters[1] ??
      null
    )
  })

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

  function sortedPlayers(roster: typeof homeRoster.value) {
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

  // ── Head-to-head ──────────────────────────────────────────────────────────────
  const h2h = computed(() => detail.value?.headToHead ?? [])

  function h2hResultClass(result: string): string {
    if (result === 'W') return 'h2h-win'
    if (result === 'L') return 'h2h-loss'
    return 'h2h-draw'
  }

  function h2hYear(dateStr: string): string {
    return new Date(dateStr).getFullYear().toString()
  }

  // ── Leaders ───────────────────────────────────────────────────────────────────
  const LEADER_LABELS: Record<string, string> = {
    totalShots: '⚽ Shots',
    accuratePasses: '🎯 Passes',
    saves: '🧤 Saves',
    goals: '⚽ Goals',
    assists: '🅰️ Assists',
  }

  const homeLeaders = computed(() => {
    if (!detail.value) return null
    const homeId = homeEspnId.value
    return (
      detail.value.leaders.find((l) => l.teamId === homeId) ??
      detail.value.leaders[0] ??
      null
    )
  })

  const awayLeaders = computed(() => {
    if (!detail.value) return null
    const awayId = awayEspnId.value
    return (
      detail.value.leaders.find((l) => l.teamId === awayId) ??
      detail.value.leaders[1] ??
      null
    )
  })
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open && match"
        class="modal-backdrop"
        role="dialog"
        aria-modal="true"
        @click.self="emit('close')"
      >
        <div class="modal-panel">
          <!-- ── Header ──────────────────────────────────────────────────────── -->
          <div class="modal-header">
            <!-- Home team -->
            <div class="header-team header-team-home">
              <img
                v-if="homeLogo"
                :src="homeLogo"
                :alt="homeTeam"
                class="header-logo"
              />
              <span
                v-else
                class="header-swatch"
                :style="{ background: match.homeColor }"
              />
              <div class="header-team-info">
                <span class="header-team-name">{{ homeTeam }}</span>
                <span class="header-team-rec">{{ match.homeRec }}</span>
              </div>
            </div>

            <!-- Score / status -->
            <div class="header-score-block">
              <div class="header-score-row">
                <span v-if="match.status.code !== 'ns'" class="header-score">{{
                  match.homeScore ?? '0'
                }}</span>
                <span class="header-sep">
                  <span v-if="match.status.code === 'ns'" class="header-vs"
                    >VS</span
                  >
                  <span
                    v-else-if="match.status.code === 'live'"
                    class="badge badge-live"
                    >{{ match.status.clock || 'LIVE' }}</span
                  >
                  <span
                    v-else-if="match.status.code === 'ht'"
                    class="badge badge-ht"
                    >HT</span
                  >
                  <span v-else class="badge badge-ft">FT</span>
                </span>
                <span v-if="match.status.code !== 'ns'" class="header-score">{{
                  match.awayScore ?? '0'
                }}</span>
              </div>
              <div class="header-meta">
                <span class="header-date">{{ matchDate }}</span>
                <span class="header-time">{{ matchTime }}</span>
                <span v-if="detail?.info.venue" class="header-venue">
                  📍 {{ detail.info.venue
                  }}<span v-if="detail.info.city"
                    >, {{ detail.info.city }}</span
                  >
                </span>
                <span v-if="detail?.info.attendance" class="header-attendance">
                  👥
                  {{ detail.info.attendance.toLocaleString() }} att.
                </span>
              </div>
            </div>

            <!-- Away team -->
            <div class="header-team header-team-away">
              <div class="header-team-info header-team-info-away">
                <span class="header-team-name">{{ awayTeam }}</span>
                <span class="header-team-rec">{{ match.awayRec }}</span>
              </div>
              <img
                v-if="awayLogo"
                :src="awayLogo"
                :alt="awayTeam"
                class="header-logo"
              />
              <span
                v-else
                class="header-swatch"
                :style="{ background: match.awayColor }"
              />
            </div>

            <!-- Close button -->
            <button
              class="modal-close"
              aria-label="Close"
              @click="emit('close')"
            >
              ✕
            </button>
          </div>

          <!-- ── Tabs ────────────────────────────────────────────────────────── -->
          <div class="modal-tabs">
            <button
              class="modal-tab"
              :class="{ active: activeTab === 'overview' }"
              @click="activeTab = 'overview'"
            >
              Overview
            </button>
            <button
              class="modal-tab"
              :class="{ active: activeTab === 'squad' }"
              @click="activeTab = 'squad'"
            >
              Squads
            </button>
            <button
              class="modal-tab"
              :class="{ active: activeTab === 'clubs' }"
              @click="activeTab = 'clubs'"
            >
              Clubs
            </button>
          </div>

          <!-- ── Body ────────────────────────────────────────────────────────── -->
          <div class="modal-body">
            <!-- Loading skeleton -->
            <div v-if="loading" class="skeleton-wrap">
              <div v-for="i in 5" :key="i" class="skeleton-row" />
            </div>

            <!-- Error -->
            <div v-else-if="error" class="error-msg">⚠️ {{ error }}</div>

            <!-- ── OVERVIEW TAB ─────────────────────────────────────────────── -->
            <template v-else-if="activeTab === 'overview' && detail">
              <!-- Win probability bar -->
              <section v-if="winProb" class="section">
                <h3 class="section-title">Win Probability</h3>
                <div class="prob-bar-wrap">
                  <span class="prob-label prob-label-home">
                    <span class="prob-abbr">{{
                      detail.teams.find((t) => t.homeAway === 'home')
                        ?.abbreviation ?? homeTeam.split(' ').pop()
                    }}</span>
                    <span class="prob-pct">{{ winProb.home }}%</span>
                  </span>
                  <div class="prob-bar">
                    <div
                      class="prob-fill prob-fill-home"
                      :style="{ width: winProb.home + '%' }"
                      :title="`${homeTeam}: ${winProb.home}%`"
                    />
                    <div
                      class="prob-fill prob-fill-draw"
                      :style="{ width: winProb.draw + '%' }"
                      :title="`Draw: ${winProb.draw}%`"
                    />
                    <div
                      class="prob-fill prob-fill-away"
                      :style="{ width: winProb.away + '%' }"
                      :title="`${awayTeam}: ${winProb.away}%`"
                    />
                  </div>
                  <span class="prob-label prob-label-away">
                    <span class="prob-pct">{{ winProb.away }}%</span>
                    <span class="prob-abbr">{{
                      detail.teams.find((t) => t.homeAway === 'away')
                        ?.abbreviation ?? awayTeam.split(' ').pop()
                    }}</span>
                  </span>
                </div>
                <div class="prob-draw-label">Draw {{ winProb.draw }}%</div>
                <div v-if="detail.odds.provider" class="odds-provider">
                  Odds via {{ detail.odds.provider }}
                </div>
              </section>

              <!-- Match stats -->
              <section v-if="detail.teamStats.length >= 2" class="section">
                <h3 class="section-title">Match Stats</h3>
                <div class="stats-grid">
                  <template v-for="statName in FEATURED_STATS" :key="statName">
                    <div class="stat-row">
                      <span class="stat-val stat-val-home">{{
                        getStat(detail.teamStats[0]?.teamId ?? '', statName)
                      }}</span>
                      <div class="stat-bar-wrap">
                        <div
                          class="stat-bar-fill stat-bar-home"
                          :style="{
                            width:
                              statBarWidth(
                                detail.teamStats[0]?.teamId ?? '',
                                statName,
                                'home'
                              ) + '%',
                          }"
                        />
                        <div
                          class="stat-bar-fill stat-bar-away"
                          :style="{
                            width:
                              statBarWidth(
                                detail.teamStats[1]?.teamId ?? '',
                                statName,
                                'away'
                              ) + '%',
                          }"
                        />
                      </div>
                      <span class="stat-label">{{
                        STAT_LABELS[statName] ?? statName
                      }}</span>
                      <span class="stat-val stat-val-away">{{
                        getStat(detail.teamStats[1]?.teamId ?? '', statName)
                      }}</span>
                    </div>
                  </template>
                </div>
              </section>

              <!-- Player leaders -->
              <section v-if="homeLeaders || awayLeaders" class="section">
                <h3 class="section-title">Player Leaders</h3>
                <div class="leaders-grid">
                  <div
                    v-for="side in ['home', 'away']"
                    :key="side"
                    class="leaders-col"
                  >
                    <div class="leaders-team-name">
                      {{
                        side === 'home'
                          ? homeLeaders?.displayName
                          : awayLeaders?.displayName
                      }}
                    </div>
                    <div
                      v-for="cat in (side === 'home'
                        ? homeLeaders
                        : awayLeaders
                      )?.categories.filter((c) => c.athlete && c.value)"
                      :key="cat.name"
                      class="leader-row"
                    >
                      <span class="leader-cat">{{
                        LEADER_LABELS[cat.name] ?? cat.shortDisplayName
                      }}</span>
                      <span class="leader-athlete">{{ cat.athlete }}</span>
                      <span class="leader-val">{{ cat.value }}</span>
                    </div>
                  </div>
                </div>
              </section>

              <!-- Head-to-head -->
              <section v-if="h2h.length" class="section">
                <h3 class="section-title">
                  Head to Head
                  <span class="section-subtitle"
                    >(from {{ homeTeam }}'s perspective)</span
                  >
                </h3>
                <div class="h2h-list">
                  <div v-for="game in h2h" :key="game.id" class="h2h-row">
                    <span class="h2h-year">{{ h2hYear(game.date) }}</span>
                    <span class="h2h-atvs">{{ game.atVs }}</span>
                    <span class="h2h-score">{{ game.score }}</span>
                    <span
                      class="h2h-result"
                      :class="h2hResultClass(game.result)"
                      >{{ game.result }}</span
                    >
                    <span class="h2h-comp">{{ game.competition }}</span>
                  </div>
                </div>
              </section>
            </template>

            <!-- ── SQUAD TAB ────────────────────────────────────────────────── -->
            <template v-else-if="activeTab === 'squad' && detail">
              <div class="squads-grid">
                <div
                  v-for="(roster, idx) in [homeRoster, awayRoster]"
                  :key="idx"
                  class="squad-col"
                >
                  <div class="squad-team-header">
                    <img
                      v-if="idx === 0 ? homeLogo : awayLogo"
                      :src="idx === 0 ? homeLogo! : awayLogo!"
                      :alt="idx === 0 ? homeTeam : awayTeam"
                      class="squad-logo"
                    />
                    <span class="squad-team-name">{{
                      idx === 0 ? homeTeam : awayTeam
                    }}</span>
                  </div>

                  <div
                    v-if="roster && roster.players.length"
                    class="squad-list"
                  >
                    <div
                      v-for="player in sortedPlayers(roster)"
                      :key="player.id"
                      class="squad-player"
                      :class="{
                        'player-starter': player.starter,
                        'player-sub': !player.starter,
                        'player-subbed-in': player.subbedIn,
                        'player-subbed-out': player.subbedOut,
                      }"
                    >
                      <span class="player-jersey">{{
                        player.jersey ?? '–'
                      }}</span>
                      <span class="player-pos">{{ player.position }}</span>
                      <span class="player-name">{{ player.displayName }}</span>
                      <span
                        v-if="player.subbedIn"
                        class="sub-icon sub-in"
                        title="Subbed in"
                        >↑</span
                      >
                      <span
                        v-if="player.subbedOut"
                        class="sub-icon sub-out"
                        title="Subbed out"
                        >↓</span
                      >
                    </div>
                  </div>
                  <div v-else class="no-data">Lineup not yet available</div>
                </div>
              </div>
            </template>

            <!-- ── CLUBS TAB ───────────────────────────────────────────────── -->
            <template v-else-if="activeTab === 'clubs'">
              <div class="clubs-grid">
                <div
                  v-for="(team, idx) in [
                    {
                      name: homeTeam,
                      logo: homeLogo,
                      color: match.homeColor,
                      founded: homeFounded,
                      bio: homeBio,
                      venue: homeVenue,
                    },
                    {
                      name: awayTeam,
                      logo: awayLogo,
                      color: match.awayColor,
                      founded: awayFounded,
                      bio: awayBio,
                      venue: TEAM_VENUE[awayTeam] ?? null,
                    },
                  ]"
                  :key="idx"
                  class="club-card"
                >
                  <div class="club-header">
                    <img
                      v-if="team.logo"
                      :src="team.logo"
                      :alt="team.name"
                      class="club-logo"
                    />
                    <span
                      v-else
                      class="club-swatch"
                      :style="{ background: team.color }"
                    />
                    <div class="club-title-block">
                      <h3 class="club-name">{{ team.name }}</h3>
                      <span v-if="team.founded" class="club-founded"
                        >Est. {{ team.founded }}</span
                      >
                    </div>
                  </div>

                  <div v-if="team.venue" class="club-detail">
                    <span class="club-detail-label">🏟️ Stadium</span>
                    <span class="club-detail-val">{{ team.venue }}</span>
                  </div>

                  <div class="club-detail">
                    <span class="club-detail-label">📊 Record</span>
                    <span class="club-detail-val">
                      {{ idx === 0 ? match.homeRec : match.awayRec }}
                      <span class="club-pts">
                        ({{
                          detail?.teams.find(
                            (t) => t.homeAway === (idx === 0 ? 'home' : 'away')
                          )?.points ?? '–'
                        }}
                        pts)
                      </span>
                    </span>
                  </div>

                  <p v-if="team.bio" class="club-bio">{{ team.bio }}</p>
                  <p v-else class="club-bio club-bio-empty">
                    Club information not available.
                  </p>
                </div>
              </div>
            </template>

            <!-- No detail yet (open but not loaded) -->
            <div v-else-if="!loading && !detail" class="no-data">
              Loading match details…
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
  /* ── Backdrop & panel ─────────────────────────────────────────────────────── */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9000;
    background: oklab(0% 0 0 / 0.72);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 0;
  }

  @media (min-width: 600px) {
    .modal-backdrop {
      align-items: center;
      padding: 1rem;
    }
  }

  .modal-panel {
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    background: var(--color-theme-900, oklch(20.8% 0.042 265.8));
    border: 1px solid oklab(100% 0 0 / 0.1);
    border-radius: 1rem 1rem 0 0;
    width: 100%;
    max-width: 52rem;
    max-height: 92dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  @media (min-width: 600px) {
    .modal-panel {
      border-radius: 1rem;
      max-height: 88dvh;
    }
  }

  /* ── Transition ───────────────────────────────────────────────────────────── */
  .modal-enter-active,
  .modal-leave-active {
    transition:
      opacity 0.2s ease,
      transform 0.25s ease;
  }

  .modal-enter-from,
  .modal-leave-to {
    opacity: 0;
    transform: translateY(2rem);
  }

  @media (min-width: 600px) {
    .modal-enter-from,
    .modal-leave-to {
      transform: scale(0.96) translateY(0.5rem);
    }
  }

  /* ── Header ───────────────────────────────────────────────────────────────── */
  .modal-header {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: start;
    gap: 0.5rem;
    padding: 1rem 1rem 0.75rem;
    border-bottom: 1px solid oklab(100% 0 0 / 0.08);
    position: relative;
    flex-shrink: 0;
  }

  .header-team {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .header-team-home {
    justify-content: flex-start;
  }

  .header-team-away {
    justify-content: flex-end;
  }

  .header-logo {
    width: 2.5rem;
    height: 2.5rem;
    object-fit: contain;
    flex-shrink: 0;
  }

  .header-swatch {
    width: 2rem;
    height: 2rem;
    border-radius: 0.25rem;
    flex-shrink: 0;
  }

  .header-team-info {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .header-team-info-away {
    text-align: right;
  }

  .header-team-name {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--color-text-primary);
    line-height: 1.1;
  }

  .header-team-rec {
    font-size: 0.75rem;
    font-weight: 300;
    color: var(--color-text-secondary);
  }

  .header-score-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .header-score-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .header-score {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-text-primary);
    line-height: 1;
    min-width: 1.5ch;
    text-align: center;
  }

  .header-sep {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 2.5rem;
  }

  .header-vs {
    font-size: 1rem;
    font-weight: 300;
    color: var(--color-text-secondary);
    letter-spacing: 0.1em;
  }

  .header-meta {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1rem;
  }

  .header-date {
    font-size: 0.6875rem;
    font-weight: 400;
    color: var(--color-text-secondary);
    text-align: center;
  }

  .header-time {
    font-size: 0.6875rem;
    color: var(--color-text-secondary);
    text-align: center;
  }

  .header-venue {
    font-size: 0.625rem;
    color: var(--color-text-secondary);
    text-align: center;
    opacity: 0.8;
  }

  .header-attendance {
    font-size: 0.625rem;
    color: var(--color-text-secondary);
    text-align: center;
    opacity: 0.7;
  }

  /* Badges */
  .badge {
    font-size: 0.625rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    padding: 0.15rem 0.4rem;
    border-radius: 0.25rem;
  }

  .badge-live {
    background: oklab(34.8% -0.072 0.028 / 0.7);
    color: var(--color-text-accent);
    border: 1px solid
      color-mix(in oklab, var(--color-text-accent) 20%, transparent);
  }

  .badge-ht {
    background: oklab(33.2% 0.028 0.062 / 0.7);
    color: oklab(82.1% 0.022 0.082);
  }

  .badge-ft {
    background: oklab(100% 0 0 / 0.08);
    color: var(--color-text-secondary);
  }

  /* Close button */
  .modal-close {
    position: absolute;
    top: 0.625rem;
    right: 0.625rem;
    background: oklab(100% 0 0 / 0.08);
    border: none;
    color: var(--color-text-secondary);
    font-size: 0.875rem;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
  }

  .modal-close:hover {
    background: oklab(100% 0 0 / 0.15);
    color: var(--color-text-primary);
  }

  /* ── Tabs ─────────────────────────────────────────────────────────────────── */
  .modal-tabs {
    display: flex;
    gap: 0.25rem;
    padding: 0.5rem 1rem 0;
    border-bottom: 1px solid oklab(100% 0 0 / 0.08);
    flex-shrink: 0;
  }

  .modal-tab {
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-size: 0.8125rem;
    font-weight: 500;
    letter-spacing: 0.05em;
    padding: 0.3rem 0.75rem;
    border-radius: 0.375rem 0.375rem 0 0;
    color: var(--color-text-secondary);
    background: transparent;
    border: none;
    cursor: pointer;
    position: relative;
    bottom: -1px;
    transition: color 0.15s;
  }

  .modal-tab.active {
    color: var(--color-theme-300);
    border: 1px solid oklab(100% 0 0 / 0.1);
    border-bottom-color: var(--color-theme-900, oklch(20.8% 0.042 265.8));
    background: var(--color-theme-800);
  }

  .modal-tab:hover:not(.active) {
    color: var(--color-text-primary);
  }

  /* ── Body ─────────────────────────────────────────────────────────────────── */
  .modal-body {
    overflow-y: auto;
    flex: 1;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  /* ── Skeleton ─────────────────────────────────────────────────────────────── */
  .skeleton-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    padding: 0.5rem 0;
  }

  .skeleton-row {
    height: 2rem;
    border-radius: 0.375rem;
    background: oklab(100% 0 0 / 0.06);
    animation: pulse 1.4s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.35;
    }
  }

  /* ── Error ────────────────────────────────────────────────────────────────── */
  .error-msg {
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    background: oklab(30.8% 0.072 0.028 / 0.3);
    border: 1px solid oklab(68.5% 0.13 0.048 / 0.2);
    font-size: 0.8125rem;
    color: oklab(75.8% 0.107 0.04);
  }

  /* ── Section ──────────────────────────────────────────────────────────────── */
  .section {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  .section-title {
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-theme-400);
    margin: 0;
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  .section-subtitle {
    font-size: 0.625rem;
    font-weight: 400;
    letter-spacing: 0.04em;
    text-transform: none;
    color: var(--color-text-secondary);
  }

  /* ── Win probability ──────────────────────────────────────────────────────── */
  .prob-bar-wrap {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }

  .prob-bar {
    flex: 1;
    height: 0.5rem;
    border-radius: 0.25rem;
    overflow: hidden;
    display: flex;
    background: oklab(100% 0 0 / 0.06);
  }

  .prob-fill {
    height: 100%;
    transition: width 0.4s ease;
  }

  .prob-fill-home {
    background: var(--color-theme-400);
  }

  .prob-fill-draw {
    background: oklab(100% 0 0 / 0.2);
  }

  .prob-fill-away {
    background: oklab(70% 0 0 / 0.5);
  }

  .prob-label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .prob-label-home {
    flex-direction: row;
  }

  .prob-label-away {
    flex-direction: row-reverse;
  }

  .prob-abbr {
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    letter-spacing: 0.05em;
  }

  .prob-pct {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  .prob-draw-label {
    text-align: center;
    font-size: 0.6875rem;
    color: var(--color-text-secondary);
    margin-top: -0.25rem;
  }

  .odds-provider {
    font-size: 0.5625rem;
    color: var(--color-text-secondary);
    opacity: 0.6;
    text-align: center;
  }

  /* ── Match stats ──────────────────────────────────────────────────────────── */
  .stats-grid {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .stat-row {
    display: grid;
    grid-template-columns: 2.5rem 1fr 6rem 2.5rem;
    align-items: center;
    gap: 0.5rem;
  }

  @media (max-width: 480px) {
    .stat-row {
      grid-template-columns: 2rem 1fr 5rem 2rem;
    }
  }

  .stat-val {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text-primary);
    line-height: 1;
  }

  .stat-val-home {
    text-align: right;
  }

  .stat-val-away {
    text-align: left;
  }

  .stat-label {
    font-size: 0.6875rem;
    font-weight: 400;
    color: var(--color-text-secondary);
    text-align: center;
    letter-spacing: 0.03em;
  }

  .stat-bar-wrap {
    display: flex;
    height: 0.3125rem;
    border-radius: 0.25rem;
    overflow: hidden;
    background: oklab(100% 0 0 / 0.06);
  }

  .stat-bar-fill {
    height: 100%;
    transition: width 0.4s ease;
  }

  .stat-bar-home {
    background: var(--color-theme-400);
    margin-left: auto;
  }

  .stat-bar-away {
    background: oklab(70% 0 0 / 0.4);
  }

  /* ── Leaders ──────────────────────────────────────────────────────────────── */
  .leaders-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .leaders-col {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .leaders-team-name {
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-theme-400);
    margin-bottom: 0.25rem;
  }

  .leader-row {
    display: flex;
    align-items: baseline;
    gap: 0.375rem;
    font-size: 0.8125rem;
  }

  .leader-cat {
    font-size: 0.6875rem;
    color: var(--color-text-secondary);
    flex-shrink: 0;
    min-width: 4.5rem;
  }

  .leader-athlete {
    flex: 1;
    color: var(--color-text-primary);
    font-weight: 400;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .leader-val {
    font-weight: 600;
    color: var(--color-text-primary);
    flex-shrink: 0;
  }

  /* ── Head-to-head ─────────────────────────────────────────────────────────── */
  .h2h-list {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .h2h-row {
    display: grid;
    grid-template-columns: 2.5rem 1.5rem 3rem 1.5rem 1fr;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8125rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    background: oklab(100% 0 0 / 0.03);
  }

  .h2h-year {
    font-size: 0.6875rem;
    color: var(--color-text-secondary);
  }

  .h2h-atvs {
    font-size: 0.6875rem;
    color: var(--color-text-secondary);
    text-align: center;
  }

  .h2h-score {
    font-weight: 600;
    color: var(--color-text-primary);
    text-align: center;
  }

  .h2h-result {
    font-size: 0.6875rem;
    font-weight: 700;
    text-align: center;
    padding: 0.1rem 0.3rem;
    border-radius: 0.2rem;
  }

  .h2h-win {
    background: oklab(34.8% -0.072 0.028 / 0.5);
    color: oklab(80% -0.1 0.04);
  }

  .h2h-loss {
    background: oklab(30.8% 0.072 0.028 / 0.4);
    color: oklab(75.8% 0.107 0.04);
  }

  .h2h-draw {
    background: oklab(100% 0 0 / 0.08);
    color: var(--color-text-secondary);
  }

  .h2h-comp {
    font-size: 0.625rem;
    color: var(--color-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ── Squads ───────────────────────────────────────────────────────────────── */
  .squads-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  @media (max-width: 480px) {
    .squads-grid {
      grid-template-columns: 1fr;
    }
  }

  .squad-col {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .squad-team-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.375rem;
  }

  .squad-logo {
    width: 1.5rem;
    height: 1.5rem;
    object-fit: contain;
  }

  .squad-team-name {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-theme-400);
  }

  .squad-list {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .squad-player {
    display: grid;
    grid-template-columns: 1.5rem 1.75rem 1fr auto;
    align-items: center;
    gap: 0.375rem;
    padding: 0.2rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
  }

  .player-starter {
    background: oklab(100% 0 0 / 0.04);
  }

  .player-sub {
    opacity: 0.6;
  }

  .player-jersey {
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    text-align: right;
  }

  .player-pos {
    font-size: 0.5625rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: var(--color-theme-400);
    text-align: center;
    background: oklab(100% 0 0 / 0.06);
    border-radius: 0.2rem;
    padding: 0.05rem 0.2rem;
  }

  .player-name {
    font-size: 0.8125rem;
    font-weight: 300;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sub-icon {
    font-size: 0.75rem;
    font-weight: 700;
    flex-shrink: 0;
  }

  .sub-in {
    color: oklab(70% -0.1 0.04);
  }

  .sub-out {
    color: oklab(65% 0.1 0.04);
  }

  /* ── Clubs ────────────────────────────────────────────────────────────────── */
  .clubs-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  @media (max-width: 540px) {
    .clubs-grid {
      grid-template-columns: 1fr;
    }
  }

  .club-card {
    background: oklab(100% 0 0 / 0.04);
    border: 1px solid oklab(100% 0 0 / 0.07);
    border-radius: 0.5rem;
    padding: 0.875rem;
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  .club-header {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }

  .club-logo {
    width: 3rem;
    height: 3rem;
    object-fit: contain;
    flex-shrink: 0;
  }

  .club-swatch {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.375rem;
    flex-shrink: 0;
  }

  .club-title-block {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .club-name {
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0;
    line-height: 1.1;
  }

  .club-founded {
    font-size: 0.6875rem;
    color: var(--color-theme-400);
    font-weight: 400;
  }

  .club-detail {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .club-detail-label {
    font-size: 0.5625rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-text-secondary);
  }

  .club-detail-val {
    font-size: 0.8125rem;
    color: var(--color-text-primary);
    font-weight: 300;
  }

  .club-pts {
    color: var(--color-text-secondary);
    font-size: 0.75rem;
  }

  .club-bio {
    font-size: 0.8125rem;
    font-weight: 300;
    color: var(--color-text-secondary);
    line-height: 1.5;
    margin: 0;
  }

  .club-bio-empty {
    opacity: 0.5;
    font-style: italic;
  }

  /* ── No data ──────────────────────────────────────────────────────────────── */
  .no-data {
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
    text-align: center;
    padding: 1.5rem 0;
    opacity: 0.6;
  }
</style>
