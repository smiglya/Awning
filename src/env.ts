/**
 * Environment validated once, at module load, so a typo surfaces immediately
 * instead of becoming `undefined` somewhere deep in a fetch call.
 *
 * Hand-written rather than schema-driven on purpose: two variables did not
 * justify the 16.6 kB gzip that pulling zod into the client bundle cost. The
 * zod-vs-valibot decision belongs to stage 1, where response schemas give a
 * validator real work to do — see the stage 0 report.
 *
 * VITE_API_BASE_URL is intentionally allowed to be empty: that is the current,
 * supported "no backend yet" mode in which every call in src/api/ resolves
 * against local storage. It becomes required at stage 3, when the blind local
 * fallback is replaced by an outbox.
 */

const DEFAULT_TIMEOUT_MS = 12_000
const MAX_TIMEOUT_MS = 120_000

class EnvError extends Error {
  constructor(variable: string, problem: string, received: unknown) {
    super(
      `Invalid environment configuration.\n  ${variable}: ${problem}\n  received: ${JSON.stringify(received)}\n` +
        `  See .env.example for the expected shape.`
    )
    this.name = 'EnvError'
  }
}

function readBaseUrl(raw: unknown): string {
  if (raw === undefined || raw === null || raw === '') return ''
  if (typeof raw !== 'string') {
    throw new EnvError('VITE_API_BASE_URL', 'must be a string', raw)
  }
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new EnvError(
      'VITE_API_BASE_URL',
      'must be an absolute URL such as https://api.awning.nyc or http://localhost:8080',
      raw
    )
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new EnvError('VITE_API_BASE_URL', 'must use http or https', raw)
  }
  return raw
}

function readTimeout(raw: unknown): number {
  if (raw === undefined || raw === null || raw === '') return DEFAULT_TIMEOUT_MS
  const value = Number(raw)
  if (!Number.isInteger(value) || value <= 0 || value > MAX_TIMEOUT_MS) {
    throw new EnvError(
      'VITE_API_TIMEOUT_MS',
      `must be a positive integer no greater than ${MAX_TIMEOUT_MS}`,
      raw
    )
  }
  return value
}

export const env = {
  VITE_API_BASE_URL: readBaseUrl(import.meta.env.VITE_API_BASE_URL),
  VITE_API_TIMEOUT_MS: readTimeout(import.meta.env.VITE_API_TIMEOUT_MS),
} as const

export type Env = typeof env
