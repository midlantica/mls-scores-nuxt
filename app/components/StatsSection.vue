<script setup lang="ts">
  import { useStats } from '~/composables/useStats'
  import { TEAM_LOGO } from '~/composables/useMyTeam'
  import { TEAM_COLORS } from '~/composables/useTeamColors'

  const emit = defineEmits<{ 'select-team': [team: string] }>()

  const { data, loading, error, loaded, fetchStats } = useStats()

  // ── Mobile tab state ──────────────────────────────────────────────────────
  type StatTab = 'goals' | 'assists' | 'accuratePasses' | 'saves' | 'cards'
  const statTab = ref<StatTab>('goals')

  const TABS: { key: StatTab; label: string }[] = [
    { key: 'goals', label: 'Goals' },
    { key: 'assists', label: 'Assists' },
    { key: 'accuratePasses', label: 'Passes' },
    { key: 'saves', label: 'Saves' },
    { key: 'cards', label: 'Cards' },
  ]

  // Cards sub-tab (mobile only)
  type CardTab = 'yellowCards' | 'redCards'
  const cardTab = ref<CardTab>('yellowCards')

  // For non-cards mobile tab: the active list
  const mobileLeaders = computed(() => {
    if (statTab.value === 'cards') return []
    return data.value?.[statTab.value] ?? []
  })

  const mobileStatLabel = computed(() => {
    const map: Record<StatTab, string> = {
      goals: 'Goals',
      assists: 'Assists',
      accuratePasses: 'Passes',
      saves: 'Saves',
      cards: '',
    }
    return map[statTab.value]
  })

  onMounted(() => {
    if (!loaded.value) fetchStats()
  })

  function initials(name: string): string {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  function avatarBg(team: string): string {
    const hex = TEAM_COLORS[team]
    return hex ? `${hex}40` : 'oklab(100% 0 0 / 0.08)'
  }

  function onImgError(e: Event) {
    const img = e.target as HTMLImageElement
    img.style.display = 'none'
    const fallback = img.nextElementSibling as HTMLElement | null
    if (fallback) fallback.style.display = 'flex'
  }
</script>

<template>
  <div class="stats-section">
    <!-- ── Loading skeleton ──────────────────────────────────────────────── -->
    <div v-if="loading" class="skeleton-wrap">
      <div class="skeleton-tabs" />
      <div v-for="i in 10" :key="i" class="skeleton-row" />
    </div>

    <!-- ── Error ─────────────────────────────────────────────────────────── -->
    <div v-else-if="error" class="error-box">{{ error }}</div>

    <!-- ── Content ───────────────────────────────────────────────────────── -->
    <template v-else-if="data">
      <!-- ════════════════════════════════════════════════════════════════════
           DESKTOP: side-by-side panels (hidden on mobile)
           ════════════════════════════════════════════════════════════════════ -->
      <div class="desktop-view">
        <!-- Row 1: Goals | Assists -->
        <div class="panel-row">
          <div class="panel">
            <div class="col-header">
              <span class="col-stat-label">Goals</span>
            </div>
            <ol class="leaders-list">
              <li
                v-for="player in data.goals"
                :key="player.athleteId"
                class="leader-row"
              >
                <span class="rank">{{ player.rank }}</span>
                <div class="headshot-wrap">
                  <img
                    v-if="player.headshot"
                    :src="player.headshot"
                    :alt="player.displayName"
                    class="headshot-img"
                    loading="lazy"
                    @error="onImgError($event)"
                  />
                  <div
                    v-if="!player.headshot"
                    class="headshot-fallback"
                    :style="{ background: avatarBg(player.team) }"
                  >
                    {{ initials(player.displayName) }}
                  </div>
                  <div
                    v-else
                    class="headshot-fallback"
                    :style="{ background: avatarBg(player.team) }"
                    style="display: none"
                  >
                    {{ initials(player.displayName) }}
                  </div>
                </div>
                <div class="player-info">
                  <span class="player-name">{{ player.displayName }}</span>
                  <span class="player-team">
                    <img
                      v-if="TEAM_LOGO[player.team]"
                      :src="TEAM_LOGO[player.team]"
                      :alt="player.team"
                      class="team-logo"
                    />
                    <button
                      class="team-link"
                      @click="emit('select-team', player.team)"
                    >
                      {{ player.team }}
                    </button>
                  </span>
                </div>
                <span class="stat-value">{{ player.value }}</span>
              </li>
            </ol>
          </div>

          <div class="panel">
            <div class="col-header">
              <span class="col-stat-label">Assists</span>
            </div>
            <ol class="leaders-list">
              <li
                v-for="player in data.assists"
                :key="player.athleteId"
                class="leader-row"
              >
                <span class="rank">{{ player.rank }}</span>
                <div class="headshot-wrap">
                  <img
                    v-if="player.headshot"
                    :src="player.headshot"
                    :alt="player.displayName"
                    class="headshot-img"
                    loading="lazy"
                    @error="onImgError($event)"
                  />
                  <div
                    v-if="!player.headshot"
                    class="headshot-fallback"
                    :style="{ background: avatarBg(player.team) }"
                  >
                    {{ initials(player.displayName) }}
                  </div>
                  <div
                    v-else
                    class="headshot-fallback"
                    :style="{ background: avatarBg(player.team) }"
                    style="display: none"
                  >
                    {{ initials(player.displayName) }}
                  </div>
                </div>
                <div class="player-info">
                  <span class="player-name">{{ player.displayName }}</span>
                  <span class="player-team">
                    <img
                      v-if="TEAM_LOGO[player.team]"
                      :src="TEAM_LOGO[player.team]"
                      :alt="player.team"
                      class="team-logo"
                    />
                    <button
                      class="team-link"
                      @click="emit('select-team', player.team)"
                    >
                      {{ player.team }}
                    </button>
                  </span>
                </div>
                <span class="stat-value">{{ player.value }}</span>
              </li>
            </ol>
          </div>
        </div>

        <!-- Row 2: Passes | Saves -->
        <div class="panel-row">
          <div class="panel">
            <div class="col-header">
              <span class="col-stat-label">Accurate Passes</span>
            </div>
            <ol class="leaders-list">
              <li
                v-for="player in data.accuratePasses"
                :key="player.athleteId"
                class="leader-row"
              >
                <span class="rank">{{ player.rank }}</span>
                <div class="headshot-wrap">
                  <img
                    v-if="player.headshot"
                    :src="player.headshot"
                    :alt="player.displayName"
                    class="headshot-img"
                    loading="lazy"
                    @error="onImgError($event)"
                  />
                  <div
                    v-if="!player.headshot"
                    class="headshot-fallback"
                    :style="{ background: avatarBg(player.team) }"
                  >
                    {{ initials(player.displayName) }}
                  </div>
                  <div
                    v-else
                    class="headshot-fallback"
                    :style="{ background: avatarBg(player.team) }"
                    style="display: none"
                  >
                    {{ initials(player.displayName) }}
                  </div>
                </div>
                <div class="player-info">
                  <span class="player-name">{{ player.displayName }}</span>
                  <span class="player-team">
                    <img
                      v-if="TEAM_LOGO[player.team]"
                      :src="TEAM_LOGO[player.team]"
                      :alt="player.team"
                      class="team-logo"
                    />
                    <button
                      class="team-link"
                      @click="emit('select-team', player.team)"
                    >
                      {{ player.team }}
                    </button>
                  </span>
                </div>
                <span class="stat-value">{{ player.value }}</span>
              </li>
            </ol>
          </div>

          <div class="panel">
            <div class="col-header">
              <span class="col-stat-label">Saves</span>
            </div>
            <ol class="leaders-list">
              <li
                v-for="player in data.saves"
                :key="player.athleteId"
                class="leader-row"
              >
                <span class="rank">{{ player.rank }}</span>
                <div class="headshot-wrap">
                  <img
                    v-if="player.headshot"
                    :src="player.headshot"
                    :alt="player.displayName"
                    class="headshot-img"
                    loading="lazy"
                    @error="onImgError($event)"
                  />
                  <div
                    v-if="!player.headshot"
                    class="headshot-fallback"
                    :style="{ background: avatarBg(player.team) }"
                  >
                    {{ initials(player.displayName) }}
                  </div>
                  <div
                    v-else
                    class="headshot-fallback"
                    :style="{ background: avatarBg(player.team) }"
                    style="display: none"
                  >
                    {{ initials(player.displayName) }}
                  </div>
                </div>
                <div class="player-info">
                  <span class="player-name">{{ player.displayName }}</span>
                  <span class="player-team">
                    <img
                      v-if="TEAM_LOGO[player.team]"
                      :src="TEAM_LOGO[player.team]"
                      :alt="player.team"
                      class="team-logo"
                    />
                    <button
                      class="team-link"
                      @click="emit('select-team', player.team)"
                    >
                      {{ player.team }}
                    </button>
                  </span>
                </div>
                <span class="stat-value">{{ player.value }}</span>
              </li>
            </ol>
          </div>
        </div>

        <!-- Row 3: Yellow Cards | Red Cards -->
        <div class="panel-row">
          <div class="panel">
            <div class="col-header">
              <span class="col-stat-label">🟨 Yellow Cards</span>
            </div>
            <ol class="leaders-list">
              <li
                v-for="player in data.yellowCards"
                :key="player.athleteId"
                class="leader-row"
              >
                <span class="rank">{{ player.rank }}</span>
                <div class="headshot-wrap">
                  <img
                    v-if="player.headshot"
                    :src="player.headshot"
                    :alt="player.displayName"
                    class="headshot-img"
                    loading="lazy"
                    @error="onImgError($event)"
                  />
                  <div
                    v-if="!player.headshot"
                    class="headshot-fallback"
                    :style="{ background: avatarBg(player.team) }"
                  >
                    {{ initials(player.displayName) }}
                  </div>
                  <div
                    v-else
                    class="headshot-fallback"
                    :style="{ background: avatarBg(player.team) }"
                    style="display: none"
                  >
                    {{ initials(player.displayName) }}
                  </div>
                </div>
                <div class="player-info">
                  <span class="player-name">{{ player.displayName }}</span>
                  <span class="player-team">
                    <img
                      v-if="TEAM_LOGO[player.team]"
                      :src="TEAM_LOGO[player.team]"
                      :alt="player.team"
                      class="team-logo"
                    />
                    <button
                      class="team-link"
                      @click="emit('select-team', player.team)"
                    >
                      {{ player.team }}
                    </button>
                  </span>
                </div>
                <span class="stat-value">{{ player.value }}</span>
              </li>
            </ol>
          </div>

          <div class="panel">
            <div class="col-header">
              <span class="col-stat-label">🟥 Red Cards</span>
            </div>
            <ol class="leaders-list">
              <li
                v-for="player in data.redCards"
                :key="player.athleteId"
                class="leader-row"
              >
                <span class="rank">{{ player.rank }}</span>
                <div class="headshot-wrap">
                  <img
                    v-if="player.headshot"
                    :src="player.headshot"
                    :alt="player.displayName"
                    class="headshot-img"
                    loading="lazy"
                    @error="onImgError($event)"
                  />
                  <div
                    v-if="!player.headshot"
                    class="headshot-fallback"
                    :style="{ background: avatarBg(player.team) }"
                  >
                    {{ initials(player.displayName) }}
                  </div>
                  <div
                    v-else
                    class="headshot-fallback"
                    :style="{ background: avatarBg(player.team) }"
                    style="display: none"
                  >
                    {{ initials(player.displayName) }}
                  </div>
                </div>
                <div class="player-info">
                  <span class="player-name">{{ player.displayName }}</span>
                  <span class="player-team">
                    <img
                      v-if="TEAM_LOGO[player.team]"
                      :src="TEAM_LOGO[player.team]"
                      :alt="player.team"
                      class="team-logo"
                    />
                    <button
                      class="team-link"
                      @click="emit('select-team', player.team)"
                    >
                      {{ player.team }}
                    </button>
                  </span>
                </div>
                <span class="stat-value">{{ player.value }}</span>
              </li>
            </ol>
          </div>
        </div>
      </div>

      <!-- ════════════════════════════════════════════════════════════════════
           MOBILE: tabbed single column (hidden on desktop)
           ════════════════════════════════════════════════════════════════════ -->
      <div class="mobile-view">
        <!-- Tab bar -->
        <div class="stat-tabs" role="tablist">
          <button
            v-for="tab in TABS"
            :key="tab.key"
            class="stat-tab"
            :class="{ active: statTab === tab.key }"
            role="tab"
            :aria-selected="statTab === tab.key"
            @click="statTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Non-cards tabs -->
        <template v-if="statTab !== 'cards'">
          <div class="col-header">
            <span class="col-stat-label">{{ mobileStatLabel }}</span>
          </div>
          <ol class="leaders-list">
            <li
              v-for="player in mobileLeaders"
              :key="player.athleteId"
              class="leader-row"
            >
              <span class="rank">{{ player.rank }}</span>
              <div class="headshot-wrap">
                <img
                  v-if="player.headshot"
                  :src="player.headshot"
                  :alt="player.displayName"
                  class="headshot-img"
                  loading="lazy"
                  @error="onImgError($event)"
                />
                <div
                  v-if="!player.headshot"
                  class="headshot-fallback"
                  :style="{ background: avatarBg(player.team) }"
                >
                  {{ initials(player.displayName) }}
                </div>
                <div
                  v-else
                  class="headshot-fallback"
                  :style="{ background: avatarBg(player.team) }"
                  style="display: none"
                >
                  {{ initials(player.displayName) }}
                </div>
              </div>
              <div class="player-info">
                <span class="player-name">{{ player.displayName }}</span>
                <span class="player-team">
                  <img
                    v-if="TEAM_LOGO[player.team]"
                    :src="TEAM_LOGO[player.team]"
                    :alt="player.team"
                    class="team-logo"
                  />
                  <button
                    class="team-link"
                    @click="emit('select-team', player.team)"
                  >
                    {{ player.team }}
                  </button>
                </span>
              </div>
              <span class="stat-value">{{ player.value }}</span>
            </li>
          </ol>
        </template>

        <!-- Cards tab: sub-tabbed yellow / red -->
        <template v-else>
          <div class="card-subtabs" role="tablist">
            <button
              class="card-subtab"
              :class="{ active: cardTab === 'yellowCards' }"
              role="tab"
              :aria-selected="cardTab === 'yellowCards'"
              @click="cardTab = 'yellowCards'"
            >
              <span class="card-emoji">🟨</span><span>Yellow</span>
            </button>
            <button
              class="card-subtab"
              :class="{ active: cardTab === 'redCards' }"
              role="tab"
              :aria-selected="cardTab === 'redCards'"
              @click="cardTab = 'redCards'"
            >
              <span class="card-emoji">🟥</span><span>Red</span>
            </button>
          </div>
          <div class="col-header">
            <span class="col-stat-label">
              {{ cardTab === 'yellowCards' ? 'Yellow Cards' : 'Red Cards' }}
            </span>
          </div>
          <ol class="leaders-list">
            <li
              v-for="player in data[cardTab]"
              :key="player.athleteId"
              class="leader-row"
            >
              <span class="rank">{{ player.rank }}</span>
              <div class="headshot-wrap">
                <img
                  v-if="player.headshot"
                  :src="player.headshot"
                  :alt="player.displayName"
                  class="headshot-img"
                  loading="lazy"
                  @error="onImgError($event)"
                />
                <div
                  v-if="!player.headshot"
                  class="headshot-fallback"
                  :style="{ background: avatarBg(player.team) }"
                >
                  {{ initials(player.displayName) }}
                </div>
                <div
                  v-else
                  class="headshot-fallback"
                  :style="{ background: avatarBg(player.team) }"
                  style="display: none"
                >
                  {{ initials(player.displayName) }}
                </div>
              </div>
              <div class="player-info">
                <span class="player-name">{{ player.displayName }}</span>
                <span class="player-team">
                  <img
                    v-if="TEAM_LOGO[player.team]"
                    :src="TEAM_LOGO[player.team]"
                    :alt="player.team"
                    class="team-logo"
                  />
                  <button
                    class="team-link"
                    @click="emit('select-team', player.team)"
                  >
                    {{ player.team }}
                  </button>
                </span>
              </div>
              <span class="stat-value">{{ player.value }}</span>
            </li>
          </ol>
        </template>
      </div>
    </template>

    <!-- ── Empty ─────────────────────────────────────────────────────────── -->
    <div v-else class="empty-state">No stats available.</div>
  </div>
</template>

<style scoped>
  .stats-section {
    padding-top: 0;
  }

  /* ── Desktop: side-by-side panel rows ────────────────────────────────────── */
  .desktop-view {
    display: none;
  }

  .mobile-view {
    display: block;
  }

  @media (min-width: 640px) {
    .desktop-view {
      display: flex;
      flex-direction: column;
      gap: 2.5rem;
    }
    .mobile-view {
      display: none;
    }
  }

  .panel-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }

  .panel {
    min-width: 0;
  }

  /* ── Mobile tab bar ───────────────────────────────────────────────────────── */
  .stat-tabs {
    display: flex;
    gap: 0;
    border-bottom: 1px solid oklab(100% 0 0 / 0.1);
    margin-bottom: 0;
  }

  .stat-tab {
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-size: 0.9375rem;
    font-weight: 400;
    letter-spacing: 0.02em;
    padding: 0.4rem 1rem 0.5rem;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition:
      color 0.15s,
      border-color 0.15s;
    position: relative;
    bottom: -1px;
    white-space: nowrap;
  }

  @media (max-width: 360px) {
    .stat-tab {
      padding: 0.4rem 0.35rem 0.5rem;
    }
  }

  .stat-tab:hover:not(.active) {
    color: var(--color-text-primary);
  }

  .stat-tab.active {
    color: var(--color-text-primary);
    border-bottom-color: var(--color-theme-400, #60a5fa);
    font-weight: 600;
  }

  /* ── Column header ────────────────────────────────────────────────────────── */
  .col-header {
    display: flex;
    align-items: center;
    padding: 0.5rem 0.5rem 0.375rem;
    border-bottom: 1px solid oklab(100% 0 0 / 0.07);
  }

  .col-stat-label {
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-size: 1.2rem;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: oklab(0.76 0 0);
  }

  /* ── Leaders list ─────────────────────────────────────────────────────────── */
  .leaders-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .leader-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.5rem;
    border-bottom: 1px solid oklab(100% 0 0 / 0.05);
    transition: background 0.12s;
  }

  .leader-row:hover {
    background: oklab(100% 0 0 / 0.04);
  }

  .rank {
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-size: 1rem;
    font-weight: 500;
    color: oklab(70% 0 0);
    width: 1.25rem;
    text-align: center;
    flex-shrink: 0;
  }

  /* ── Headshot ─────────────────────────────────────────────────────────────── */
  .headshot-wrap {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
    background: oklab(100% 0 0 / 0.08);
    position: relative;
  }

  .headshot-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
    display: block;
  }

  .headshot-fallback {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: oklab(90% 0 0);
  }

  /* ── Player info ──────────────────────────────────────────────────────────── */
  .player-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .player-name {
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-size: 1rem;
    font-weight: 400;
    letter-spacing: 0.02em;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .player-team {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .team-logo {
    width: 0.9rem;
    height: 0.9rem;
    object-fit: contain;
    flex-shrink: 0;
    opacity: 0.85;
  }

  /* Team name as a button that looks like a link */
  .team-link {
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-size: 0.775rem;
    font-weight: 400;
    letter-spacing: 0.03em;
    color: oklab(78% 0 0);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    text-decoration: none;
    text-align: left;
  }

  .team-link:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
    text-decoration-color: oklab(78% 0 0);
  }

  /* ── Stat value ───────────────────────────────────────────────────────────── */
  .stat-value {
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-size: 1.375rem;
    font-weight: 400;
    letter-spacing: 0.01em;
    color: var(--color-text-primary);
    flex-shrink: 0;
    min-width: 2rem;
    text-align: right;
  }

  /* ── Cards sub-tabs (mobile) ──────────────────────────────────────────────── */
  .card-subtabs {
    display: flex;
    gap: 0;
    border-bottom: 1px solid oklab(100% 0 0 / 0.1);
    margin-bottom: 0;
  }

  .card-subtab {
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-size: 0.85rem;
    font-weight: 400;
    letter-spacing: 0.02em;
    padding: 0.4rem 0.6rem 0.5rem;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition:
      color 0.15s,
      border-color 0.15s;
    position: relative;
    bottom: -1px;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }

  .card-emoji {
    font-size: 0.8rem;
    line-height: 1;
  }

  .card-subtab:hover:not(.active) {
    color: var(--color-text-primary);
  }

  .card-subtab.active {
    color: var(--color-text-primary);
    border-bottom-color: var(--color-theme-400, #60a5fa);
    font-weight: 600;
  }

  /* ── Skeleton ─────────────────────────────────────────────────────────────── */
  .skeleton-wrap {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .skeleton-tabs {
    height: 2.25rem;
    background: oklab(100% 0 0 / 0.04);
    margin-bottom: 0.5rem;
  }

  .skeleton-row {
    height: 3.25rem;
    border-bottom: 1px solid oklab(100% 0 0 / 0.05);
    background: oklab(100% 0 0 / 0.03);
    animation: pulse 1.5s ease-in-out infinite;
  }

  .skeleton-row:nth-child(odd) {
    animation-delay: 0.15s;
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

  /* ── Error / empty ────────────────────────────────────────────────────────── */
  .error-box {
    margin-top: 1rem;
    border-radius: 0.5rem;
    background: oklab(30.8% 0.072 0.028 / 0.3);
    border: 1px solid oklab(68.5% 0.13 0.048 / 0.2);
    padding: 0.625rem 1rem;
    font-size: 0.75rem;
    color: oklab(75.8% 0.107 0.04);
  }

  .empty-state {
    color: var(--color-text-tertiary);
    font-size: 0.875rem;
    padding: 2rem 0;
    text-align: center;
  }
</style>
