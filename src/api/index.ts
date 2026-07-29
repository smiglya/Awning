import { isLive, warnOffline } from './config'
import { ENDPOINTS } from './endpoints'
import { request, requestOrSample } from './http'
import { readStoredRequest } from './storage'
import {
  beginLeadSubmission,
  completeLeadSubmission,
  messageIdempotencyKey,
} from './idempotency'
import * as outbox from './outbox'
import { emit } from './telemetry'
import { ApiError } from './errors'
import {
  ChatMessageSchema,
  LeadSchema,
  NullableLeadSchema,
  ProjectListSchema,
  SubscribeSchema,
  ThreadSchema,
} from './schemas'
import { CLIENTS } from '../data/clients'
import type {
  ChatMessage,
  Lead,
  LeadFields,
  ProjectList,
  SubscribeResponse,
  ThreadResponse,
} from './types'

export { ApiError, ContractError } from './errors'
export { ENDPOINTS } from './endpoints'
export { API_BASE, isLive, services } from './config'
export { SUPPORT_STORAGE_KEY } from './storage'
export { onTelemetry } from './telemetry'
export { beginLeadSubmission, completeLeadSubmission } from './idempotency'
export * as outbox from './outbox'
export type * from './types'
export type { OutboxEntry } from './outbox'

/* ------------------------------------------------------------------- leads */

/**
 * Register a new request.
 *
 * With no backend configured this mints a local reference, and the email route
 * in the widget is the real delivery path — a supported mode the panel states
 * outright. With a backend configured, a failure is thrown rather than
 * swallowed: the caller queues it and tells the visitor the truth.
 */
export async function createLead(fields: LeadFields, ticket: string): Promise<Lead> {
  if (!isLive) {
    warnOffline('createLead')
    return { ticket, createdAt: Date.now(), local: true }
  }

  const lead = await request<Lead>(ENDPOINTS.createLead, {
    service: 'leads',
    body: { ...fields, source: 'site-chat' },
    schema: LeadSchema,
    idempotencyKey: beginLeadSubmission(),
  })
  // accepted: the next submission must be a genuinely new request
  completeLeadSubmission()
  return lead
}

/**
 * Queue a lead the server would not take, so it survives a reload and can be
 * retried when the network returns. Emits the event a dashboard watches.
 */
export function queueFailedLead(
  fields: LeadFields,
  ticket: string,
  error: unknown
): void {
  const code = error instanceof ApiError ? error.code : 'unknown'
  const requestId = error instanceof ApiError ? error.requestId : undefined
  emit({
    name: 'lead_submit_failed',
    code,
    ...(requestId ? { requestId } : {}),
    detail: { ticket },
  })
  outbox.enqueue({ ticket, fields, idempotencyKey: beginLeadSubmission() })
}

/**
 * Attempt every queued lead once.
 * @returns how many the server accepted.
 */
export async function flushOutbox(): Promise<number> {
  if (!isLive) return 0
  let delivered = 0

  for (const entry of outbox.list()) {
    try {
      await request<Lead>(ENDPOINTS.createLead, {
        service: 'leads',
        body: { ...entry.fields, source: 'site-chat' },
        schema: LeadSchema,
        idempotencyKey: entry.idempotencyKey,
      })
      outbox.remove(entry.id)
      completeLeadSubmission()
      delivered += 1
      emit({ name: 'lead_delivered_from_outbox', detail: { ticket: entry.ticket } })
    } catch (error) {
      const code = error instanceof ApiError ? error.code : 'unknown'
      outbox.markAttempt(entry.id, code)
    }
  }

  return delivered
}

export function getLead(ticket: string): Promise<Lead | null> {
  return requestOrSample<Lead | null>(
    ENDPOINTS.getLead,
    { service: 'leads', params: { ticket }, schema: NullableLeadSchema },
    () => {
      const state = readStoredRequest()
      if (!state || state.ticket !== ticket) return null
      return {
        ticket,
        createdAt: state.createdAt,
        status: 'open',
        ...(state.lead ? { fields: state.lead } : {}),
      }
    },
    'getLead'
  )
}

/* ---------------------------------------------------------------- messages */

export function postMessage(ticket: string, text: string): Promise<ChatMessage> {
  return requestOrSample<ChatMessage>(
    ENDPOINTS.postMessage,
    {
      service: 'chat',
      params: { ticket },
      body: { text, from: 'visitor' },
      schema: ChatMessageSchema,
      idempotencyKey: messageIdempotencyKey(),
    },
    () => ({
      id: `v-${Date.now()}`,
      from: 'visitor',
      text,
      at: new Date().toISOString(),
      local: true,
    }),
    'postMessage'
  )
}

export function getThread(ticket: string): Promise<ThreadResponse> {
  return requestOrSample<ThreadResponse>(
    ENDPOINTS.getThread,
    { service: 'chat', params: { ticket }, schema: ThreadSchema },
    () => ({ messages: readStoredRequest()?.messages ?? [] }),
    'getThread'
  )
}

/* ---------------------------------------------------------------- projects */

export interface ListProjectsOptions {
  page?: number
  limit?: number
  signal?: AbortSignal
}

/**
 * Portfolio and map pins. Paginated from the start — twelve sample records
 * today, but an unbounded list is a problem that only shows up in production.
 */
export function listProjects(options: ListProjectsOptions = {}): Promise<ProjectList> {
  const { page = 1, limit = 50, signal } = options
  return requestOrSample<ProjectList>(
    ENDPOINTS.listProjects,
    {
      service: 'projects',
      query: { page, limit },
      schema: ProjectListSchema,
      ...(signal ? { signal } : {}),
    },
    () => ({ projects: CLIENTS, sample: true, page: 1, limit, total: CLIENTS.length }),
    'listProjects'
  )
}

/* -------------------------------------------------------------- newsletter */

/** Throws on a live failure: a silent "subscribed" would be a lie. */
export function subscribe(email: string): Promise<SubscribeResponse> {
  return requestOrSample<SubscribeResponse>(
    ENDPOINTS.subscribe,
    {
      service: 'newsletter',
      body: { email, source: 'footer' },
      schema: SubscribeSchema,
      idempotencyKey: messageIdempotencyKey(),
    },
    () => ({ ok: true, local: true }),
    'subscribe'
  )
}
