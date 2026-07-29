/**
 * Domain shapes shared by the API layer and the components that render them.
 * These mirror the response bodies documented in endpoints.ts.
 */

export interface LeadFields {
  businessName: string
  businessType: string
  needType: string
  contact: string
  budget?: string
}

export interface Lead {
  ticket: string
  createdAt: number
  status?: string
  fields?: LeadFields
  /** true when the value was produced locally because no API is configured */
  local?: boolean
}

export type MessageAuthor = 'support' | 'visitor'

export interface ChatMessage {
  id: string
  from: MessageAuthor
  text: string
  at: string
  local?: boolean
}

export interface Project {
  id: string
  client: string
  category: string
  /** must match a key in data/nycMap NEIGHBOURHOODS or the pin will not render */
  neighbourhood: string
  borough: string
  price: string
  days: string
  pages: string
  blurb: string
  shotUrl?: string
}

export interface ProjectList {
  projects: Project[]
  /** true while the placeholder set in data/clients is being served */
  sample?: boolean
}

export interface ThreadResponse {
  messages: ChatMessage[]
}

export interface SubscribeResponse {
  ok: boolean
  local?: boolean
}

/** Shape persisted under the support storage key. */
export interface StoredRequest {
  v: 1
  createdAt: number
  ticket: string
  lead: LeadFields | null
  messages: ChatMessage[]
  scriptIndex: number
}
