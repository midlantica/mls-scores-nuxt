// composables/useAnalytics.ts
// Thin wrapper around the analytics pageview POST.
// Used by app.vue (route watcher) and index.vue (modal opens).

export function useAnalytics() {
  function trackPageview(path: string) {
    // Strip query strings — we only care about the path, not the specific game/team
    const cleanPath = path.split('?')[0] || '/'
    const url = '/api/analytics/pageview'
    const body = JSON.stringify({ path: cleanPath })
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))
    } else {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {})
    }
  }

  return { trackPageview }
}
