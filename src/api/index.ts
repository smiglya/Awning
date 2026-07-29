import { ENDPOINTS } from './endpoints'
import { requestOrLocal } from './http'
import { readStoredRequest } from './storage'
import { CLIENTS } from '../data/clients'
import type {
  ChatMessage,
  Lead,
  LeadFields,
  ProjectList,
  SubscribeResponse,
  ThreadResponse,
} from './types'

export { ApiError } from './http'
export { ENDPOINTS } from './endpoints'
export { API_BASE, isLive } from './config'
export { SUPPORT_STORAGE_KEY } from './storage'
export type * from './types'

/* ------------------------------------------------------------------- leads */

/**
 * Register a new request. Locally this only echoes the id back —
 * ChatWidget owns persistence either way.
 */
export function createLead(fields: LeadFields, ticket: string): Promise<Lead> {
  return requestOrLocal<Lead>(
    ENDPOINTS.createLead,
    { body: { ...fields, source: 'site-chat' } },
    () => ({ ticket, createdAt: Date.now(), local: true }),
    'createLead'
  )
}

export function getLead(ticket: string): Promise<Lead | null> {
  return requestOrLocal<Lead | null>(
    ENDPOINTS.getLead,
    { params: { ticket } },
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
    { params: { ticket }, body: { text, from: 'visitor' } },
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
    { params: { ticket } },
    () => ({ messages: readStoredRequest()?.messages ?? [] }),
    'getThread'
  )
}

/* ---------------------------------------------------------------- projects */

/** Portfolio and map pins. Falls back to the sample set in data/clients. */
export function listProjects(): Promise<ProjectList> {
  return requestOrLocal<ProjectList>(
    ENDPOINTS.listProjects,
    {},
    () => ({ projects: CLIENTS, sample: true }),
    'listProjects'
  )
}

/* -------------------------------------------------------------- newsletter */

export function subscribe(email: string): Promise<SubscribeResponse> {
  return requestOrLocal<SubscribeResponse>(
    ENDPOINTS.subscribe,
    { body: { email, source: 'footer' } },
    () => ({ ok: true, local: true }),
    'subscribe'
  )
}
