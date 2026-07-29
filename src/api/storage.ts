import { isBrowser } from '../lib/dom'
import type { StoredRequest } from './types'

/**
 * Single source of truth for the support-request storage key.
 * It used to be hard-coded in both ChatWidget and the API layer, which meant
 * changing one silently orphaned the other.
 */
export const SUPPORT_STORAGE_KEY = 'pr.support.v1'

/** 30 days — the widget is a lead gate, not an archive. */
export const SUPPORT_TTL_MS = 30 * 24 * 60 * 60 * 1000

export function readStoredRequest(): StoredRequest | null {
  if (!isBrowser) return null
  try {
    const raw = window.localStorage.getItem(SUPPORT_STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isStoredRequest(parsed)) return null
    if (Date.now() - parsed.createdAt > SUPPORT_TTL_MS) {
      window.localStorage.removeItem(SUPPORT_STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

/** @returns false when storage is unavailable (private mode, quota). */
export function writeStoredRequest(state: StoredRequest): boolean {
  if (!isBrowser) return false
  try {
    window.localStorage.setItem(SUPPORT_STORAGE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

export function clearStoredRequest(): void {
  if (!isBrowser) return
  try {
    window.localStorage.removeItem(SUPPORT_STORAGE_KEY)
  } catch {
    /* nothing to clear if storage is unavailable */
  }
}

function isStoredRequest(value: unknown): value is StoredRequest {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<StoredRequest>
  return (
    candidate.v === 1 &&
    typeof candidate.ticket === 'string' &&
    typeof candidate.createdAt === 'number' &&
    Array.isArray(candidate.messages)
  )
}
