<script setup lang="ts">
  import { useMyTeam } from '~/composables/useMyTeam'

  const emit = defineEmits<{
    'go-home': []
    'open-team-modal': []
  }>()

  const { selectedTeam } = useMyTeam()
</script>

<template>
  <!-- ── Site header ──────────────────────────────────────────────────────── -->
  <header class="header">
    <div
      class="header-left"
      role="button"
      style="cursor: pointer"
      @click="emit('go-home')"
    >
      <MlsLogo
        class="mls-logo"
        :class="{ 'mls-logo--themed': !!selectedTeam }"
      />
      <h1 class="site-title">MLS Fire</h1>
      <img src="/mlsfire-ball.svg" alt="" class="fire-ball" />
    </div>

    <div class="header-right">
      <TzPicker />
    </div>
  </header>
</template>

<style scoped>
  /* ── Header ─────────────────────────────────────────────────────────────── */
  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    gap: 0.5rem;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    user-select: none;
    min-width: 0;
    flex-shrink: 1;
    margin-top: 0.1rem;
    margin-bottom: -0.3rem;
  }

  .mls-logo {
    width: 1.6rem;
    height: auto;
    flex-shrink: 0;
    color: var(--color-theme-300);
    transition: color 0.3s;
  }

  .site-title {
    font-size: 2rem;
    font-weight: 400;
    letter-spacing: 0.05em;
    color: var(--color-theme-300);
    cursor: pointer;
    user-select: none;
    transition: color 0.15s;
    line-height: normal;
  }

  .header-left:hover .site-title {
    color: var(--color-theme-200);
  }

  .fire-ball {
    width: 2.1rem;
    height: auto;
    flex-shrink: 0;
    margin-left: -0.15rem;
  }

  @media (max-width: 420px) {
    .header-left {
      margin-top: -0.1rem;
    }
    .mls-logo {
      width: 1.5rem;
      margin-top: 0.2rem;
      position: relative;
    }
    .site-title {
      font-size: 1.25rem;
    }
    .fire-ball {
      width: 1.5rem;
    }
  }

  /* ── Header right ───────────────────────────────────────────────────────── */
  .header-right {
    display: flex;
    align-items: flex-start;
    padding-top: 0.2rem;
  }
</style>
