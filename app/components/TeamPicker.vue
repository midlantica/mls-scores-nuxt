<script setup lang="ts">
  import {
    useMyTeam,
    TEAM_LIST,
    TEAM_SHORT_NAME,
    TEAM_ABBREV,
  } from '~/composables/useMyTeam'

  const emit = defineEmits<{ 'open-modal': [] }>()

  const { selectedTeam, logoUrl, selectTeam } = useMyTeam()

  const open = ref(false)
  const wrapRef = ref<HTMLElement | null>(null)

  function onMainClick() {
    if (selectedTeam.value) {
      emit('open-modal')
    } else {
      open.value = !open.value
    }
  }

  function choose(name: string | null) {
    selectTeam(name)
    open.value = false
  }

  onMounted(() => {
    document.addEventListener('click', (e) => {
      if (
        open.value &&
        wrapRef.value &&
        !wrapRef.value.contains(e.target as Node)
      ) {
        open.value = false
      }
    })
  })
</script>

<template>
  <div ref="wrapRef" class="my-team-wrap">
    <!-- Main button: opens modal if team set, else opens dropdown -->
    <button
      class="my-team-btn"
      :class="{ 'has-team': !!selectedTeam }"
      :title="selectedTeam ? `My Team: ${selectedTeam}` : 'Choose your team'"
      @click="onMainClick"
    >
      <span class="team-logo-slot">
        <img
          v-if="logoUrl"
          :src="logoUrl"
          :alt="selectedTeam ?? ''"
          class="team-logo-img"
        />
        <span v-else class="team-logo-placeholder">?</span>
      </span>
      <span class="my-team-label">
        <span class="label-abbrev">{{
          selectedTeam ? (TEAM_ABBREV[selectedTeam] ?? selectedTeam) : 'My Team'
        }}</span>
        <span class="label-short">{{
          selectedTeam
            ? (TEAM_SHORT_NAME[selectedTeam] ?? selectedTeam)
            : 'My Team'
        }}</span>
      </span>
    </button>

    <!-- Caret: always opens the dropdown -->
    <button
      class="my-team-caret-btn"
      :class="{ 'has-team': !!selectedTeam }"
      title="Change team"
      aria-label="Choose team"
      @click.stop="open = !open"
    >
      <span class="my-team-caret">▾</span>
    </button>

    <!-- Dropdown -->
    <div v-if="open" class="team-dropdown">
      <div class="team-dropdown-inner">
        <button class="team-option team-option-clear" @click="choose(null)">
          — No team —
        </button>
        <button
          v-for="team in TEAM_LIST"
          :key="team"
          class="team-option"
          :class="{ selected: selectedTeam === team }"
          @click="choose(team)"
        >
          {{ team }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .my-team-wrap {
    position: relative;
    display: flex;
    align-items: stretch;
    gap: 2px;
    margin-bottom: 6px;
  }

  .my-team-btn {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.2rem 0.4rem;
    border-radius: 0.3rem 0 0 0.3rem;
    border: 1px solid oklab(100% 0 0 / 0.1);
    border-right: none;
    background: var(--color-theme-900);
    cursor: pointer;
    transition: background 0.15s;
    white-space: nowrap;
  }

  .my-team-btn:hover {
    background: color-mix(in oklab, var(--color-theme-900) 80%, white);
  }

  .team-logo-slot {
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .team-logo-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 0.2rem;
    background: var(--color-theme-800);
    font-size: 0.85rem;
    font-weight: 400;
    color: var(--color-theme-300);
  }

  .team-logo-img {
    width: 1.5rem;
    height: 1.5rem;
    object-fit: contain;
    border-radius: 0.15rem;
  }

  .my-team-label {
    font-family: var(--font-condensed);
    font-size: 0.75rem;
    font-weight: 100;
    letter-spacing: 0.04em;
    color: var(--color-theme-300);
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Below 375px: show short abbreviation only */
  .label-abbrev {
    display: inline;
  }

  .label-short {
    display: none;
  }

  /* 375px+: show medium short name instead */
  @media (min-width: 375px) {
    .label-abbrev {
      display: none;
    }

    .label-short {
      display: inline;
    }
  }

  .my-team-caret-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.2rem 0.3rem;
    border-radius: 0 0.3rem 0.3rem 0;
    border: 1px solid oklab(100% 0 0 / 0.1);
    background: var(--color-theme-900);
    cursor: pointer;
    transition: background 0.15s;
    flex-shrink: 0;
  }

  .my-team-caret-btn:hover {
    background: color-mix(in oklab, var(--color-theme-900) 80%, white);
  }

  .my-team-caret {
    font-size: 1.1rem;
    color: var(--color-theme-400);
    line-height: 1;
    margin-top: -0.1rem;
  }

  .team-dropdown {
    position: absolute;
    top: calc(100% + 0.375rem);
    right: 0;
    z-index: 100;
    background: oklch(18% 0.025 260);
    border: 1px solid var(--color-theme-800);
    border-radius: 0.5rem;
    box-shadow: 0 8px 24px oklab(0% 0 0 / 0.5);
    max-height: 22rem;
    overflow: hidden;
    width: max-content;
  }

  .team-dropdown-inner {
    overflow-y: auto;
    max-height: 22rem;
    padding: 0.25rem 0;
  }

  .team-option {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.4rem 0.875rem;
    font-size: 0.8125rem;
    font-weight: 400;
    color: oklab(88% 0 0);
    background: transparent;
    border: none;
    cursor: pointer;
    transition:
      background 0.1s,
      color 0.1s;
    white-space: nowrap;
  }

  .team-option:hover {
    background: var(--color-theme-900);
    color: var(--color-theme-300);
  }

  .team-option.selected {
    color: var(--color-theme-400);
    background: var(--color-theme-950);
    font-weight: 600;
  }

  .team-option-clear {
    font-style: italic;
    opacity: 0.6;
    border-bottom: 1px solid oklab(100% 0 0 / 0.06);
    margin-bottom: 0.125rem;
  }

  .team-option-clear:hover {
    opacity: 1;
  }
</style>
