// server/api/analytics.ts
// Returns analytics data for the admin dashboard.

import { getStore } from '@netlify/blobs'

interface StoredDayStats {
  pageViews: number
  uniqueVisitors: string[]
  sessions: number
  topPages: Record<string, number>
  hourly: Record<string, number>
}

interface DaySummary {
  date: string
  pageViews: number
  uniqueVisitors: number
  sessions: number
  topPages: { path: string; views: number }[]
  hourly: { hour: string; views: number }[]
}

export default defineEventHandler(async (_event) => {
  // Only works on Netlify
  if (!process.env.NETLIFY && !process.env.NETLIFY_BLOBS_CONTEXT) {
    return { days: [], message: 'Analytics only available in production.' }
  }

  try {
    const store = getStore('analytics')

    // Fetch last 30 days
    const days: DaySummary[] = []
    const today = new Date()

    for (let i = 0; i < 30; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const dateKey = d.toISOString().slice(0, 10)

      const raw = (await store
        .get(dateKey, { type: 'json' })
        .catch(() => null)) as StoredDayStats | null

      if (!raw) continue

      const topPages = Object.entries(raw.topPages ?? {})
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([path, views]) => ({ path, views }))

      const hourly = Object.entries(raw.hourly ?? {})
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([hour, views]) => ({ hour, views }))

      days.push({
        date: dateKey,
        pageViews: raw.pageViews ?? 0,
        uniqueVisitors: (raw.uniqueVisitors ?? []).length,
        sessions: raw.sessions ?? 0,
        topPages,
        hourly,
      })
    }

    // Totals across all days
    const totals = days.reduce(
      (acc, d) => ({
        pageViews: acc.pageViews + d.pageViews,
        uniqueVisitors: acc.uniqueVisitors + d.uniqueVisitors,
        sessions: acc.sessions + d.sessions,
      }),
      { pageViews: 0, uniqueVisitors: 0, sessions: 0 }
    )

    // Aggregate top pages across all days
    const allPages: Record<string, number> = {}
    for (const day of days) {
      for (const { path, views } of day.topPages) {
        allPages[path] = (allPages[path] ?? 0) + views
      }
    }
    const topPagesAll = Object.entries(allPages)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([path, views]) => ({ path, views }))

    return { days, totals, topPages: topPagesAll }
  } catch (err) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load analytics',
    })
  }
})
