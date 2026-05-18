import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',

  future: {
    compatibilityVersion: 4,
  },

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['culori'],
    },
  },

  css: ['~/assets/css/main.css'],

  // Use the netlify preset so server/api routes become Netlify Functions
  nitro: {
    preset: 'netlify',
  },

  // SSR enabled for Netlify Functions; hydration mismatches suppressed via client-only wrappers
  ssr: true,

  app: {
    head: {
      title: 'MLS Live Scores',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Live MLS scores, schedule, and standings — updated in real time.',
        },
        // OG & Twitter tags are injected at the very top of <head> by
        // server/plugins/og-head.ts (Nitro render hook) so scrapers see them
        // before any inline <style> blocks. Do NOT add them here too.
      ],
      link: [
        {
          rel: 'icon',
          href: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚽</text></svg>',
        },
      ],
    },
  },
})
