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
    server: {
      // Auto-open the browser when the dev server starts
      open: true,
      hmr: {
        // Disable the intrusive full-screen error overlay; check the console instead
        overlay: false,
      },
    },
    build: {
      // Generate source maps without linking them in the browser —
      // safe for production and compatible with error-tracking tools like Sentry
      sourcemap: 'hidden',
    },
  },

  css: ['~/assets/css/main.css', '~/assets/css/scrollbar.css'],

  // Use the netlify preset so server/api routes become Netlify Functions
  nitro: {
    preset: 'netlify',
  },

  // SSR enabled for Netlify Functions; hydration mismatches suppressed via client-only wrappers
  ssr: true,

  app: {
    head: {
      title: 'MLS Fire — Live Scores',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Live MLS scores, schedule, and standings — updated in real time.',
        },
        // Open Graph — tagPriority 'critical' forces these before inline styles/scripts
        { property: 'og:type', content: 'website', tagPriority: 'critical' },
        {
          property: 'og:url',
          content: 'https://mlsfire.net/',
          tagPriority: 'critical',
        },
        {
          property: 'og:title',
          content: 'MLS Fire — Live Scores',
          tagPriority: 'critical',
        },
        {
          property: 'og:description',
          content:
            'Live MLS scores, schedule, and standings — updated in real time.',
          tagPriority: 'critical',
        },
        {
          property: 'og:image',
          content: 'https://mlsfire.net/og-image.png?v=4',
          tagPriority: 'critical',
        },
        {
          property: 'og:image:width',
          content: '1200',
          tagPriority: 'critical',
        },
        {
          property: 'og:image:height',
          content: '630',
          tagPriority: 'critical',
        },
        {
          property: 'og:image:type',
          content: 'image/png',
          tagPriority: 'critical',
        },
        {
          property: 'og:site_name',
          content: 'MLS Fire',
          tagPriority: 'critical',
        },
        // Twitter / X Card
        {
          name: 'twitter:card',
          content: 'summary_large_image',
          tagPriority: 'critical',
        },
        {
          name: 'twitter:title',
          content: 'MLS Fire — Live Scores',
          tagPriority: 'critical',
        },
        {
          name: 'twitter:description',
          content:
            'Live MLS scores, schedule, and standings — updated in real time.',
          tagPriority: 'critical',
        },
        {
          name: 'twitter:image',
          content: 'https://mlsfire.net/og-image.png?v=4',
          tagPriority: 'critical',
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

  devtools: {
    enabled: true,
  },
})
