/**
 * useMyTeam — "My Team" selection + site-wide color theme
 *
 * Strategy:
 *   • The user picks a team from a dropdown.
 *   • We take that team's primary hex color and use culori to derive a full
 *     10-stop palette (50–950) in oklch space, then inject it as CSS custom
 *     properties on <html> so every component that references --color-theme-*
 *     updates instantly.
 *   • When no team is chosen the palette falls back to Tailwind slate.
 *   • We also derive a "text-on-theme" color (white or near-black) for
 *     legible text placed directly on a theme-colored background.
 */

import { formatHex, oklch, parse, wcagContrast } from 'culori'
import { TEAM_COLORS } from '~/composables/useTeamColors'

// ── Team → logo filename map ──────────────────────────────────────────────────
// Keys match TEAM_COLORS keys exactly.
export const TEAM_LOGO: Record<string, string> = {
  'Atlanta United FC': '/MLS-logos/Atlanta-United.svg',
  'Austin FC': '/MLS-logos/Austin-FC.svg',
  'CF Montréal': '/MLS-logos/CF-Montreal.svg',
  'Charlotte FC': '/MLS-logos/Charlotte-FC.svg',
  'Chicago Fire FC': '/MLS-logos/Chicago-Fire.svg',
  'Colorado Rapids': '/MLS-logos/Colorado-Rapids.svg',
  'Columbus Crew': '/MLS-logos/Columbus-Crew.svg',
  'D.C. United': '/MLS-logos/DC-United.svg',
  'FC Cincinnati': '/MLS-logos/FC-Cincinnati.svg',
  'FC Dallas': '/MLS-logos/FC-Dallas.svg',
  'Houston Dynamo FC': '/MLS-logos/Houston-Dynamo.svg',
  'Inter Miami CF': '/MLS-logos/Inter-Miami.svg',
  'LA Galaxy': '/MLS-logos/LA-Galaxy.svg',
  LAFC: '/MLS-logos/Los-Angeles-FC.svg',
  'Minnesota United FC': '/MLS-logos/Minnesota-United.svg',
  'Nashville SC': '/MLS-logos/Nashville-SC.svg',
  'New England Revolution': '/MLS-logos/New-England-Revolution.svg',
  'New York City FC': '/MLS-logos/New-York-City-FC.svg',
  'Orlando City SC': '/MLS-logos/Orlando-City.svg',
  'Philadelphia Union': '/MLS-logos/Philadelphia-Union.svg',
  'Portland Timbers': '/MLS-logos/Portland-Timbers.svg',
  'Real Salt Lake': '/MLS-logos/Real-Salt-Lake.svg',
  'Red Bull New York': '/MLS-logos/New-York-Red-Bulls.svg',
  'San Diego FC': '/MLS-logos/San-Diego-FC.svg',
  'San Jose Earthquakes': '/MLS-logos/San-Jose-Earthquakes.svg',
  'Seattle Sounders FC': '/MLS-logos/Seattle-Sounders.svg',
  'Sporting Kansas City': '/MLS-logos/Sporting-Kansas-City.svg',
  'St. Louis City SC': '/MLS-logos/St-Louis-City.svg',
  'St. Louis CITY SC': '/MLS-logos/St-Louis-City.svg',
  'Toronto FC': '/MLS-logos/Toronto-FC.svg',
  'Vancouver Whitecaps': '/MLS-logos/Vancouver-Whitecaps.svg',
}

// ── Sorted team list for the picker ──────────────────────────────────────────
export const TEAM_LIST = Object.keys(TEAM_LOGO)
  .filter((k) => k !== 'St. Louis CITY SC') // dedupe
  .sort()

// ── Conference map ────────────────────────────────────────────────────────────
export const TEAM_CONFERENCE: Record<string, string> = {
  'Atlanta United FC': 'Eastern Conference',
  'Austin FC': 'Western Conference',
  'CF Montréal': 'Eastern Conference',
  'Charlotte FC': 'Eastern Conference',
  'Chicago Fire FC': 'Eastern Conference',
  'Colorado Rapids': 'Western Conference',
  'Columbus Crew': 'Eastern Conference',
  'D.C. United': 'Eastern Conference',
  'FC Cincinnati': 'Eastern Conference',
  'FC Dallas': 'Western Conference',
  'Houston Dynamo FC': 'Western Conference',
  'Inter Miami CF': 'Eastern Conference',
  'LA Galaxy': 'Western Conference',
  LAFC: 'Western Conference',
  'Minnesota United FC': 'Western Conference',
  'Nashville SC': 'Eastern Conference',
  'New England Revolution': 'Eastern Conference',
  'New York City FC': 'Eastern Conference',
  'Orlando City SC': 'Eastern Conference',
  'Philadelphia Union': 'Eastern Conference',
  'Portland Timbers': 'Western Conference',
  'Real Salt Lake': 'Western Conference',
  'Red Bull New York': 'Eastern Conference',
  'San Diego FC': 'Western Conference',
  'San Jose Earthquakes': 'Western Conference',
  'Seattle Sounders FC': 'Western Conference',
  'Sporting Kansas City': 'Western Conference',
  'St. Louis City SC': 'Western Conference',
  'St. Louis CITY SC': 'Western Conference',
  'Toronto FC': 'Eastern Conference',
  'Vancouver Whitecaps': 'Western Conference',
}

// ── Ultra-short abbreviations for the "My Team" button label (≤6 chars) ──────
export const TEAM_ABBREV: Record<string, string> = {
  'Atlanta United FC': 'ATL',
  'Austin FC': 'ATX',
  'CF Montréal': 'MTL',
  'Charlotte FC': 'CLT',
  'Chicago Fire FC': 'CHI',
  'Colorado Rapids': 'COL',
  'Columbus Crew': 'CLB',
  'D.C. United': 'DC',
  'FC Cincinnati': 'CIN',
  'FC Dallas': 'DAL',
  'Houston Dynamo FC': 'HOU',
  'Inter Miami CF': 'MIA',
  'LA Galaxy': 'LAG',
  LAFC: 'LAFC',
  'Minnesota United FC': 'MIN',
  'Nashville SC': 'NSH',
  'New England Revolution': 'NE',
  'New York City FC': 'NYC',
  'Orlando City SC': 'ORL',
  'Philadelphia Union': 'PHI',
  'Portland Timbers': 'POR',
  'Real Salt Lake': 'RSL',
  'Red Bull New York': 'RBNY',
  'San Diego FC': 'SD',
  'San Jose Earthquakes': 'SJ',
  'Seattle Sounders FC': 'SEA',
  'Sporting Kansas City': 'SKC',
  'St. Louis City SC': 'STL',
  'St. Louis CITY SC': 'STL',
  'Toronto FC': 'TOR',
  'Vancouver Whitecaps': 'VAN',
}

// ── Short display names for the dropdown (mobile-friendly) ───────────────────
export const TEAM_SHORT_NAME: Record<string, string> = {
  'Atlanta United FC': 'Atlanta Utd',
  'Austin FC': 'Austin FC',
  'CF Montréal': 'CF Montréal',
  'Charlotte FC': 'Charlotte FC',
  'Chicago Fire FC': 'Chicago Fire',
  'Colorado Rapids': 'Colorado',
  'Columbus Crew': 'Columbus',
  'D.C. United': 'DC United',
  'FC Cincinnati': 'Cincinnati',
  'FC Dallas': 'FC Dallas',
  'Houston Dynamo FC': 'Houston',
  'Inter Miami CF': 'Inter Miami',
  'LA Galaxy': 'LA Galaxy',
  LAFC: 'LAFC',
  'Minnesota United FC': 'Minnesota',
  'Nashville SC': 'Nashville',
  'New England Revolution': 'NE Revs',
  'New York City FC': 'NYCFC',
  'Orlando City SC': 'Orlando',
  'Philadelphia Union': 'Phil Union',
  'Portland Timbers': 'Portland',
  'Real Salt Lake': 'RSL',
  'Red Bull New York': 'NY Red Bulls',
  'San Diego FC': 'San Diego',
  'San Jose Earthquakes': 'San Jose',
  'Seattle Sounders FC': 'Seattle',
  'Sporting Kansas City': 'Sporting KC',
  'St. Louis City SC': 'St. Louis',
  'St. Louis CITY SC': 'St. Louis',
  'Toronto FC': 'Toronto FC',
  'Vancouver Whitecaps': 'Vancouver',
}

// ── Slate fallback palette (Tailwind slate in oklch) ─────────────────────────
// These are the default values written into main.css @theme.
const SLATE_PALETTE: Record<string, string> = {
  '50': 'oklch(98.4% 0.003 247.9)',
  '100': 'oklch(96.8% 0.007 247.7)',
  '200': 'oklch(92.9% 0.013 255.5)',
  '300': 'oklch(86.9% 0.022 252.9)',
  '400': 'oklch(70.4% 0.04 256.8)',
  '500': 'oklch(55.4% 0.046 257.4)',
  '600': 'oklch(44.6% 0.043 257.1)',
  '700': 'oklch(37.2% 0.044 257.9)',
  '800': 'oklch(27.9% 0.041 260.0)',
  '900': 'oklch(20.8% 0.042 265.8)',
  '950': 'oklch(12.9% 0.042 264.3)',
}

// ── Derive a 10-stop oklch palette from a single hex color ───────────────────
export function buildPalette(hex: string): Record<string, string> {
  const base = oklch(parse(hex))
  if (!base) return SLATE_PALETTE

  const { h = 0, c: baseC = 0 } = base

  // Lightness stops from 50 (near-white) → 950 (near-black)
  const stops: [string, number, number][] = [
    ['50', 0.97, baseC * 0.18],
    ['100', 0.94, baseC * 0.28],
    ['200', 0.88, baseC * 0.45],
    ['300', 0.8, baseC * 0.62],
    ['400', 0.7, baseC * 0.8],
    ['500', 0.6, baseC * 0.95],
    ['600', 0.5, baseC * 0.9],
    ['700', 0.4, baseC * 0.8],
    ['800', 0.3, baseC * 0.65],
    ['900', 0.2, baseC * 0.45],
    ['950', 0.14, baseC * 0.32],
  ]

  const result: Record<string, string> = {}
  for (const [stop, l, c] of stops) {
    const color = oklch({ mode: 'oklch', l, c, h })
    result[stop] = formatHex(color) ?? '#888'
  }
  return result
}

// ── Determine readable text color for a given background hex ─────────────────
function contrastColor(bgHex: string): string {
  const white = '#ffffff'
  const dark = '#0f172a' // slate-950
  const contrastWhite = wcagContrast(bgHex, white)
  const contrastDark = wcagContrast(bgHex, dark)
  return contrastWhite >= contrastDark ? white : dark
}

// ── Inject CSS custom properties onto <html> ─────────────────────────────────
function applyTheme(palette: Record<string, string>, primaryHex: string) {
  if (typeof document === 'undefined') return
  const root = document.documentElement

  for (const [stop, value] of Object.entries(palette)) {
    root.style.setProperty(`--color-theme-${stop}`, value)
  }

  // Semantic aliases used throughout the UI
  root.style.setProperty('--color-theme-primary', primaryHex)
  root.style.setProperty('--color-theme-on-primary', contrastColor(primaryHex))

  // Body background = theme-950
  root.style.setProperty('--app-bg', palette['950'] ?? '#0f172a')
  document.body.style.backgroundColor = palette['950'] ?? '#0f172a'
}

function clearTheme() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const stops = [
    '50',
    '100',
    '200',
    '300',
    '400',
    '500',
    '600',
    '700',
    '800',
    '900',
    '950',
  ]
  for (const stop of stops) {
    root.style.removeProperty(`--color-theme-${stop}`)
  }
  root.style.removeProperty('--color-theme-primary')
  root.style.removeProperty('--color-theme-on-primary')
  root.style.removeProperty('--app-bg')
  document.body.style.backgroundColor = ''
}

// ── ESPN team ID map ──────────────────────────────────────────────────────────
export const TEAM_ESPN_ID: Record<string, string> = {
  'Atlanta United FC': '18418',
  'Austin FC': '20906',
  'CF Montréal': '9720',
  'Charlotte FC': '21300',
  'Chicago Fire FC': '182',
  'Colorado Rapids': '184',
  'Columbus Crew': '183',
  'D.C. United': '193',
  'FC Cincinnati': '18267',
  'FC Dallas': '185',
  'Houston Dynamo FC': '6077',
  'Inter Miami CF': '20232',
  'LA Galaxy': '187',
  LAFC: '18966',
  'Minnesota United FC': '17362',
  'Nashville SC': '18986',
  'New England Revolution': '189',
  'New York City FC': '17606',
  'Orlando City SC': '12011',
  'Philadelphia Union': '10739',
  'Portland Timbers': '9723',
  'Real Salt Lake': '4771',
  'Red Bull New York': '190',
  'San Diego FC': '22529',
  'San Jose Earthquakes': '191',
  'Seattle Sounders FC': '9726',
  'Sporting Kansas City': '186',
  'St. Louis City SC': '21812',
  'St. Louis CITY SC': '21812',
  'Toronto FC': '7318',
  'Vancouver Whitecaps': '9727',
}

// ── Venue map ─────────────────────────────────────────────────────────────────
export const TEAM_VENUE: Record<string, string> = {
  'Atlanta United FC': 'Mercedes-Benz Stadium, Atlanta, GA',
  'Austin FC': 'Q2 Stadium, Austin, TX',
  'CF Montréal': 'Stade Saputo, Montreal, QC',
  'Charlotte FC': 'Bank of America Stadium, Charlotte, NC',
  'Chicago Fire FC': 'Soldier Field, Chicago, IL',
  'Colorado Rapids': "Dick's Sporting Goods Park, Commerce City, CO",
  'Columbus Crew': 'Lower.com Field, Columbus, OH',
  'D.C. United': 'Audi Field, Washington, D.C.',
  'FC Cincinnati': 'TQL Stadium, Cincinnati, OH',
  'FC Dallas': 'Toyota Stadium, Frisco, TX',
  'Houston Dynamo FC': 'Shell Energy Stadium, Houston, TX',
  'Inter Miami CF': 'Chase Stadium, Fort Lauderdale, FL',
  'LA Galaxy': 'Dignity Health Sports Park, Carson, CA',
  LAFC: 'BMO Stadium, Los Angeles, CA',
  'Minnesota United FC': 'Allianz Field, St. Paul, MN',
  'Nashville SC': 'GEODIS Park, Nashville, TN',
  'New England Revolution': 'Gillette Stadium, Foxborough, MA',
  'New York City FC': 'Yankee Stadium, Bronx, NY',
  'Orlando City SC': 'Inter&Co Stadium, Orlando, FL',
  'Philadelphia Union': 'Subaru Park, Chester, PA',
  'Portland Timbers': 'Providence Park, Portland, OR',
  'Real Salt Lake': 'America First Field, Sandy, UT',
  'Red Bull New York': 'Red Bull Arena, Harrison, NJ',
  'San Diego FC': 'Snapdragon Stadium, San Diego, CA',
  'San Jose Earthquakes': 'PayPal Park, San Jose, CA',
  'Seattle Sounders FC': 'Lumen Field, Seattle, WA',
  'Sporting Kansas City': "Children's Mercy Park, Kansas City, KS",
  'St. Louis City SC': 'CITYPARK, St. Louis, MO',
  'St. Louis CITY SC': 'CITYPARK, St. Louis, MO',
  'Toronto FC': 'BMO Field, Toronto, ON',
  'Vancouver Whitecaps': 'BC Place, Vancouver, BC',
}

// ── Short venue overrides (for narrow displays) ───────────────────────────────
export const TEAM_VENUE_SHORT: Record<string, string> = {
  'Sporting Kansas City': "Children's Mercy Pk, Kansas City, KS",
}

// ── Composable ────────────────────────────────────────────────────────────────
const MY_TEAM_KEY = 'mls-my-team'

export function useMyTeam() {
  const selectedTeam = useState<string | null>('myTeam', () => null)

  // Restore from localStorage on client mount
  onMounted(() => {
    const saved = localStorage.getItem(MY_TEAM_KEY)
    if (saved && TEAM_LOGO[saved]) {
      selectedTeam.value = saved
      const hex = TEAM_COLORS[saved] ?? '#6b7280'
      applyTheme(buildPalette(hex), hex)
    }
  })

  function selectTeam(name: string | null) {
    selectedTeam.value = name
    if (name) {
      localStorage.setItem(MY_TEAM_KEY, name)
      const hex = TEAM_COLORS[name] ?? '#6b7280'
      applyTheme(buildPalette(hex), hex)
    } else {
      localStorage.removeItem(MY_TEAM_KEY)
      clearTheme()
    }
  }

  const logoUrl = computed(() =>
    selectedTeam.value ? (TEAM_LOGO[selectedTeam.value] ?? null) : null
  )

  return { selectedTeam, selectTeam, logoUrl, TEAM_LIST, TEAM_LOGO }
}
