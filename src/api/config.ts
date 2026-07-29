import { env } from '../env'

/**
 * API configuration.
 *
 * BACKEND_SHAPE is a REST monolith, so every service points at one origin.
 * The registry still exists so moving to a gateway or to split origins later is
 * a config change rather than a refactor of every call site.
 *
 *   .env
 *   VITE_API_BASE_URL=https://api.awning.nyc      # production
 *   VITE_API_BASE_URL=http://localhost:8080       # local backend on port 8080
 */

const base = env.VITE_API_BASE_URL.replace(/\/$/, '')

export const API_BASE = base

/** Per-service origins. All identical today; split them when the backend does. */
export const services = {
  leads: base,
  projects: base,
  chat: base,
  newsletter: base,
} as const

export type ServiceName = keyof typeof services

export const API_TIMEOUT_MS = env.VITE_API_TIMEOUT_MS

/** True once a backend origin is configured. */
export const isLive = base.length > 0

let warned = false

/** One line in the console, once, so nobody ships thinking the API is wired. */
export function warnOffline(operation: string): void {
  if (isLive || warned) return
  warned = true
  console.info(
    `[api] VITE_API_BASE_URL is not set — "${operation}" and every other call ` +
      `are being served from local storage. Nothing is reaching a server.`
  )
}
