<script setup lang="ts">
  // Simple analytics admin dashboard — /admin

  interface DaySummary {
    date: string
    pageViews: number
    uniqueVisitors: number
    sessions: number
    topPages: { path: string; views: number }[]
    hourly: { hour: string; views: number }[]
  }

  interface AnalyticsData {
    days: DaySummary[]
    totals: { pageViews: number; uniqueVisitors: number; sessions: number }
    topPages: { path: string; views: number }[]
    message?: string
  }

  const { data, pending, error, refresh } = await useFetch<AnalyticsData>(
    '/api/analytics',
    { lazy: true }
  )

  const selectedDay = ref<DaySummary | null>(null)

  function fmtDate(iso: string) {
    return new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  function fmtHour(h: string) {
    // "2026-05-21T14:00" → "2pm"
    const hour = parseInt(h.slice(11, 13))
    if (hour === 0) return '12am'
    if (hour < 12) return `${hour}am`
    if (hour === 12) return '12pm'
    return `${hour - 12}pm`
  }

  // Bar chart: scale bar widths relative to max
  function barWidth(val: number, max: number) {
    if (!max) return '0%'
    return `${Math.round((val / max) * 100)}%`
  }

  const maxHourly = computed(() => {
    if (!selectedDay.value) return 1
    return Math.max(1, ...selectedDay.value.hourly.map((h) => h.views))
  })

  const maxTopPage = computed(() => {
    const pages = selectedDay.value
      ? selectedDay.value.topPages
      : (data.value?.topPages ?? [])
    return Math.max(1, ...pages.map((p) => p.views))
  })

  useHead({ title: 'Admin — MLS Analytics' })
</script>

<template>
  <div class="admin-wrap">
    <div class="admin-header">
      <h1 class="admin-title">📊 MLS Analytics</h1>
      <button class="refresh-btn" @click="refresh()">↻ Refresh</button>
    </div>

    <div v-if="error" class="admin-error">
      <p>Error loading analytics: {{ error.message }}</p>
    </div>

    <div v-else-if="pending" class="admin-loading">Loading…</div>

    <div v-else-if="data?.message" class="admin-note">{{ data.message }}</div>

    <template v-else-if="data">
      <!-- ── Totals ── -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Page Views</div>
          <div class="stat-value">
            {{ data.totals.pageViews.toLocaleString() }}
          </div>
          <div class="stat-sub">last 30 days</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Unique Visitors</div>
          <div class="stat-value">
            {{ data.totals.uniqueVisitors.toLocaleString() }}
          </div>
          <div class="stat-sub">last 30 days</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Sessions</div>
          <div class="stat-value">
            {{ data.totals.sessions.toLocaleString() }}
          </div>
          <div class="stat-sub">last 30 days</div>
        </div>
      </div>

      <div class="admin-cols">
        <!-- ── Daily breakdown ── -->
        <div class="admin-section">
          <h2 class="section-title">Daily Breakdown</h2>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Views</th>
                  <th>Visitors</th>
                  <th>Sessions</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="day in data.days"
                  :key="day.date"
                  :class="{ 'row-selected': selectedDay?.date === day.date }"
                  @click="
                    selectedDay = selectedDay?.date === day.date ? null : day
                  "
                  style="cursor: pointer"
                >
                  <td>{{ fmtDate(day.date) }}</td>
                  <td>{{ day.pageViews.toLocaleString() }}</td>
                  <td>{{ day.uniqueVisitors.toLocaleString() }}</td>
                  <td>{{ day.sessions.toLocaleString() }}</td>
                  <td class="td-arrow">
                    {{ selectedDay?.date === day.date ? '▲' : '▼' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ── Top Pages (all time or selected day) ── -->
        <div class="admin-section">
          <h2 class="section-title">
            Top Pages
            <span v-if="selectedDay" class="section-sub"
              >— {{ fmtDate(selectedDay.date) }}</span
            >
            <span v-else class="section-sub">— 30 days</span>
          </h2>
          <div class="bar-list">
            <div
              v-for="page in selectedDay ? selectedDay.topPages : data.topPages"
              :key="page.path"
              class="bar-row"
            >
              <div class="bar-label">{{ page.path || '/' }}</div>
              <div class="bar-track">
                <div
                  class="bar-fill"
                  :style="{ width: barWidth(page.views, maxTopPage) }"
                />
              </div>
              <div class="bar-val">{{ page.views }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Hourly breakdown for selected day ── -->
      <div v-if="selectedDay" class="admin-section">
        <h2 class="section-title">Hourly — {{ fmtDate(selectedDay.date) }}</h2>
        <div class="hourly-chart">
          <div v-for="h in selectedDay.hourly" :key="h.hour" class="hour-col">
            <div class="hour-bar-wrap">
              <div
                class="hour-bar"
                :style="{ height: barWidth(h.views, maxHourly) }"
                :title="`${fmtHour(h.hour)}: ${h.views} views`"
              />
            </div>
            <div class="hour-label">{{ fmtHour(h.hour) }}</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
  .admin-wrap {
    max-width: 64rem;
    margin: 0 auto;
    padding: 1.5rem 1rem 4rem;
    font-family: var(--font-condensed);
    color: #e2e8f0;
    min-height: 100dvh;
  }

  .admin-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.5rem;
  }

  .admin-title {
    font-size: 1.75rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: white;
  }

  .refresh-btn {
    background: #1e293b;
    border: 1px solid #334155;
    color: #94a3b8;
    padding: 0.35rem 0.75rem;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
    transition: color 0.15s;
  }
  .refresh-btn:hover {
    color: white;
  }

  .admin-error,
  .admin-loading,
  .admin-note {
    padding: 1.5rem;
    background: #1e293b;
    border-radius: 0.5rem;
    color: #94a3b8;
    font-size: 1rem;
  }
  .admin-error code {
    background: #0f172a;
    padding: 0.1em 0.4em;
    border-radius: 0.25rem;
    font-size: 0.9em;
  }

  /* ── Stat cards ── */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  @media (max-width: 480px) {
    .stats-grid {
      grid-template-columns: 1fr;
    }
  }

  .stat-card {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 0.5rem;
    padding: 1rem 1.25rem;
  }

  .stat-label {
    font-size: 0.75rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #64748b;
    margin-bottom: 0.25rem;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: 600;
    color: white;
    line-height: 1.1;
  }

  .stat-sub {
    font-size: 0.75rem;
    color: #475569;
    margin-top: 0.2rem;
  }

  /* ── Two-column layout ── */
  .admin-cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  @media (max-width: 640px) {
    .admin-cols {
      grid-template-columns: 1fr;
    }
  }

  /* ── Section ── */
  .admin-section {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 0.5rem;
    padding: 1rem 1.25rem;
    margin-bottom: 1rem;
  }

  .section-title {
    font-size: 0.8rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #64748b;
    margin-bottom: 0.75rem;
  }

  .section-sub {
    font-weight: 400;
    color: #475569;
    text-transform: none;
    letter-spacing: 0;
  }

  /* ── Table ── */
  .table-wrap {
    overflow-x: auto;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  .data-table th {
    text-align: left;
    padding: 0.4rem 0.5rem;
    color: #475569;
    font-size: 0.75rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    border-bottom: 1px solid #334155;
  }

  .data-table td {
    padding: 0.45rem 0.5rem;
    border-bottom: 1px solid #1e293b;
    color: #cbd5e1;
  }

  .data-table tbody tr:hover td {
    background: #0f172a;
    color: white;
  }

  .row-selected td {
    background: #0f172a;
    color: white;
  }

  .td-arrow {
    color: #475569;
    font-size: 0.65rem;
    text-align: right;
  }

  /* ── Bar chart ── */
  .bar-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .bar-row {
    display: grid;
    grid-template-columns: 6rem 1fr 2.5rem;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
  }

  .bar-label {
    color: #94a3b8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.75rem;
  }

  .bar-track {
    background: #0f172a;
    border-radius: 2px;
    height: 0.5rem;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    background: #3b82f6;
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  .bar-val {
    color: #64748b;
    text-align: right;
    font-size: 0.75rem;
  }

  /* ── Hourly chart ── */
  .hourly-chart {
    display: flex;
    align-items: flex-end;
    gap: 0.25rem;
    height: 6rem;
    padding-bottom: 1.5rem;
    position: relative;
  }

  .hour-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
  }

  .hour-bar-wrap {
    flex: 1;
    width: 100%;
    display: flex;
    align-items: flex-end;
  }

  .hour-bar {
    width: 100%;
    background: #3b82f6;
    border-radius: 2px 2px 0 0;
    min-height: 2px;
    transition: height 0.3s ease;
  }

  .hour-label {
    font-size: 0.55rem;
    color: #475569;
    margin-top: 0.25rem;
    white-space: nowrap;
  }
</style>
