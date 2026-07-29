import { API_BASE, API_TIMEOUT_MS, isLive, warnOffline } from './config'
import { buildPath, type Endpoint } from './endpoints'

/**
 * Free-form because the server may return its own codes. Known client-side
 * values: 'offline' | 'timeout' | 'network' | 'http_error'.
 */
export type ApiErrorCode = string

/** Normalised failure shape, so callers never have to inspect fetch internals. */
export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly details: unknown

  constructor(
    message: string,
    {
      status = 0,
      code = 'network',
      details = null,
    }: { status?: number; code?: ApiErrorCode; details?: unknown } = {}
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export interface RequestOptions {
  params?: Record<string, string | number>
  body?: unknown
  signal?: AbortSignal
}

/** Call a declared endpoint. */
export async function request<T = unknown>(
  endpoint: Endpoint,
  { params, body, signal }: RequestOptions = {}
): Promise<T> {
  if (!isLive) {
    throw new ApiError('No API base URL configured', { code: 'offline' })
  }

  const url = `${API_BASE}${buildPath(endpoint.path, params)}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  // caller aborts propagate to ours
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true })

  try {
    const response = await fetch(url, {
      method: endpoint.method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    const text = await response.text()
    const payload = text ? safeParse(text) : null

    if (!response.ok) {
      const errorCode =
        isRecord(payload) && typeof payload.error === 'string'
          ? payload.error
          : 'http_error'
      throw new ApiError(`Request failed (${response.status})`, {
        status: response.status,
        code: errorCode,
        details: payload,
      })
    }

    return payload as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('Request timed out', { code: 'timeout' })
    }
    throw new ApiError(error instanceof Error ? error.message : String(error), {
      code: 'network',
    })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Try the server, fall back to a local implementation.
 * This is what keeps every screen working before the backend exists.
 */
export async function requestOrLocal<T>(
  endpoint: Endpoint,
  options: RequestOptions,
  localFallback: () => T,
  label: string
): Promise<T> {
  if (!isLive) {
    warnOffline(label)
    return localFallback()
  }
  try {
    return await request<T>(endpoint, options)
  } catch (error) {
    // a configured-but-unreachable API must not take the UI down with it
    const code = error instanceof ApiError ? error.code : 'unknown'
    console.warn(`[api] "${label}" failed (${code}), using local fallback`)
    return localFallback()
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
