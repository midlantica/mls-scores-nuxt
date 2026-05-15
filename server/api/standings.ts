// Server-side API route: proxies ESPN's MLS standings API
export default defineEventHandler(async () => {
  const url = 'https://site.api.espn.com/apis/v2/sports/soccer/usa.1/standings'
  try {
    const data = await $fetch<Record<string, unknown>>(url)
    return data
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    throw createError({
      statusCode: 502,
      message: `ESPN API error: ${message}`,
    })
  }
})
