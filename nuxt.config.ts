import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',

  future: {
    compatibilityVersion: 4,
  },

  vite: {
    plugins: [tailwindcss()],
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
          content: 'Live MLS match scores and schedule for today',
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
