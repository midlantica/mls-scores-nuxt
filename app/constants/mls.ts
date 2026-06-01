// MLS schedule constants — centralised so components don't embed dates inline.

/** Date the 2026 World Cup break was publicly announced. */
export const WC_ANNOUNCED = new Date('2026-05-18')

/** Date MLS resumes after the 2026 World Cup break. */
export const WC_RESUME = new Date('2026-07-22')

// ── Post-World Cup schedule notice ───────────────────────────────────────────
// ESPN's API only lists the handful of games MLS has officially scheduled after
// the World Cup hiatus. The rest of the season (dates/opponents are set, but
// many kickoff times are still TBD) hasn't been published yet. We surface a
// notice at the bottom of the schedule explaining this.
//
// Update the min/max range below as MLS releases more of the post-WC schedule.
export const POST_WC_GAMES_MIN = 18
export const POST_WC_GAMES_MAX = 20

/** Title for the post-World Cup schedule notice box. */
export const POST_WC_NOTICE_TITLE = 'MLS Post-World Cup Schedule'

/** Body copy for the post-World Cup schedule notice box. */
export const POST_WC_NOTICE_MESSAGE =
  `Most teams have ${POST_WC_GAMES_MIN}–${POST_WC_GAMES_MAX} more games after the World Cup Hiatus. ` +
  'Full dates and opponents are set, but many kickoff times are not yet finalized. ' +
  'They will appear here as MLS releases them.'
