import { ENDPOINTS } from './endpoints'
import { requestOrLocal, requestOrSample } from './http'
import { readStoredRequest } from './storage'
import {
  beginLeadSubmission,
  completeLeadSubmission,
  messageIdempotencyKey,
} from './idempotency'
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
export type * from './types'

/* ------------------------------------------------------------------- leads */

/**
 * Register a new request.
 *
 * Carries an idempotency key that survives retries and reloads, so a double
 * click cannot produce two leads. Locally this only echoes the id back —
 * ChatWidget owns persistence either way.
 */
export async function createLead(fields: LeadFields, ticket: string): Promise<Lead> {
  const lead = await requestOrLocal<Lead>(
    ENDPOINTS.createLead,
    {
      service: 'leads',
      body: { ...fields, source: 'site-chat' },
      schema: LeadSchema,
      idempotencyKey: beginLeadSubmission(),
    },
    () => ({ ticket, createdAt: Date.now(), local: true }),
    'createLead'
  )
  // accepted: the next submission must be a genuinely new request
  completeLeadSubmission()
  return lead
}

export function getLead(ticket: string): Promise<Lead | null> {
  return requestOrLocal<Lead | null>(
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
  return requestOrLocal<ChatMessage>(
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
  return requestOrLocal<ThreadResponse>(
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
 *
 * Uses requestOrSample, not requestOrLocal: with no backend configured the
 * sample set is the honest answer, but a configured backend that fails must
 * surface as an error the visitor can retry.
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

export function subscribe(email: string): Promise<SubscribeResponse> {
  return requestOrLocal<SubscribeResponse>(
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
