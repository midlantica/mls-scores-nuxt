// ── Timezone selector composable ──────────────────────────────────────────────
// Supports the four main US timezones. Defaults to the user's browser timezone
// (mapped to the nearest of ET/CT/MT/PT), falling back to CT.

export type TzCode = 'ET' | 'CT' | 'MT' | 'PT'

export const TZ_OPTIONS: { code: TzCode; iana: string }[] = [
  { code: 'ET', iana: 'America/New_York' },
  { code: 'CT', iana: 'America/Chicago' },
  { code: 'MT', iana: 'America/Denver' },
  { code: 'PT', iana: 'America/Los_Angeles' },
]

function detectTzCode(): TzCode {
  try {
    const iana = Intl.DateTimeFormat().resolvedOptions().timeZone
    // Direct matches
    if (
      iana === 'America/New_York' ||
      iana === 'America/Detroit' ||
      iana === 'America/Indiana/Indianapolis'
    )
      return 'ET'
    if (iana === 'America/Chicago' || iana === 'America/Menominee') return 'CT'
    if (
      iana === 'America/Denver' ||
      iana === 'America/Boise' ||
      iana === 'America/Phoenix'
    )
      return 'MT'
    if (
      iana === 'America/Los_Angeles' ||
      iana === 'America/Anchorage' ||
      iana === 'America/Honolulu'
    )
      return 'PT'
    // Fallback: compare UTC offset to find nearest zone
    const offset = -new Date().getTimezoneOffset() // minutes east of UTC
    if (offset >= -240) return 'ET' // UTC-4 or less negative
    if (offset >= -360) return 'CT' // UTC-5 or UTC-6
    if (offset >= -420) return 'MT' // UTC-7
    return 'PT' // UTC-8 or further west
  } catch {
    return 'CT'
  }
}

// Singleton state — shared across all component instances.
// Default to ET on the server; client will correct to the browser's timezone
// in onMounted (via useTimezone()) to avoid SSR/hydration mismatch.
const selectedTz = ref<TzCode>('ET')
let _tzDetected = false

export function useTimezone() {
  // On the client, detect the real browser timezone once after mount.
  if (import.meta.client) {
    onMounted(() => {
      // Only auto-detect if the user hasn't manually changed the timezone
      // (i.e. selectedTz is still the SSR default 'ET' and we haven't run yet).
      // We use a module-level flag so this only fires once across all instances.
      if (!_tzDetected) {
        _tzDetected = true
        selectedTz.value = detectTzCode()
      }
    })
  }

  function setTz(code: TzCode) {
    _tzDetected = true // treat manual selection as "detected"
    selectedTz.value = code
  }

  function ianaForCode(code: TzCode): string {
    return TZ_OPTIONS.find((t) => t.code === code)?.iana ?? 'America/Chicago'
  }

  const iana = computed(() => ianaForCode(selectedTz.value))

  /** Split a locale time string into [time, ampm] e.g. ["3:30", "PM"] */
  function splitAmPm(str: string): [string, string] {
    const match = str.match(/^([\d:]+)\s*(AM|PM)$/i)
    if (match) return [match[1]!, match[2]!.toUpperCase()]
    return [str, '']
  }

  /** Format an ISO date string as "3:30 PM" in the selected timezone */
  function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: iana.value,
    })
  }

  /** Format an ISO date string as HTML with AM/PM in a smaller span */
  function formatTimeHtml(iso: string): string {
    const [time, ampm] = splitAmPm(formatTime(iso))
    return ampm ? `${time}<span class="ampm">${ampm}</span>` : time
  }

  /** Round ISO date to nearest 30-min slot label in the selected timezone */
  function kickoffKey(iso: string): string {
    const d = new Date(iso)
    const mins = d.getUTCMinutes()
    const rounded = mins < 15 ? 0 : mins < 45 ? 30 : 60
    const h = rounded === 60 ? d.getUTCHours() + 1 : d.getUTCHours()
    const m = rounded === 60 ? 0 : rounded
    const slot = new Date(d)
    slot.setUTCHours(h, m, 0, 0)
    return slot.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: iana.value,
    })
  }

  /** Round ISO date to nearest 30-min slot label as HTML with AM/PM in a smaller span */
  function kickoffKeyHtml(iso: string): string {
    const [time, ampm] = splitAmPm(kickoffKey(iso))
    return ampm ? `${time}<span class="ampm">${ampm}</span>` : time
  }

  return {
    selectedTz,
    setTz,
    iana,
    formatTime,
    formatTimeHtml,
    kickoffKey,
    kickoffKeyHtml,
  }
}
