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

// ── Short display names for the button label (mobile-friendly) ────────────────
export const TEAM_SHORT_NAME: Record<string, string> = {
  'Atlanta United FC': 'Atlanta United',
  'Chicago Fire FC': 'Chicago Fire',
  'Houston Dynamo FC': 'Houston Dynamo',
  'Inter Miami CF': 'Inter Miami',
  'Minnesota United FC': 'Minn United FC',
  'New England Revolution': 'NE Revolution',
  'New York City FC': 'NY City FC',
  'Red Bull New York': 'NY Red Bulls',
  'Orlando City SC': 'Orlando City',
  'Philadelphia Union': 'Phila Union',
  'San Jose Earthquakes': 'SJ Earthquakes',
  'Seattle Sounders FC': 'Seattle Sounders',
  'Sporting Kansas City': 'Sprtg KC',
  'St. Louis City SC': 'St. Louis City',
  'St. Louis CITY SC': 'St. Louis City',
  'Vancouver Whitecaps': 'Van Whitecaps',
}

// ── Team primary colors ───────────────────────────────────────────────────────
export const TEAM_COLORS: Record<string, string> = {
  'Atlanta United FC': '#9d2235',
  'Austin FC': '#00b140',
  'CF Montréal': '#003da6',
  'Charlotte FC': '#0085ca',
  'Chicago Fire FC': '#ff0000',
  'Colorado Rapids': '#8a2432',
  'Columbus Crew': '#fedd00',
  'D.C. United': '#d61018',
  'FC Cincinnati': '#003087',
  'FC Dallas': '#c6093b',
  'Houston Dynamo FC': '#ff6b00',
  'Inter Miami CF': '#f7b5cd',
  'LA Galaxy': '#00235d',
  LAFC: '#c7a36f',
  'Minnesota United FC': '#9bcde4',
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
  'St. Louis CITY SC': '#ec1458',
  'Toronto FC': '#aa182c',
  'Vancouver Whitecaps': '#12284c',
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
