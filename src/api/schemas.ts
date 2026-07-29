import * as v from 'valibot'

/**
 * Runtime shape of every response declared in endpoints.ts.
 *
 * With the backend deployed independently of this bundle, contract drift is the
 * single most likely production failure: a renamed field ships, the client
 * reads `undefined`, and the screen breaks somewhere far from the cause.
 * Parsing at the boundary turns that into one typed ContractError with the
 * offending path attached.
 */

const isoOrClock = v.string()

export const LeadFieldsSchema = v.object({
  businessName: v.string(),
  businessType: v.string(),
  needType: v.string(),
  contact: v.string(),
  budget: v.optional(v.string()),
})

export const LeadSchema = v.object({
  ticket: v.pipe(v.string(), v.minLength(1)),
  createdAt: v.number(),
  status: v.optional(v.string()),
  fields: v.optional(LeadFieldsSchema),
  local: v.optional(v.boolean()),
})

export const AgentInfoSchema = v.object({
  name: v.optional(v.string()),
  model: v.optional(v.string()),
})

export const ChatMessageSchema = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  from: v.picklist(['support', 'visitor']),
  text: v.string(),
  at: isoOrClock,
  clientId: v.optional(v.string()),
  // unknown kinds are rejected on purpose: the disclosure text depends on this,
  // and guessing would mean mislabelling who is answering
  authorKind: v.optional(v.picklist(['scripted', 'assistant', 'human'])),
  agent: v.optional(AgentInfoSchema),
  local: v.optional(v.boolean()),
})

export const ThreadSchema = v.object({
  messages: v.array(ChatMessageSchema),
})

export const ProjectSchema = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  client: v.string(),
  category: v.string(),
  neighbourhood: v.string(),
  borough: v.string(),
  price: v.string(),
  days: v.string(),
  pages: v.string(),
  blurb: v.string(),
  shotUrl: v.optional(v.string()),
})

export const ProjectListSchema = v.object({
  projects: v.array(ProjectSchema),
  sample: v.optional(v.boolean()),
  /** present once the server paginates; absent while the sample set is served */
  page: v.optional(v.number()),
  limit: v.optional(v.number()),
  total: v.optional(v.number()),
})

export const SubscribeSchema = v.object({
  ok: v.boolean(),
  local: v.optional(v.boolean()),
})

/** getLead answers null for an unknown ticket rather than 404-ing the UI. */
export const NullableLeadSchema = v.nullable(LeadSchema)

export type Validator<T> = v.BaseSchema<unknown, T, v.BaseIssue<unknown>>

export interface ValidationFailure {
  path: string
  message: string
}

/** Narrow wrapper so the rest of the layer never imports valibot directly. */
export function parseOrIssues<T>(
  schema: Validator<T>,
  value: unknown
): { ok: true; data: T } | { ok: false; issues: ValidationFailure[] } {
  const result = v.safeParse(schema, value)
  if (result.success) return { ok: true, data: result.output }

  return {
    ok: false,
    issues: result.issues.map((issue) => ({
      path: issue.path?.map((segment) => String(segment.key)).join('.') || '(root)',
      message: issue.message,
    })),
  }
}
