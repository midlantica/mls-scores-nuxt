<script setup lang="ts">
  import { useAnalytics } from '~/composables/useAnalytics'

  const route = useRoute()
  const { trackPageview } = useAnalytics()

  // Track SPA route changes for analytics.
  // We fire-and-forget a POST to /api/analytics/pageview so the server can
  // record which client-side routes (scores, standings, stats, team, game)
  // are actually being visited — the server middleware only ever sees '/'.
  // Modal opens (openGameDetail, openTeamModal) use history.replaceState/pushState
  // directly and bypass Vue Router, so they call trackPageview() themselves
  // from index.vue rather than relying on this watcher.

  // Track SPA navigations only — skip the initial '/' load since the server
  // middleware already records that request. We only want to capture the
  // client-side route changes that the server never sees.
  let initialLoad = true

  onMounted(() => {
    // If the user landed directly on a non-root path (e.g. /standings),
    // the server middleware recorded '/' (the SSR entry), not the actual path.
    // So we track it here too.
    if (route.path !== '/') {
      trackPageview(route.path)
    }
    initialLoad = false
  })

  // Track subsequent Vue Router navigations (tab switches: /standings, /stats, etc.)
  // Modal opens bypass Vue Router and are tracked directly in index.vue.
  watch(
    () => route.path,
    (path) => {
      if (initialLoad) return
      trackPageview(path)
    }
  )
</script>

<template>
  <div class="min-h-screen text-gray-100">
    <NuxtPage />
  </div>
</template>
