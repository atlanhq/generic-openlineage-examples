const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

const SEC = 1000
const MIN = 60 * SEC
const HOUR = 60 * MIN
const DAY = 24 * HOUR
const MONTH = 30 * DAY
const YEAR = 365 * DAY

/** "just now", "5 mins ago", "10 hours ago", "3 days ago", etc. */
export function timeAgo(ms?: number): string {
  if (!ms || !Number.isFinite(ms)) return ''
  const diff = Date.now() - ms
  const abs = Math.abs(diff)
  const sign = diff >= 0 ? -1 : 1 // past → negative for RTF
  if (abs < 30 * SEC) return 'just now'
  if (abs < MIN) return rtf.format(sign * Math.round(abs / SEC), 'second')
  if (abs < HOUR) return rtf.format(sign * Math.round(abs / MIN), 'minute')
  if (abs < DAY) return rtf.format(sign * Math.round(abs / HOUR), 'hour')
  if (abs < MONTH) return rtf.format(sign * Math.round(abs / DAY), 'day')
  if (abs < YEAR) return rtf.format(sign * Math.round(abs / MONTH), 'month')
  return rtf.format(sign * Math.round(abs / YEAR), 'year')
}
