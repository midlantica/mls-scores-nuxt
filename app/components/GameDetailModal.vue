<script setup lang="ts">
  import type { Match } from '../composables/useScores'
  import {
    useMatchDetail,
    normaliseOdds,
    fractionalToMoneyline,
    type MatchEvent,
  } from '../composables/useMatchDetail'
  import {
    TEAM_LOGO,
    TEAM_VENUE,
    TEAM_ESPN_ID,
    TEAM_ABBREV,
  } from '../composables/useMyTeam'
  import { TEAM_COLOR_PAIRS } from '../composables/useTeamColors'
  import { wcagContrast } from 'culori'
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

  const emit = defineEmits<{
    close: []
    'select-team': [team: string]
  }>()

  // ── Data fetching ─────────────────────────────────────────────────────────────
  const {
    detail,
    loading,
    error,
    fetchDetail,
    startPolling,
    stopPolling,
    clear,
  } = useMatchDetail()
  const { iana } = useTimezone()

  function isLiveOrHT(m: Match | null) {
    return m?.status.code === 'live' || m?.status.code === 'ht'
  }

  watch(
    () => props.match,
    (m) => {
      if (m && props.open) {
        fetchDetail(m.id)
        if (isLiveOrHT(m)) startPolling(m.id)
        else stopPolling()
      }
    }
  )

  watch(
    () => props.open,
    (open) => {
      if (open && props.match) {
        fetchDetail(props.match.id)
        document.body.style.overflow = 'hidden'
        if (isLiveOrHT(props.match)) startPolling(props.match.id)
      } else {
        document.body.style.overflow = ''
        if (!open) {
          stopPolling()
          clear()
        }
      }
    }
  )

  onUnmounted(() => {
    stopPolling()
    document.body.style.overflow = ''
  })

  // ── Keyboard close ────────────────────────────────────────────────────────────
  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') emit('close')
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onUnmounted(() => window.removeEventListener('keydown', onKeydown))

  // ── Tab state ─────────────────────────────────────────────────────────────────
  type ModalTab = 'overview' | 'leaders' | 'lineups' | 'h2h'
  const TAB_ORDER: ModalTab[] = ['overview', 'leaders', 'lineups', 'h2h']
  const activeTab = ref<ModalTab>('overview')
  const slideDir = ref<'left' | 'right'>('left')

  function setTab(tab: ModalTab) {
    const from = TAB_ORDER.indexOf(activeTab.value)
    const to = TAB_ORDER.indexOf(tab)
    slideDir.value = to > from ? 'left' : 'right'
    activeTab.value = tab
  }

  watch(
    () => props.open,
    (open) => {
      if (open) activeTab.value = 'overview'
    }
  )

  // ── Derived data ──────────────────────────────────────────────────────────────
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

  // Compact header meta: "Sat, May 17 · 7:30 PM CDT · 2026"
  const matchMeta = computed(() => {
    if (!props.match?.date) return ''
    const d = new Date(props.match.date)
    const day = d
      .toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: iana.value,
      })
      .toUpperCase()
    const time = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
      timeZone: iana.value,
    })
    const year = d.toLocaleDateString('en-US', {
      year: 'numeric',
      timeZone: iana.value,
    })
    return `${day} · ${time} · ${year}`
  })

  const matchVenue = computed(() => {
    if (!detail.value?.info.venue) return null
    return detail.value.info.city
      ? `${detail.value.info.venue}, ${detail.value.info.city}`
      : detail.value.info.venue
  })

  const matchAttendance = computed(() =>
    detail.value?.info.attendance
      ? detail.value.info.attendance.toLocaleString() + ' att.'
      : null
  )

  // Combined venue + attendance for desktop header footer line
  const matchVenueAttendance = computed(() => {
    const parts = [matchVenue.value, matchAttendance.value].filter(Boolean)
    return parts.length ? parts.join(' - ') : null
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

  function getStatDisplay(teamId: string, statName: string): string {
    const val = getStat(teamId, statName)
    if (statName === 'possessionPct' && val !== '–') return val + '%'
    return val
  }

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

  // Returns CSS class based on whether this score is the higher (win), lower (loss), or equal (draw)
  function h2hScoreClass(myScore: string, theirScore: string): string {
    const a = parseInt(myScore)
    const b = parseInt(theirScore)
    if (isNaN(a) || isNaN(b)) return 'h2h-draw'
    if (a > b) return 'h2h-win'
    if (a < b) return 'h2h-loss'
    return 'h2h-draw'
  }

  function h2hDate(dateStr: string): { weekday: string; date: string } {
    const d = new Date(dateStr)
    const weekday = d.toLocaleDateString('en-US', {
      weekday: 'short',
      timeZone: 'UTC',
    })
    const date = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    })
    return { weekday, date }
  }

  // Parse "homeScore-awayScore" from ESPN's perspective for that game,
  // then return scores from the perspective of our home/away teams.
  function h2hScores(
    scoreStr: string,
    atVs: string
  ): { left: string; right: string } {
    const parts = scoreStr?.split('-') ?? []
    const gameHome = parts[0]?.trim() ?? '–'
    const gameAway = parts[1]?.trim() ?? '–'
    // atVs === 'vs' means our home team was the home team in this game
    // atVs === '@'  means our home team was the away team in this game
    if (atVs === 'vs') return { left: gameHome, right: gameAway }
    return { left: gameAway, right: gameHome }
  }

  // ── Leaders ───────────────────────────────────────────────────────────────────
  const LEADER_LABELS: Record<string, string> = {
    totalShots: 'Shots',
    accuratePasses: 'Passes',
    saves: 'Saves',
    goals: 'Goals',
    assists: 'Assists',
  }

  // Short names for H2H mobile display (e.g. "NE Revolution" instead of full name)
  const TEAM_SHORT_NAME: Record<string, string> = {
    'Atlanta United FC': 'Atlanta Utd',
    'Austin FC': 'Austin FC',
    'CF Montréal': 'CF Montréal',
    'Charlotte FC': 'Charlotte FC',
    'Chicago Fire FC': 'Chicago Fire',
    'Colorado Rapids': 'CO Rapids',
    'Columbus Crew': 'Columbus',
    'D.C. United': 'DC United',
    'FC Cincinnati': 'FC Cincinnati',
    'FC Dallas': 'FC Dallas',
    'Houston Dynamo FC': 'Houston',
    'Inter Miami CF': 'Inter Miami',
    'LA Galaxy': 'LA Galaxy',
    LAFC: 'LAFC',
    'Minnesota United FC': 'Minnesota',
    'Nashville SC': 'Nashville SC',
    'New England Revolution': 'NE Revolution',
    'New York City FC': 'NYCFC',
    'Orlando City SC': 'Orlando City',
    'Philadelphia Union': 'Philadelphia',
    'Portland Timbers': 'Portland',
    'Real Salt Lake': 'RSL',
    'Red Bull New York': 'NY Red Bulls',
    'San Diego FC': 'San Diego FC',
    'San Jose Earthquakes': 'San Jose',
    'Seattle Sounders FC': 'Seattle',
    'Sporting Kansas City': 'Sporting KC',
    'St. Louis City SC': 'St. Louis',
    'Toronto FC': 'Toronto FC',
    'Vancouver Whitecaps': 'Vancouver',
  }

  const homeAbbr = computed(
    () => TEAM_SHORT_NAME[homeTeam.value] ?? homeTeam.value
  )
  const awayAbbr = computed(
    () => TEAM_SHORT_NAME[awayTeam.value] ?? awayTeam.value
  )

  // Short 3-5 char abbreviations for the events row (STL, ATX, etc.)
  const homeTeamAbbrev = computed(
    () =>
      TEAM_ABBREV[homeTeam.value] ?? homeTeam.value.slice(0, 4).toUpperCase()
  )
  const awayTeamAbbrev = computed(
    () =>
      TEAM_ABBREV[awayTeam.value] ?? awayTeam.value.slice(0, 4).toUpperCase()
  )

  // ── Team label colors for the events row ─────────────────────────────────
  // Use the team's primary color if it has ≥3:1 contrast on the dark header bg.
  // Otherwise fall back to white.
  const HEADER_BG = '#0d0f14' // approx oklch(12% 0.01 260)
  const FALLBACK_LABEL = '#ffffff'

  function teamLabelColor(teamName: string): string {
    const primary = TEAM_COLOR_PAIRS[teamName]?.primary
    if (!primary) return FALLBACK_LABEL
    const ratio = wcagContrast(primary, HEADER_BG)
    return ratio >= 3 ? primary : FALLBACK_LABEL
  }

  const homeLabelColor = computed(() => teamLabelColor(homeTeam.value))
  const awayLabelColor = computed(() => teamLabelColor(awayTeam.value))

  // ── Match events filtered by home/away team ───────────────────────────────
  // Use the ESPN team IDs from the detail.teams array (matched by homeAway flag)
  // rather than TEAM_ESPN_ID lookup, so we don't depend on name-matching.
  const homeMatchEvents = computed<MatchEvent[]>(() => {
    if (!detail.value?.matchEvents) return []
    // Find the home team's ESPN ID from the detail teams array
    const homeTeamDetail = detail.value.teams.find((t) => t.homeAway === 'home')
    const homeId = homeTeamDetail?.id ?? homeEspnId.value ?? ''
    return detail.value.matchEvents.filter((e) => e.teamId === homeId)
  })

  const awayMatchEvents = computed<MatchEvent[]>(() => {
    if (!detail.value?.matchEvents) return []
    const awayTeamDetail = detail.value.teams.find((t) => t.homeAway === 'away')
    const awayId = awayTeamDetail?.id ?? awayEspnId.value ?? ''
    return detail.value.matchEvents.filter((e) => e.teamId === awayId)
  })

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
        @mousedown.self="emit('close')"
      >
        <div class="modal-panel">
          <!-- ── Header ──────────────────────────────────────────────────────── -->
          <div class="modal-header">
            <!-- Mobile game-card header (hidden on desktop) -->
            <div class="header-mobile">
              <!-- Home team row -->
              <div class="header-mobile-team">
                <button
                  class="header-logo-btn"
                  @click.stop="emit('select-team', homeTeam)"
                >
                  <img
                    v-if="homeLogo"
                    :src="homeLogo"
                    :alt="homeTeam"
                    class="header-mobile-logo"
                  />
                  <span
                    v-else
                    class="header-mobile-swatch"
                    :style="{ background: match.homeColor }"
                  />
                </button>
                <button
                  class="header-mobile-name header-mobile-name-btn"
                  @click.stop="emit('select-team', homeTeam)"
                >
                  {{ homeAbbr }}
                </button>
                <span class="header-mobile-rec">{{ match.homeRec }}</span>
                <span class="header-mobile-spacer" />
                <span
                  v-if="match.status.code !== 'ns'"
                  class="header-mobile-score"
                  >{{ match.homeScore ?? '0' }}</span
                >
              </div>
              <!-- Away team row -->
              <div class="header-mobile-team">
                <button
                  class="header-logo-btn"
                  @click.stop="emit('select-team', awayTeam)"
                >
                  <img
                    v-if="awayLogo"
                    :src="awayLogo"
                    :alt="awayTeam"
                    class="header-mobile-logo"
                  />
                  <span
                    v-else
                    class="header-mobile-swatch"
                    :style="{ background: match.awayColor }"
                  />
                </button>
                <button
                  class="header-mobile-name header-mobile-name-btn"
                  @click.stop="emit('select-team', awayTeam)"
                >
                  {{ awayAbbr }}
                </button>
                <span class="header-mobile-rec">{{ match.awayRec }}</span>
                <span class="header-mobile-spacer" />
                <span
                  v-if="match.status.code !== 'ns'"
                  class="header-mobile-score"
                  >{{ match.awayScore ?? '0' }}</span
                >
              </div>
              <!-- Meta info -->
              <div class="header-mobile-meta">
                <span class="header-meta-line">{{ matchMeta }}</span>
                <span
                  v-if="matchVenueAttendance"
                  class="header-meta-line header-venue"
                  >{{ matchVenueAttendance }}</span
                >
              </div>
            </div>

            <!-- Venue line — topmost, desktop only -->
            <div
              v-if="matchVenueAttendance"
              class="header-venue-line header-venue-line-top"
            >
              {{ matchVenueAttendance }}
            </div>

            <!-- Desktop header (hidden on mobile) -->
            <div class="header-row">
              <!-- Home team: info (right-aligned) + logo -->
              <div class="header-team header-team-home">
                <div class="header-team-info header-team-info-home">
                  <button
                    class="header-team-name header-team-name-btn"
                    @click.stop="emit('select-team', homeTeam)"
                  >
                    {{ homeTeam }}
                  </button>
                  <span class="header-team-rec">{{ match.homeRec }}</span>
                </div>
                <button
                  class="header-logo-btn"
                  @click.stop="emit('select-team', homeTeam)"
                >
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
                </button>
              </div>

              <!-- Center: score + meta -->
              <div class="header-score-block">
                <div class="header-score-row">
                  <span
                    v-if="match.status.code !== 'ns'"
                    class="header-score"
                    >{{ match.homeScore ?? '0' }}</span
                  >
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
                  <span
                    v-if="match.status.code !== 'ns'"
                    class="header-score"
                    >{{ match.awayScore ?? '0' }}</span
                  >
                </div>
                <div class="header-meta">
                  <span class="header-meta-line">{{ matchMeta }}</span>
                </div>
              </div>

              <!-- Away team: logo + info (left-aligned) -->
              <div class="header-team header-team-away">
                <button
                  class="header-logo-btn"
                  @click.stop="emit('select-team', awayTeam)"
                >
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
                </button>
                <div class="header-team-info header-team-info-away">
                  <button
                    class="header-team-name header-team-name-btn"
                    @click.stop="emit('select-team', awayTeam)"
                  >
                    {{ awayTeam }}
                  </button>
                  <span class="header-team-rec">{{ match.awayRec }}</span>
                </div>
              </div>
            </div>

            <!-- Scorers / cards row — desktop: two 50/50 columns; mobile: stacked -->
            <div
              v-if="detail?.matchEvents?.length && match.status.code !== 'ns'"
              class="header-events-row"
            >
              <!-- Home team column -->
              <div class="header-events-col header-events-col-home">
                <!-- Single merged line: label + goals + cards -->
                <div class="events-line">
                  <!-- Mobile only: team label (shown once) -->
                  <span
                    class="events-team-label"
                    :style="{ color: homeLabelColor }"
                    >{{ homeTeamAbbrev }}:</span
                  >
                  <span
                    v-for="(ev, i) in homeMatchEvents.filter(
                      (e) => e.type === 'goal'
                    )"
                    :key="`hg-${i}`"
                    class="event-goal-item"
                  >
                    <span class="event-icon">⚽</span>
                    <span class="event-name">{{ ev.lastName }}</span>
                    <span v-if="ev.isOG" class="event-og">OG</span>
                    <span class="event-clock">{{ ev.clock }}</span>
                    <span v-if="ev.isPenalty" class="event-pen">P</span>
                  </span>
                  <span
                    v-for="(ev, i) in homeMatchEvents.filter(
                      (e) => e.type === 'yellow' || e.type === 'red'
                    )"
                    :key="`hc-${i}`"
                    class="event-card-item"
                  >
                    <span
                      v-if="ev.type === 'yellow'"
                      class="event-card event-card-yellow"
                    />
                    <span v-else class="event-card event-card-red" />
                    <span class="event-name">{{ ev.lastName }}</span>
                    <span class="event-clock">{{ ev.clock }}</span>
                  </span>
                </div>
              </div>

              <!-- Away team column -->
              <div class="header-events-col header-events-col-away">
                <!-- Single merged line: label + goals + cards -->
                <div class="events-line">
                  <!-- Mobile only: team label (shown once) -->
                  <span
                    class="events-team-label"
                    :style="{ color: awayLabelColor }"
                    >{{ awayTeamAbbrev }}:</span
                  >
                  <span
                    v-for="(ev, i) in awayMatchEvents.filter(
                      (e) => e.type === 'goal'
                    )"
                    :key="`ag-${i}`"
                    class="event-goal-item"
                  >
                    <span class="event-icon">⚽</span>
                    <span class="event-name">{{ ev.lastName }}</span>
                    <span v-if="ev.isOG" class="event-og">OG</span>
                    <span class="event-clock">{{ ev.clock }}</span>
                    <span v-if="ev.isPenalty" class="event-pen">P</span>
                  </span>
                  <span
                    v-for="(ev, i) in awayMatchEvents.filter(
                      (e) => e.type === 'yellow' || e.type === 'red'
                    )"
                    :key="`ac-${i}`"
                    class="event-card-item"
                  >
                    <span
                      v-if="ev.type === 'yellow'"
                      class="event-card event-card-yellow"
                    />
                    <span v-else class="event-card event-card-red" />
                    <span class="event-name">{{ ev.lastName }}</span>
                    <span class="event-clock">{{ ev.clock }}</span>
                  </span>
                </div>
              </div>
            </div>

            <!-- Close button -->
            <button
              class="modal-close"
              aria-label="Close"
              @click="emit('close')"
            >
              <CloseIcon />
            </button>
          </div>

          <!-- ── Tabs ────────────────────────────────────────────────────────── -->
          <div class="modal-tabs">
            <button
              class="modal-tab"
              :class="{ active: activeTab === 'overview' }"
              @click="setTab('overview')"
            >
              Stats
            </button>
            <button
              class="modal-tab"
              :class="{ active: activeTab === 'leaders' }"
              @click="setTab('leaders')"
            >
              Leaders
            </button>
            <button
              class="modal-tab"
              :class="{ active: activeTab === 'lineups' }"
              @click="setTab('lineups')"
            >
              Lineups
            </button>
            <button
              class="modal-tab"
              :class="{ active: activeTab === 'h2h' }"
              @click="setTab('h2h')"
            >
              <span class="tab-label-desktop">Head to Head</span>
              <span class="tab-label-mobile">H2H</span>
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

            <!-- ── Tab content with slide transition ──────────────────────── -->
            <Transition v-else :name="`tab-slide-${slideDir}`" mode="out-in">
              <div :key="activeTab" class="tab-pane">
                <!-- ── STATS TAB ───────────────────────────────────────────── -->
                <template v-if="activeTab === 'overview' && detail">
                  <div v-if="detail.teamStats.length >= 2" class="stats-table">
                    <!-- Header: [logo home-name] | center | [logo away-name] centered above columns -->
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
                    <template
                      v-for="(statName, idx) in FEATURED_STATS"
                      :key="statName"
                    >
                      <div
                        class="stats-row"
                        :class="{ 'row-stripe': idx % 2 === 1 }"
                      >
                        <div class="stats-val-cell stats-val-home">
                          <span
                            :class="[
                              'stats-num',
                              parseFloat(
                                getStat(
                                  detail.teamStats[0]?.teamId ?? '',
                                  statName
                                )
                              ) >
                              parseFloat(
                                getStat(
                                  detail.teamStats[1]?.teamId ?? '',
                                  statName
                                )
                              )
                                ? 'stats-num-hi'
                                : '',
                            ]"
                            >{{
                              getStatDisplay(
                                detail.teamStats[0]?.teamId ?? '',
                                statName
                              )
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
                              parseFloat(
                                getStat(
                                  detail.teamStats[1]?.teamId ?? '',
                                  statName
                                )
                              ) >
                              parseFloat(
                                getStat(
                                  detail.teamStats[0]?.teamId ?? '',
                                  statName
                                )
                              )
                                ? 'stats-num-hi'
                                : '',
                            ]"
                            >{{
                              getStatDisplay(
                                detail.teamStats[1]?.teamId ?? '',
                                statName
                              )
                            }}</span
                          >
                        </div>
                      </div>
                    </template>
                  </div>
                  <div v-else class="no-data">Stats not yet available</div>
                </template>

                <!-- ── LEADERS TAB ─────────────────────────────────────────── -->
                <template v-else-if="activeTab === 'leaders' && detail">
                  <div v-if="homeLeaders || awayLeaders" class="leaders-table">
                    <!-- Header: [home name + logo] | · | category | · | [logo + away name] -->
                    <div
                      class="leaders-head"
                      style="grid-template-columns: 1fr 2.5rem 5rem 2.5rem 1fr"
                    >
                      <div class="leaders-th leaders-th-home">
                        <span class="name-short">{{ homeAbbr }}</span>
                        <span class="name-abbrev">{{ homeTeamAbbrev }}</span>
                        <img
                          v-if="homeLogo"
                          :src="homeLogo"
                          :alt="homeTeam"
                          class="head-logo"
                        />
                      </div>
                      <div class="leaders-th-center"></div>
                      <div class="leaders-th-center"></div>
                      <div class="leaders-th-center"></div>
                      <div class="leaders-th leaders-th-away">
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
                    <!-- Rows: player-name | home-val | category | away-val | player-name -->
                    <template
                      v-for="(cat, idx) in (
                        homeLeaders?.categories ??
                        awayLeaders?.categories ??
                        []
                      ).filter((c) => LEADER_LABELS[c.name])"
                      :key="cat.name"
                    >
                      <div
                        class="leaders-row"
                        :class="{ 'row-stripe': idx % 2 === 1 }"
                      >
                        <div class="leaders-name leaders-name-home">
                          {{
                            homeLeaders?.categories.find(
                              (c) => c.name === cat.name
                            )?.athlete ?? '–'
                          }}
                        </div>
                        <div class="leaders-val leaders-val-home">
                          {{
                            homeLeaders?.categories.find(
                              (c) => c.name === cat.name
                            )?.value ?? '–'
                          }}
                        </div>
                        <div class="leaders-cat-col">
                          {{ LEADER_LABELS[cat.name] ?? cat.shortDisplayName }}
                        </div>
                        <div class="leaders-val leaders-val-away">
                          {{
                            awayLeaders?.categories.find(
                              (c) => c.name === cat.name
                            )?.value ?? '–'
                          }}
                        </div>
                        <div class="leaders-name leaders-name-away">
                          {{
                            awayLeaders?.categories.find(
                              (c) => c.name === cat.name
                            )?.athlete ?? '–'
                          }}
                        </div>
                      </div>
                    </template>
                  </div>
                  <div v-else class="no-data">Leaders not yet available</div>
                </template>

                <!-- ── LINEUPS TAB ─────────────────────────────────────────── -->
                <template v-else-if="activeTab === 'lineups' && detail">
                  <div class="squads-table">
                    <!-- Header row: [logo + name centered] | pos | [logo + name centered] -->
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
                      <div
                        class="squads-row"
                        :class="{ 'row-stripe': rowIdx % 2 === 1 }"
                      >
                        <!-- Home player: [sub-icon] [jersey] [name] → flush right -->
                        <div class="squads-player squads-player-home">
                          <span
                            v-if="
                              match.status.code !== 'ns' &&
                              sortedPlayers(homeRoster)[rowIdx]?.subbedIn
                            "
                            class="sub-icon sub-in"
                          />
                          <span
                            v-if="
                              match.status.code !== 'ns' &&
                              sortedPlayers(homeRoster)[rowIdx]?.subbedOut
                            "
                            class="sub-icon sub-out"
                          />
                          <span
                            v-if="sortedPlayers(homeRoster)[rowIdx]"
                            class="squad-jersey"
                            >{{
                              sortedPlayers(homeRoster)[rowIdx]?.jersey ?? '–'
                            }}</span
                          >
                          <span
                            v-if="sortedPlayers(homeRoster)[rowIdx]"
                            class="squad-pname"
                            >{{
                              sortedPlayers(homeRoster)[rowIdx]?.displayName ??
                              ''
                            }}</span
                          >
                        </div>
                        <!-- Center: position badge -->
                        <div class="squads-pos-col">
                          <span
                            v-if="
                              sortedPlayers(homeRoster)[rowIdx] ||
                              sortedPlayers(awayRoster)[rowIdx]
                            "
                            class="squad-pos"
                            >{{
                              sortedPlayers(homeRoster)[rowIdx]?.position ??
                              sortedPlayers(awayRoster)[rowIdx]?.position ??
                              ''
                            }}</span
                          >
                        </div>
                        <!-- Away player: [name] [jersey] [sub-icon] → flush left -->
                        <div class="squads-player squads-player-away">
                          <span
                            v-if="sortedPlayers(awayRoster)[rowIdx]"
                            class="squad-pname"
                            >{{
                              sortedPlayers(awayRoster)[rowIdx]?.displayName ??
                              ''
                            }}</span
                          >
                          <span
                            v-if="sortedPlayers(awayRoster)[rowIdx]"
                            class="squad-jersey"
                            >{{
                              sortedPlayers(awayRoster)[rowIdx]?.jersey ?? '–'
                            }}</span
                          >
                          <span
                            v-if="
                              match.status.code !== 'ns' &&
                              sortedPlayers(awayRoster)[rowIdx]?.subbedIn
                            "
                            class="sub-icon sub-in"
                          />
                          <span
                            v-if="
                              match.status.code !== 'ns' &&
                              sortedPlayers(awayRoster)[rowIdx]?.subbedOut
                            "
                            class="sub-icon sub-out"
                          />
                        </div>
                      </div>
                    </template>
                    <div
                      v-if="
                        !sortedPlayers(homeRoster).length &&
                        !sortedPlayers(awayRoster).length
                      "
                      class="no-data"
                    >
                      Lineups not yet available
                    </div>
                  </div>
                </template>

                <!-- ── H2H TAB ─────────────────────────────────────────────── -->
                <template v-else-if="activeTab === 'h2h'">
                  <div v-if="detail && h2h.length" class="h2h-fixtures-wrap">
                    <div class="h2h-fixtures-table">
                      <div
                        v-for="(game, gi) in h2h"
                        :ey="game.id"
                        class="h2h-fx-row"
                        :class="{ 'row-stripe': gi % 2 === 1 }"
                      >
                        <!-- Date -->
                        <div class="h2h-fx-date">
                          <span class="h2h-fx-date-weekday">{{
                            h2hDate(game.date).weekday
                          }}</span>
                          <span class="h2h-fx-date-md">{{
                            h2hDate(game.date).date
                          }}</span>
                        </div>
                        <!-- Home side (left team): name flush-right, logo inner -->
                        <div class="h2h-fx-home">
                          <button
                            class="h2h-fx-team-btn"
                            @click.stop="
                              emit(
                                'select-team',
                                game.atVs === 'vs' ? homeTeam : awayTeam
                              )
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
                              >{{
                                game.atVs === 'vs' ? homeTeam : awayTeam
                              }}</span
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
                              >{{
                                game.atVs === 'vs' ? homeAbbr : awayAbbr
                              }}</span
                            >
                          </button>
                          <img
                            v-if="
                              TEAM_LOGO[
                                game.atVs === 'vs' ? homeTeam : awayTeam
                              ]
                            "
                            :src="
                              TEAM_LOGO[
                                game.atVs === 'vs' ? homeTeam : awayTeam
                              ]
                            "
                            :alt="game.atVs === 'vs' ? homeTeam : awayTeam"
                            class="h2h-fx-logo"
                          />
                        </div>
                        <!-- Score -->
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
                              >{{
                                h2hScores(game.score, game.atVs).right
                              }}</span
                            >
                          </span>
                        </div>
                        <!-- Away side (right team): logo inner, name flush-left -->
                        <div class="h2h-fx-away">
                          <img
                            v-if="
                              TEAM_LOGO[
                                game.atVs === 'vs' ? awayTeam : homeTeam
                              ]
                            "
                            :src="
                              TEAM_LOGO[
                                game.atVs === 'vs' ? awayTeam : homeTeam
                              ]
                            "
                            :alt="game.atVs === 'vs' ? awayTeam : homeTeam"
                            class="h2h-fx-logo"
                          />
                          <button
                            class="h2h-fx-team-btn"
                            @click.stop="
                              emit(
                                'select-team',
                                game.atVs === 'vs' ? awayTeam : homeTeam
                              )
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
                              >{{
                                game.atVs === 'vs' ? awayTeam : homeTeam
                              }}</span
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
                              >{{
                                game.atVs === 'vs' ? awayAbbr : homeAbbr
                              }}</span
                            >
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else-if="loading" class="skeleton-wrap">
                    <div v-for="i in 4" :key="i" class="skeleton-row" />
                  </div>
                  <div v-else class="no-data">
                    No head-to-head data available
                  </div>
                </template>

                <!-- No detail yet -->
                <div v-else-if="!loading && !detail" class="no-data">
                  Loading match details…
                </div>
              </div>
            </Transition>
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
    background: oklab(0% 0 0 / 0.75);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 1rem;
    overflow-y: auto;
  }

  .modal-panel {
    margin-top: 3rem;
    font-family: var(--font-condensed);
    font-weight: 100;
    letter-spacing: 0.03rem;
    background: oklch(18% 0.01 260);
    border: 1px solid oklab(100% 0 0 / 0.08);
    border-bottom: 3px solid oklab(100% 0 0 / 0.08);
    border-radius: 0.75rem;
    width: 100%;
    max-width: 44rem;
    max-height: 88dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-size: 0.85rem;
    box-shadow: 0 8px 24px oklab(0% 0 0 / 1);
  }

  @media (min-width: 600px) {
    .modal-panel {
      max-height: 80dvh;
      font-size: 1rem;
    }
  }

  /* ── Transition ───────────────────────────────────────────────────────────── */
  .modal-enter-active,
  .modal-leave-active {
    transition:
      opacity 0.18s ease,
      transform 0.22s ease;
  }

  .modal-enter-from,
  .modal-leave-to {
    opacity: 0;
    transform: translateY(1.5rem);
  }

  @media (min-width: 600px) {
    .modal-enter-from,
    .modal-leave-to {
      transform: scale(0.97) translateY(0.5rem);
    }
  }

  /* ── Mobile header ────────────────────────────────────────────────────────── */
  .header-mobile {
    display: none;
  }

  @media (max-width: 599px) {
    .header-mobile {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      width: 100%;
    }

    .header-row {
      display: none;
    }
  }

  .header-mobile-team {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
  }

  .header-mobile-logo {
    width: 1.625rem;
    height: 1.625rem;
    object-fit: contain;
    flex-shrink: 0;
  }

  .header-mobile-swatch {
    width: 1.375rem;
    height: 1.375rem;
    border-radius: 0.2rem;
    flex-shrink: 0;
  }

  .header-mobile-name {
    font-size: 1.3rem;
    font-weight: 200;
    color: oklab(100% 0 0);
    letter-spacing: 0.02em;
    line-height: 1.4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }

  .header-mobile-name-btn {
    font-family: inherit;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    text-align: left;
    transition: opacity 0.15s;
  }

  .header-mobile-name-btn:hover {
    text-decoration: underline;
    text-underline-offset: 0.2em;
    opacity: 0.85;
  }

  .header-mobile-rec {
    font-size: 1rem;
    font-weight: 200;
    color: oklab(100% 0 0 / 0.85);
    letter-spacing: 0.06em;
    flex-shrink: 0;
  }

  .header-mobile-spacer {
    flex: 1;
  }

  .header-mobile-score {
    font-size: 1.375rem;
    font-weight: 600;
    color: oklab(100% 0 0);
    letter-spacing: 0.01em;
    line-height: 1.4;
    min-width: 1.25ch;
    text-align: right;
    flex-shrink: 0;
    align-self: center;
  }

  .header-mobile-meta {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
    padding-top: 0.25rem;
    border-top: 1px solid oklab(100% 0 0 / 0.08);
    margin-top: 0.1rem;
  }

  /* ── Header ───────────────────────────────────────────────────────────────── */
  .modal-header {
    background: linear-gradient(
      180deg,
      oklch(12% 0.01 260) 0%,
      oklch(16% 0.01 260) 100%
    );
    border-bottom: 1px solid oklab(100% 0 0 / 0.1);
    position: relative;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.85rem 0.7rem 0.625rem;
  }

  @media (max-width: 599px) {
    .modal-header {
      padding: 0.625rem 0.875rem 0.5rem;
    }
  }

  .header-row {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 0.625rem;
    width: 100%;
  }

  @media (max-width: 599px) {
    .header-row {
      display: none;
    }
  }

  .header-team {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }

  .header-team-home {
    justify-content: flex-end;
  }

  .header-team-away {
    justify-content: flex-start;
  }

  .header-logo {
    width: 3.5rem;
    height: 3.5rem;
    object-fit: contain;
    flex-shrink: 0;
  }

  .header-swatch {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.25rem;
    flex-shrink: 0;
  }

  .header-team-info {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .header-team-info-home {
    text-align: right;
  }

  .header-team-info-away {
    text-align: left;
  }

  .header-team-name {
    font-size: 1.125rem;
    font-weight: 400;
    color: oklab(100% 0 0);
    line-height: 1.2;
    letter-spacing: 0.04em;
  }

  /* Logo as clickable button — reset button chrome, add hover opacity */
  .header-logo-btn {
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    transition: opacity 0.15s;
  }

  .header-logo-btn:hover {
    opacity: 0.75;
  }

  /* Team name as clickable button — reset button chrome, add hover underline */
  .header-team-name-btn {
    font-family: inherit;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    text-decoration: none;
    transition: opacity 0.15s;
  }

  .header-team-name-btn:hover {
    text-decoration: underline;
    text-underline-offset: 0.2em;
    opacity: 0.85;
  }

  .header-team-rec {
    font-size: 1rem;
    font-weight: 400;
    color: oklab(100% 0 0 / 0.7);
    letter-spacing: 0.07em;
    line-height: 1.2;
  }

  /* Score block — center column */
  .header-score-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    padding: 0.2rem 0rem 0;
    justify-content: flex-end;
  }

  .header-score-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .header-score {
    font-size: 1.875rem;
    font-weight: 600;
    color: oklab(100% 0 0);
    line-height: 1;
    min-width: 1.25ch;
    text-align: center;
    letter-spacing: 0.01em;
  }

  .header-sep {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 2.5rem;
  }

  .header-vs {
    font-size: 1.125rem;
    font-weight: 600;
    color: oklab(100% 0 0);
    letter-spacing: 0.04em;
  }

  .header-meta {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.05rem;
  }

  .header-meta-line {
    font-size: 0.85rem;
    font-weight: 400;
    color: oklab(100% 0 0 / 0.85);
    text-align: center;
    letter-spacing: 0.02em;
    line-height: 1.35;
  }

  .header-venue {
    color: oklab(100% 0 0 / 0.65);
    font-size: 0.8125rem;
    letter-spacing: 0.02em;
  }

  .header-attendance {
    color: oklab(100% 0 0 / 0.5);
  }

  /* Venue line — topmost position (before header-row), desktop only */
  .header-venue-line-top {
    font-size: 0.8rem;
    font-weight: 400;
    color: oklab(100% 0 0 / 0.5);
    text-align: center;
    letter-spacing: 0.05em;
    line-height: 1.35;
    width: 100%;
    margin-bottom: 0.4rem;
  }

  @media (max-width: 599px) {
    .header-venue-line-top {
      display: none;
    }
  }

  /* ── Scorers / cards row ──────────────────────────────────────────────────── */
  .header-events-row {
    display: flex;
    width: 100%;
    margin-top: 0.4rem;
    padding-top: 0.3rem;
    border-top: 1px solid oklab(100% 0 0 / 0.07);
    gap: 4rem;
  }

  @media (max-width: 599px) {
    .header-events-row {
      flex-direction: column;
      gap: 0;
    }
  }

  .header-events-col {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-content: center;
    gap: 0.1rem 0.4rem;
    flex: 1;
    min-width: 0;
  }

  .header-events-col-home {
    justify-content: flex-end;
    align-items: center;
  }

  .header-events-col-away {
    justify-content: flex-start;
    align-items: center;
  }

  @media (max-width: 599px) {
    .header-events-col-home {
      justify-content: center;
      padding-bottom: 0.3rem;
      border-bottom: 1px solid oklab(100% 0 0 / 0.08);
      margin-bottom: 0.3rem;
    }

    .header-events-col-away {
      justify-content: center;
    }
  }

  .events-line {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.1rem 0.3rem;
    font-size: 0.85rem;
    font-weight: 200;
    color: oklab(100% 0 0 / 0.85);
    letter-spacing: 0.03em;
  }

  /* Mobile: show team abbreviation label; hidden on desktop */
  .events-team-label {
    display: none;
    font-weight: 400;
    color: oklab(100% 0 0 / 0.55);
    letter-spacing: 0.08em;
    margin-right: 0.1rem;
    flex-shrink: 0;
  }

  @media (max-width: 599px) {
    .events-team-label {
      display: inline;
    }
  }

  .event-goal-item,
  .event-card-item {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    white-space: nowrap;
  }

  .event-icon {
    font-size: 0.85rem;
    line-height: 1;
  }

  /* Tiny coloured card square */
  .event-card {
    display: inline-block;
    width: 0.5rem;
    height: 0.65rem;
    border-radius: 0.075rem;
    flex-shrink: 0;
  }

  .event-card-yellow {
    background: #f5c518;
  }

  .event-card-red {
    background: #e03030;
  }

  .event-name {
    font-weight: 300;
  }

  .event-og {
    font-size: 0.7rem;
    font-weight: 400;
    letter-spacing: 0.08em;
    color: oklab(100% 0 0 / 0.5);
    text-transform: uppercase;
  }

  .event-clock {
    font-size: 0.85rem;
    color: oklab(100% 0 0 / 0.5);
  }

  /* Penalty badge — small square box with a "P" cap */
  .event-goal-item .event-pen {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.6rem;
    font-weight: 600 !important;
    letter-spacing: 0.04em;
    line-height: 1;
    color: oklab(100% 0 0 / 0.75);
    background: oklab(100% 0 0 / 0.12);
    border: 1px solid oklab(100% 0 0 / 0.2);
    border-radius: 0.15rem;
    padding: 0.1rem 0.2rem;
    text-transform: uppercase;
    flex-shrink: 0;
  }

  /* Badges */
  .badge {
    font-size: 1rem;
    font-weight: 300;
    letter-spacing: 0.08em;
    padding: 0.15rem 0.4rem;
    border-radius: 0.2rem;
  }

  .badge-live {
    color: var(--color-text-accent);
  }

  .badge-ht {
    background: #3a2a10;
    color: #c8a060;
  }

  .badge-ft {
    background: rgba(255, 255, 255, 0.08);
    color: #ffffff;
  }

  /* Close button — plain X in top-right corner, no circle */
  .modal-close {
    position: absolute;
    top: 0.35rem;
    right: 0.35rem;
    background: transparent;
    border: none;
    color: oklab(100% 0 0 / 0.3);
    font-size: 1rem;
    line-height: 1;
    padding: 0.25rem;
    cursor: pointer;
    transition: color 0.15s;
    z-index: 9100;
  }

  .modal-close:hover {
    color: oklab(100% 0 0);
  }

  @media (max-width: 599px) {
    .modal-close {
      display: none;
    }
  }

  /* ── Tabs ─────────────────────────────────────────────────────────────────── */
  .modal-tabs {
    display: flex;
    justify-content: center;
    gap: 0;
    padding: 0 0.75rem;
    flex-shrink: 0;
    background: linear-gradient(180deg, #000000d6, #00000000);
    border-bottom: 1px solid oklab(1 0 0 / 0.12);
  }

  .modal-tab {
    font-family: var(--font-condensed);
    font-size: 0.8125rem;
    font-weight: 400;
    letter-spacing: 0.12em;
    padding: 0.4rem 0.875rem;
    color: oklab(100% 0 0 / 0.55);
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition:
      color 0.15s,
      border-color 0.15s;
    text-transform: uppercase;
  }

  .modal-tab.active {
    color: oklab(100% 0 0);
    border-bottom-color: oklab(100% 0 0);
  }

  .modal-tab:hover:not(.active) {
    color: oklab(100% 0 0 / 0.75);
  }

  /* Tab label responsive visibility */
  .tab-label-mobile {
    display: none;
  }

  @media (max-width: 599px) {
    .tab-label-desktop {
      display: none;
    }
    .tab-label-mobile {
      display: inline;
    }
  }

  /* ── Body ─────────────────────────────────────────────────────────────────── */
  .modal-body {
    overflow-y: auto;
    overflow-x: hidden;
    flex: 1;
    padding: 0rem 0.85rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* ── Tab pane & slide transitions ─────────────────────────────────────────── */
  .tab-pane {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* Slide left (going to a later tab) */
  .tab-slide-left-enter-active,
  .tab-slide-left-leave-active,
  .tab-slide-right-enter-active,
  .tab-slide-right-leave-active {
    transition:
      transform 0.1s cubic-bezier(0.4, 0, 0.2, 1),
      opacity 0.08s ease;
    will-change: transform, opacity;
  }

  .tab-slide-left-enter-from {
    transform: translateX(16px);
    opacity: 0;
  }
  .tab-slide-left-leave-to {
    transform: translateX(-16px);
    opacity: 0;
  }

  .tab-slide-right-enter-from {
    transform: translateX(-16px);
    opacity: 0;
  }
  .tab-slide-right-leave-to {
    transform: translateX(16px);
    opacity: 0;
  }

  /* ── Skeleton ─────────────────────────────────────────────────────────────── */
  .skeleton-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.25rem 0;
  }

  .skeleton-row {
    height: 1.75rem;
    border-radius: 0.25rem;
    background: oklab(100% 0 0 / 0.05);
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
    padding: 0.625rem 0.875rem;
    border-radius: 0.375rem;
    background: oklab(30.8% 0.072 0.028 / 0.3);
    border: 1px solid oklab(68.5% 0.13 0.048 / 0.2);
    font-size: 0.875rem;
    font-weight: 100;
    color: oklab(75.8% 0.107 0.04);
  }

  /* ── Section ──────────────────────────────────────────────────────────────── */
  .section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .section-title {
    font-size: 0.6875rem;
    font-weight: 400;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: oklab(100% 0 0);
    margin: 0;
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  .section-subtitle {
    font-size: 0.6875rem;
    font-weight: 100;
    letter-spacing: 0.06em;
    text-transform: none;
    color: oklab(100% 0 0 / 0.6);
  }

  /* ── Win probability ──────────────────────────────────────────────────────── */
  .prob-bar-wrap {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .prob-bar {
    flex: 1;
    height: 0.375rem;
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
    background: oklab(75% 0 0);
  }
  .prob-fill-draw {
    background: oklab(100% 0 0 / 0.15);
  }
  .prob-fill-away {
    background: oklab(45% 0 0);
  }

  .prob-label {
    display: flex;
    align-items: center;
    gap: 0.2rem;
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
    font-weight: 400;
    color: oklab(100% 0 0);
    letter-spacing: 0.09em;
  }

  .prob-pct {
    font-size: 0.9rem;
    font-weight: 400;
    color: oklab(100% 0 0);
  }

  /* ── Shared: alternating row stripe ──────────────────────────────────────── */
  .row-stripe {
    background: oklab(100% 0 0 / 0.035);
  }

  /* ── Stats table: [home-val centered] [label] [away-val centered] ─────────── */
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

  .stats-th-center {
    /* empty center column — auto width, no content */
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

  .stats-num-hi {
    /* winner is same white — could add subtle highlight if desired */
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

  /* ── Leaders table: [name flush-right] [home-val] [cat] [away-val] [name flush-left] ── */
  .leaders-table {
    display: flex;
    flex-direction: column;
  }

  /* 5-column grid: name | home-val | category | away-val | name */
  .leaders-head {
    display: grid;
    grid-template-columns: 1fr 2.5rem 5rem 2.5rem 1fr;
    align-items: center;
    padding: 0.2rem 0 0.4rem;
    border-bottom: 1px solid oklab(100% 0 0 / 0.1);
    margin-bottom: 0.1rem;
  }

  @media (max-width: 420px) {
    .leaders-head {
      grid-template-columns: 1fr 2rem 3.5rem 2rem 1fr;
    }
  }

  .leaders-th {
    font-size: var(--modal-copy-size);
    font-weight: 400;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: oklab(100% 0 0 / 0.85);
  }

  /* Home header: [logo] [name] flush-right */
  .leaders-th-home {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    justify-content: flex-end;
    grid-column: 1;
  }

  /* Away header: [logo] [name] flush-left */
  .leaders-th-away {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    justify-content: flex-start;
    grid-column: 5;
  }

  .leaders-th-center {
    /* empty center cell in header */
  }

  .leaders-head-logo {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Shared logo size for Stats and Leaders tab headers */
  .head-logo {
    width: 1.375rem;
    height: 1.375rem;
    object-fit: contain;
    flex-shrink: 0;
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

  /* Player name — home side flush right */
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

  /* Numeric value — centered in its column */
  .leaders-val {
    font-size: var(--modal-copy-size);
    font-weight: 300;
    color: oklab(100% 0 0);
    letter-spacing: 0.02em;
    text-align: center;
  }

  /* Category label — center column */
  .leaders-cat-col {
    font-size: var(--modal-copy-size);
    font-weight: 100;
    color: oklab(100% 0 0 / 1);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    text-align: center;
    padding: 0 0.25rem;
  }

  /* ── Squads table: [home-player flush-right] [pos] [away-player flush-left] ── */
  .squads-table {
    display: flex;
    flex-direction: column;
  }

  .squads-head {
    display: grid;
    grid-template-columns: 1fr 3.5rem 1fr;
    align-items: baseline;
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

  .squads-th-center {
    /* empty */
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

  /* Home player: jersey + name flush-right */
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

  /* ── Head-to-head (fixtures-style layout) ────────────────────────────────── */
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

  /* date stacked above home | score | away */
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

  .h2h-fx-date {
    grid-area: date;
    text-align: center;
    padding-right: 0;
    padding-bottom: 0.15rem;
  }

  .h2h-fx-home {
    grid-area: home;
    justify-content: center;
    padding-right: 0;
  }

  .h2h-fx-center {
    grid-area: center;
  }

  .h2h-fx-away {
    grid-area: away;
    justify-content: center;
    padding-left: 0;
  }

  @media (max-width: 599px) {
    .h2h-fx-row {
      grid-template-columns: 1fr 3.5rem 1fr;
      grid-template-rows: auto auto;
      grid-template-areas:
        'date date date'
        'home center away';
      padding: 0.3rem 0;
    }

    .h2h-fx-date {
      grid-area: date;
      text-align: center;
      padding-right: 0;
      padding-bottom: 0.15rem;
    }

    .h2h-fx-home {
      grid-area: home;
      justify-content: center;
      padding-right: 0;
    }

    .h2h-fx-center {
      grid-area: center;
    }

    .h2h-fx-away {
      grid-area: away;
      justify-content: center;
      padding-left: 0;
    }
  }

  .h2h-fx-date {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 0.3em;
    letter-spacing: 0.02em;
    white-space: nowrap;
    padding-right: 0;
  }

  .h2h-fx-date-weekday {
    font-size: var(--modal-copy-size);
    font-weight: 200;
    color: oklab(100% 0 0 / 0.5);
    letter-spacing: 0.02em;
    line-height: 1.2;
  }

  .h2h-fx-date-md {
    font-size: var(--modal-copy-size);
    font-weight: 200;
    color: oklab(100% 0 0 / 0.85);
    letter-spacing: 0.02em;
    line-height: 1.2;
  }

  .h2h-fx-home {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    min-width: 0;
    overflow: hidden;
    justify-content: flex-end;
    padding-right: 0.4rem;
  }

  .h2h-fx-away {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    min-width: 0;
    overflow: hidden;
    justify-content: flex-start;
    padding-left: 0.4rem;
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

  /* Full name on desktop, abbreviation on mobile */
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

  .h2h-fx-center {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
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

  /* Score colors: white = winner, muted = loser or draw */
  .h2h-win {
    color: oklab(100% 0 0);
  }
  .h2h-loss {
    color: oklab(100% 0 0 / 0.45);
  }
  .h2h-draw {
    color: oklab(100% 0 0 / 0.45);
  }

  /* ── Squads ───────────────────────────────────────────────────────────────── */
  .squads-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  @media (max-width: 480px) {
    .squads-grid {
      grid-template-columns: 1fr;
    }
  }

  .squad-col {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .squad-team-header {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    margin-bottom: 0.25rem;
  }

  .squad-logo {
    width: 1.25rem;
    height: 1.25rem;
    object-fit: contain;
  }

  .squad-team-name {
    font-size: var(--modal-copy-size);
    font-weight: 400;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: oklab(100% 0 0);
  }

  .squad-list {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .squad-player {
    display: grid;
    grid-template-columns: 1.375rem 1.625rem 1fr 1rem;
    align-items: center;
    gap: 0.3rem;
    padding: 0.15rem 0.3rem;
    border-radius: 0.2rem;
    font-size: 0.8rem;
    letter-spacing: 0.04em;
    min-height: 1.5rem;
  }

  .player-starter {
    background: oklab(100% 0 0 / 0.03);
  }
  .player-sub {
    background: oklab(100% 0 0 / 0.03);
    opacity: 0.6;
  }
  .player-subbed-in,
  .player-subbed-out {
    opacity: 1;
  }

  .player-jersey {
    font-size: 0.7rem;
    font-weight: 400;
    color: oklab(100% 0 0);
    text-align: right;
    letter-spacing: 0.04em;
  }

  .player-pos {
    font-size: 0.575rem;
    font-weight: 400;
    letter-spacing: 0.09em;
    color: oklab(100% 0 0);
    text-align: center;
    background: oklab(100% 0 0 / 0.05);
    border-radius: 0.15rem;
    padding: 0.05rem 0.15rem;
  }

  .player-name {
    font-size: 0.825rem;
    font-weight: 100;
    color: oklab(100% 0 0);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: 0.05em;
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

  /* ── Clubs ────────────────────────────────────────────────────────────────── */
  .clubs-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  @media (max-width: 540px) {
    .clubs-grid {
      grid-template-columns: 1fr;
    }
  }

  .club-card {
    background: oklab(100% 0 0 / 0.03);
    border: 1px solid oklab(100% 0 0 / 0.06);
    border-radius: 0.375rem;
    padding: 0.875rem 0.75rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    text-align: center;
  }

  .club-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.375rem;
  }

  .club-logo {
    width: 3.5rem;
    height: 3.5rem;
    object-fit: contain;
  }

  .club-swatch {
    width: 3rem;
    height: 3rem;
    border-radius: 0.375rem;
  }

  .club-title-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
  }

  .club-name {
    font-size: 1rem;
    font-weight: 400;
    color: oklab(100% 0 0);
    margin: 0;
    line-height: 1.1;
    letter-spacing: 0.04em;
  }

  .club-founded {
    font-size: 0.7rem;
    color: oklab(100% 0 0);
    font-weight: 100;
    letter-spacing: 0.09em;
  }

  .club-detail {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.05rem;
    width: 100%;
  }

  .club-detail-label {
    font-size: 0.575rem;
    font-weight: 400;
    letter-spacing: 0.17em;
    text-transform: uppercase;
    color: oklab(100% 0 0);
  }

  .club-detail-val {
    font-size: 0.825rem;
    color: oklab(100% 0 0);
    font-weight: 100;
    letter-spacing: 0.05em;
  }

  .club-pts {
    color: oklab(100% 0 0 / 0.65);
    font-size: 0.775rem;
  }

  .club-bio {
    font-size: 0.8rem;
    font-weight: 100;
    color: oklab(100% 0 0);
    line-height: 1.55;
    margin: 0;
    letter-spacing: 0.04em;
  }

  .club-bio-empty {
    opacity: 0.5;
    font-style: italic;
  }

  /* ── Responsive team name: short on >425px, abbrev on ≤425px ─────────────── */
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

  /* ── No data ──────────────────────────────────────────────────────────────── */
  .no-data {
    font-size: var(--modal-copy-size);
    font-weight: 100;
    color: oklab(100% 0 0);
    text-align: center;
    padding: 1.25rem 0;
    letter-spacing: 0.06em;
  }
</style>
