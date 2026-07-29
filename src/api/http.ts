import { API_TIMEOUT_MS, isLive, services, warnOffline, type ServiceName } from './config'
import { buildPath, type Endpoint } from './endpoints'
import { ApiError, ContractError } from './errors'
import { parseOrIssues, type Validator } from './schemas'
import { emit } from './telemetry'

export interface RequestOptions<T> {
  /** which origin to hit — all identical while the backend is a monolith */
  service: ServiceName
  params?: Record<string, string | number>
  query?: Record<string, string | number | undefined>
  body?: unknown
  signal?: AbortSignal
  /** validated at the boundary; omit only for endpoints with no body */
  schema?: Validator<T>
  /**
   * Makes an otherwise unsafe POST replayable. Without it a retried POST could
   * create two leads, so retries are refused for POSTs that lack one.
   */
  idempotencyKey?: string
}

const MAX_ATTEMPTS = 3
const BASE_BACKOFF_MS = 300
const MAX_BACKOFF_MS = 8_000
const RETRYABLE_STATUS = new Set([429, 502, 503, 504])

/** AbortSignal.any is recent; jsdom and older Safari still lack it. */
function combineSignals(signals: AbortSignal[]): AbortSignal {
  const withAny = AbortSignal as typeof AbortSignal & {
    any?: (list: AbortSignal[]) => AbortSignal
  }
  if (typeof withAny.any === 'function') return withAny.any(signals)

  const controller = new AbortController()
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason)
      break
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), {
      once: true,
    })
  }
  return controller.signal
}

function timeoutSignal(ms: number): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController()
  const id = setTimeout(
    () => controller.abort(new DOMException('Timeout', 'TimeoutError')),
    ms
  )
  return { signal: controller.signal, cancel: () => clearTimeout(id) }
}

function newRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `rq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** Retry-After is either delta-seconds or an HTTP date. */
function parseRetryAfter(header: string | null, body: unknown): number | undefined {
  if (header) {
    const asNumber = Number(header)
    if (Number.isFinite(asNumber) && asNumber >= 0) return asNumber
    const asDate = Date.parse(header)
    if (Number.isFinite(asDate)) {
      return Math.max(0, Math.round((asDate - Date.now()) / 1000))
    }
  }
  if (isRecord(body) && 'retryAfter' in body) {
    const value = body['retryAfter']
    if (typeof value === 'number' && value >= 0) return value
  }
  return undefined
}

function backoffMs(attempt: number, retryAfterSeconds?: number): number {
  if (retryAfterSeconds !== undefined)
    return Math.min(retryAfterSeconds * 1000, MAX_BACKOFF_MS)
  // exponential with jitter, so a fleet of clients does not resynchronise
  const exponential = Math.min(BASE_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS)
  return exponential + Math.random() * BASE_BACKOFF_MS
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function buildUrl(
  origin: string,
  endpoint: Endpoint,
  params?: Record<string, string | number>,
  query?: Record<string, string | number | undefined>
): string {
  const path = buildPath(endpoint.path, params)
  if (!query) return `${origin}${path}`
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `${origin}${path}?${qs}` : `${origin}${path}`
}

function safeParseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Call a declared endpoint, once per attempt.
 * Cross-cutting concerns live here so no call site has to remember them.
 */
export async function request<T>(
  endpoint: Endpoint,
  options: RequestOptions<T>
): Promise<T> {
  if (!isLive) {
    throw new ApiError('No API base URL configured', { code: 'offline' })
  }

  const origin = services[options.service]
  const url = buildUrl(origin, endpoint, options.params, options.query)
  const requestId = newRequestId()

  const isGet = endpoint.method === 'GET'
  const canRetry = isGet || Boolean(options.idempotencyKey)

  let lastError: ApiError = new ApiError('Request never ran', { code: 'network' })

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const timeout = timeoutSignal(API_TIMEOUT_MS)
    const signals = [timeout.signal]
    if (options.signal) signals.push(options.signal)

    try {
      const headers: Record<string, string> = { 'X-Request-Id': requestId }
      if (options.body !== undefined) headers['Content-Type'] = 'application/json'
      if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey

      const response = await fetch(url, {
        method: endpoint.method,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: combineSignals(signals),
        // AUTH_MODEL is "none" today. When cookies arrive this becomes
        // 'include' and the server needs matching CORS credentials.
        credentials: 'same-origin',
      })

      const text = await response.text()
      const payload = text ? safeParseJson(text) : null

      if (!response.ok) {
        const retryAfter = parseRetryAfter(response.headers.get('Retry-After'), payload)
        const code =
          response.status === 429
            ? 'rate_limited'
            : isRecord(payload) && typeof payload['error'] === 'string'
              ? payload['error']
              : 'http_error'

        lastError = new ApiError(`Request failed (${response.status})`, {
          status: response.status,
          code,
          details: payload,
          requestId,
          ...(retryAfter !== undefined ? { retryAfter } : {}),
        })

        if (
          canRetry &&
          RETRYABLE_STATUS.has(response.status) &&
          attempt < MAX_ATTEMPTS - 1
        ) {
          emit({
            name: 'api_retry',
            requestId,
            code,
            status: response.status,
            attempt: attempt + 1,
          })
          await sleep(backoffMs(attempt, retryAfter))
          continue
        }
        throw lastError
      }

      if (!options.schema) return payload as T

      const parsed = parseOrIssues(options.schema, payload)
      if (!parsed.ok) {
        // never retried: a shape mismatch is fixed by a deploy, not a repeat
        emit({
          name: 'api_contract_violation',
          requestId,
          code: 'contract',
          detail: parsed.issues,
        })
        throw new ContractError(endpoint.path, parsed.issues, requestId)
      }
      return parsed.data
    } catch (error) {
      if (error instanceof ContractError) throw error

      if (error instanceof ApiError) {
        lastError = error
        // already-classified HTTP failures fell through the retry check above
        throw error
      }

      // Classify by which signal fired, not by the error's name: undici, msw
      // and browsers all surface an aborted fetch differently.
      if (options.signal?.aborted) {
        // an abort the caller asked for is not a failure to retry
        throw new ApiError('Request cancelled', { code: 'cancelled', requestId })
      }

      const timedOut = timeout.signal.aborted

      lastError = new ApiError(
        timedOut
          ? 'Request timed out'
          : error instanceof Error
            ? error.message
            : String(error),
        { code: timedOut ? 'timeout' : 'network', requestId }
      )

      if (canRetry && attempt < MAX_ATTEMPTS - 1) {
        emit({
          name: 'api_retry',
          requestId,
          code: lastError.code,
          attempt: attempt + 1,
        })
        await sleep(backoffMs(attempt))
        continue
      }
      throw lastError
    } finally {
      timeout.cancel()
    }
  }

  throw lastError
}

/**
 * Local data only when no backend is configured at all.
 *
 * The distinction that matters: "there is no server yet" is a supported mode
 * and should serve the sample set; "the server is configured and failing" is an
 * outage and must reach the UI. Collapsing the two is what made the error
 * states unreachable.
 */
export async function requestOrSample<T>(
  endpoint: Endpoint,
  options: RequestOptions<T>,
  sample: () => T,
  label: string
): Promise<T> {
  if (!isLive) {
    warnOffline(label)
    return sample()
  }
  return request<T>(endpoint, options)
}

/**
 * Try the server, fall back to a local implementation.
 *
 * NOTE: this is the blind fallback stage 3 replaces with an outbox. It keeps
 * the lead flow working before the backend exists, but it also means a real
 * outage looks like success. Do not add new callers.
 */
export async function requestOrLocal<T>(
  endpoint: Endpoint,
  options: RequestOptions<T>,
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
    const code = error instanceof ApiError ? error.code : 'unknown'
    const requestId = error instanceof ApiError ? error.requestId : undefined
    emit({
      name: 'api_local_fallback',
      code,
      detail: label,
      ...(requestId ? { requestId } : {}),
    })
    console.warn(`[api] "${label}" failed (${code}), using local fallback`)
    return localFallback()
  }
}

export { ApiError, ContractError } from './errors'
