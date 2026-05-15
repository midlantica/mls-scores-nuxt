// MLS team primary colors — sourced from ESPN scoreboard API (team.color / team.alternateColor).
// When the primary is pure black we use the alternate so swatches are visible on dark backgrounds.
// Keys match ESPN's team.displayName exactly (after normalizeTeamName).

export const TEAM_COLORS: Record<string, string> = {
  'Atlanta United FC': '#9d2235',
  'Austin FC': '#00b140',
  'CF Montréal': '#003da6',
  'Charlotte FC': '#0085ca',
  'Chicago Fire FC': '#ff0000', // primary is light blue — alternate red is more iconic
  'Colorado Rapids': '#8a2432',
  'Columbus Crew': '#fedd00', // primary black → alternate gold
  'D.C. United': '#d61018', // primary black → alternate red
  'FC Cincinnati': '#003087',
  'FC Dallas': '#c6093b',
  'Houston Dynamo FC': '#ff6b00',
  'Inter Miami CF': '#f7b5cd', // primary black → alternate pink
  'LA Galaxy': '#00235d',
  LAFC: '#c7a36f', // primary black → alternate gold
  'Minnesota United FC': '#9bcde4', // primary black → alternate light blue
  'Nashville SC': '#ece83a',
  'New England Revolution': '#022166',
  'New York City FC': '#9fd2ff',
  'Orlando City SC': '#60269e',
  'Philadelphia Union': '#051f31',
  'Portland Timbers': '#2c5234',
  'Real Salt Lake': '#a32035',
  'Red Bull New York': '#ba0c2f',
  'San Diego FC': '#697a7c',
  'San Jose Earthquakes': '#003da6',
  'Seattle Sounders FC': '#2dc84d',
  'Sporting Kansas City': '#a7c6ed',
  'St. Louis City SC': '#ec1458',
  'St. Louis CITY SC': '#ec1458', // ESPN standings API uses this casing
  'Toronto FC': '#aa182c',
  'Vancouver Whitecaps': '#12284c', // primary white → alternate navy
}

/** Return the display color for a team name, falling back to a neutral grey. */
export function getTeamColor(teamName: string): string {
  return TEAM_COLORS[teamName] ?? '#6b7280'
}
