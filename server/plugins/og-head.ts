/**
 * Nitro render hook: inject OG / Twitter meta tags at the very top of <head>
 * so that Facebook and Twitter scrapers see them before any inline <style> blocks.
 *
 * Nuxt SSR inlines component-scoped <style> tags early in <head>, which pushes
 * nuxt.config `app.head` meta tags far down the document — past the point where
 * some social scrapers stop reading. This plugin rewrites the HTML on every SSR
 * response to hoist the critical tags to the first position inside <head>.
 */

const OG_TAGS = `<meta property="og:type" content="website">
<meta property="og:url" content="https://mlsscores.netlify.app/">
<meta property="og:title" content="MLS Live Scores">
<meta property="og:description" content="Live MLS scores, schedule, and standings — updated in real time.">
<meta property="og:image" content="https://mlsscores.netlify.app/og-image.png?v=4">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/png">
<meta property="og:site_name" content="MLS Scores">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="MLS Live Scores">
<meta name="twitter:description" content="Live MLS scores, schedule, and standings — updated in real time.">
<meta name="twitter:image" content="https://mlsscores.netlify.app/og-image.png?v=4">`

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html) => {
    // html.head is an array of strings that Nuxt joins into <head>
    // Prepend our OG tags so they appear before inline <style> blocks
    if (Array.isArray(html.head)) {
      html.head.unshift(OG_TAGS)
    }
  })
})
