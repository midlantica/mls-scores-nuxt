<script setup lang="ts">
  defineProps<{ showScoreLegend?: boolean }>()
</script>

<template>
  <footer class="footer">
    <span class="footer-info">
      <span v-if="showScoreLegend"
        >🔥 both winning &amp; close · 🎲 derby or equal underdogs · </span
      >Live data via ESPN API
    </span>
    <span class="footer-disclaimer"
      >This is an unofficial fan site and is not affiliated with, endorsed by,
      or sponsored by MLS. The MLS name, crest, and all team logos are
      trademarks of their respective owners and are used here for informational
      and fan purposes only.</span
    >
  </footer>
</template>

<style scoped>
  .footer {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-text-secondary);
    color: var(--color-text-secondary);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.375rem;
  }

  .footer-info {
    font-size: 0.75rem;
  }

  .footer-disclaimer {
    font-size: 0.6rem;
  }
</style>
