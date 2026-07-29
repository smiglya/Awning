/**
 * API CONTRACT — the backend is not built yet.
 *
 * This file is the single source of truth for what the server must expose.
 * The frontend already calls every route below through src/api/http.js; while
 * VITE_API_BASE_URL is unset each call transparently falls back to local
 * storage so the site is fully usable, and the moment the base URL is set the
 * same calls go over the wire with no component changes.
 *
 * Ports / origins are configured in .env, not here — see src/api/config.js.
 *
 * ---------------------------------------------------------------------------
 * POST /api/v1/leads
 *   body   { businessName, businessType, needType, contact, budget?, source }
 *   201    { ticket, createdAt }
 *   400    { error: 'validation', fields: { [field]: message } }
 *   429    { error: 'rate_limited', retryAfter }
 *
 * GET /api/v1/leads/:ticket
 *   200    { ticket, createdAt, status, fields }
 *   404    { error: 'not_found' }
 *
 * POST /api/v1/leads/:ticket/messages
 *   body   { text, from: 'visitor' }
 *   201    { id, from, text, at }
 *
 * GET /api/v1/leads/:ticket/messages
 *   200    { messages: [{ id, from: 'visitor'|'support', text, at }] }
 *
 * GET /api/v1/projects
 *   200    { projects: [{ id, client, category, neighbourhood, borough,
 *                         price, days, pages, blurb, shotUrl }] }
 *   Replaces the hard-coded sample list in src/data/clients.js.
 *
 * POST /api/v1/newsletter
 *   body   { email, source }
 *   202    { ok: true }
 *   409    { error: 'already_subscribed' }
 * ---------------------------------------------------------------------------
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface Endpoint {
  readonly method: HttpMethod
  readonly path: string
}

export const ENDPOINTS = {
  createLead: { method: 'POST', path: '/api/v1/leads' },
  getLead: { method: 'GET', path: '/api/v1/leads/:ticket' },
  postMessage: { method: 'POST', path: '/api/v1/leads/:ticket/messages' },
  getThread: { method: 'GET', path: '/api/v1/leads/:ticket/messages' },
  listProjects: { method: 'GET', path: '/api/v1/projects' },
  subscribe: { method: 'POST', path: '/api/v1/newsletter' },
} as const satisfies Record<string, Endpoint>

export type EndpointName = keyof typeof ENDPOINTS

/** Fill :params in a path template. */
export function buildPath(
  template: string,
  params: Record<string, string | number> = {}
): string {
  return template.replace(/:([a-zA-Z]+)/g, (_: string, key: string) => {
    const value = params[key]
    if (value === undefined || value === null) {
      throw new Error(`Missing path parameter "${key}" for ${template}`)
    }
    return encodeURIComponent(String(value))
  })
}
