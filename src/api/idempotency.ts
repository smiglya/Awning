/**
 * Idempotency keys for unsafe requests.
 *
 * One key per submission attempt, held in sessionStorage so it survives both a
 * network retry and a page reload. Without this, a double click or an automatic
 * retry of POST /leads creates two identical requests in the studio's inbox —
 * and the visitor has no way to tell.
 *
 * The key is cleared only once the server has accepted the submission.
 */

const LEAD_KEY = 'pr.idempotency.lead'

function newKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `idem-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function readSession(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeSession(key: string, value: string): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(key, value)
  } catch {
    // private mode: the key still works for this page life, just not a reload
  }
}

/** Returns the in-flight key, minting one on the first attempt. */
export function beginLeadSubmission(): string {
  const existing = readSession(LEAD_KEY)
  if (existing) return existing
  const key = newKey()
  writeSession(LEAD_KEY, key)
  return key
}

/** Call once the lead is accepted, so the next submission is a new request. */
export function completeLeadSubmission(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(LEAD_KEY)
  } catch {
    /* nothing to clear */
  }
}

/** Messages get a fresh key each time; they are not resumed across reloads. */
export function messageIdempotencyKey(): string {
  return newKey()
}
