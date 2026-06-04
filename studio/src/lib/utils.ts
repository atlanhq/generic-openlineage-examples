export type ClassValue = string | false | null | undefined

/** Tiny classname joiner (keeps deps light; no tailwind-merge needed at this scale). */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ')
}

/** A run of `n` random decimal digits, e.g. "048213". */
export function randomDigits(n = 6): string {
  let out = ''
  for (let i = 0; i < n; i++) out += Math.floor(Math.random() * 10)
  return out
}

/**
 * Auto-generated job name: a readable stem + a 6-digit random suffix.
 * The customer can override it, but they never have to invent one.
 */
export function generateJobName(stem = 'lineage_demo'): string {
  return `${stem}_${randomDigits(6)}`
}

/** RFC4122 v4 id, used for OpenLineage run ids. */
export function newRunId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** ISO timestamp `offsetMs` from now (negative = in the past). */
export function isoFromNow(offsetMs = 0): string {
  return new Date(Date.now() + offsetMs).toISOString()
}
