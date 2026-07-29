import type { ValidationFailure } from './schemas'

/**
 * Known client-side codes. The server may add its own, so the type stays open.
 */
export type ApiErrorCode =
  | 'offline'
  | 'timeout'
  | 'network'
  | 'http_error'
  | 'contract'
  | 'rate_limited'
  | (string & {})

/** Normalised failure shape, so callers never have to inspect fetch internals. */
export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly details: unknown
  readonly requestId: string | undefined
  /** seconds the server asked us to wait, when it said so */
  readonly retryAfter: number | undefined

  constructor(
    message: string,
    options: {
      status?: number
      code?: ApiErrorCode
      details?: unknown
      requestId?: string
      retryAfter?: number
    } = {}
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = options.status ?? 0
    this.code = options.code ?? 'network'
    this.details = options.details ?? null
    this.requestId = options.requestId
    this.retryAfter = options.retryAfter
  }
}

/**
 * The server answered, but not with the shape the contract promises.
 * Distinct from a transport failure because the fix is a deploy, not a retry.
 */
export class ContractError extends ApiError {
  readonly issues: ValidationFailure[]

  constructor(endpointPath: string, issues: ValidationFailure[], requestId?: string) {
    const summary = issues
      .slice(0, 3)
      .map((issue) => `${issue.path}: ${issue.message}`)
      .join('; ')
    super(`Response from ${endpointPath} does not match the contract — ${summary}`, {
      code: 'contract',
      status: 200,
      details: issues,
      ...(requestId ? { requestId } : {}),
    })
    this.name = 'ContractError'
    this.issues = issues
  }
}
