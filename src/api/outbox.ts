import { emit } from './telemetry'
import type { LeadFields } from './types'

/**
 * Durable queue for leads the server has not accepted.
 *
 * Before this, a failed submission fell back to localStorage and the UI
 * reported success — the visitor believed they had made contact and the studio
 * never heard about it. Now the attempt is queued, the failure is stated, and
 * delivery is retried when the network comes back.
 *
 * The idempotency key is stored with the entry, so a replay after a reload
 * still cannot create a second lead.
 */

const OUTBOX_KEY = 'pr.outbox.leads.v1'
const MAX_ENTRIES = 20

export interface OutboxEntry {
  id: string
  ticket: string
  fields: LeadFields
  idempotencyKey: string
  queuedAt: number
  attempts: number
  lastCode?: string
}

function read(): OutboxEntry[] {
  try {
    const raw = window.localStorage.getItem(OUTBOX_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isEntry)
  } catch {
    return []
  }
}

function write(entries: OutboxEntry[]): void {
  try {
    window.localStorage.setItem(OUTBOX_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)))
  } catch {
    // private mode: the queue lives for this page only, which the UI states
  }
}

function isEntry(value: unknown): value is OutboxEntry {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<OutboxEntry>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.ticket === 'string' &&
    typeof candidate.idempotencyKey === 'string' &&
    typeof candidate.fields === 'object' &&
    candidate.fields !== null
  )
}

export function enqueue(
  entry: Omit<OutboxEntry, 'id' | 'queuedAt' | 'attempts'>
): OutboxEntry {
  const full: OutboxEntry = {
    ...entry,
    id: `ob-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    queuedAt: Date.now(),
    attempts: 0,
  }
  const entries = read()
  // one queued attempt per ticket; a repeat submission replaces its predecessor
  const deduped = entries.filter((existing) => existing.ticket !== entry.ticket)
  write([...deduped, full])
  emit({ name: 'lead_queued', detail: { ticket: entry.ticket } })
  return full
}

export function list(): OutboxEntry[] {
  return read()
}

export function has(ticket: string): boolean {
  return read().some((entry) => entry.ticket === ticket)
}

export function remove(id: string): void {
  write(read().filter((entry) => entry.id !== id))
}

export function markAttempt(id: string, code: string): void {
  write(
    read().map((entry) =>
      entry.id === id ? { ...entry, attempts: entry.attempts + 1, lastCode: code } : entry
    )
  )
}

export function clear(): void {
  try {
    window.localStorage.removeItem(OUTBOX_KEY)
  } catch {
    /* nothing to clear */
  }
}
