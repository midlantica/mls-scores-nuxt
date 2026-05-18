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
        // Open Graph & Twitter — injected at top of <head> via server/plugins/og-head.ts
        // (Nitro render hook ensures they appear before inline <style> blocks for scrapers)
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://mlsscores.netlify.app/' },
        { property: 'og:title', content: 'MLS Live Scores' },
        {
          property: 'og:description',
          content:
            'Live MLS scores, schedule, and standings — updated in real time.',
        },
        {
          property: 'og:image',
          content: 'https://mlsscores.netlify.app/og-image.png?v=4',
        },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:type', content: 'image/png' },
        { property: 'og:site_name', content: 'MLS Scores' },
        // Twitter / X Card
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'MLS Live Scores' },
        {
          name: 'twitter:description',
          content:
            'Live MLS scores, schedule, and standings — updated in real time.',
        },
        {
          name: 'twitter:image',
          content: 'https://mlsscores.netlify.app/og-image.png?v=4',
        },
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
