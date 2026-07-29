import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from './setup'
import { TEST_API_ORIGIN } from './msw/handlers'

/**
 * Everything here runs with a configured backend, unlike api.test.ts which
 * covers the local-only mode. Modules are re-imported per test because
 * src/env.ts and src/api/config.ts read the environment once, at load.
 */

const withLiveApi = async (timeoutMs = 12_000) => {
  vi.resetModules()
  vi.stubEnv('VITE_API_BASE_URL', TEST_API_ORIGIN)
  vi.stubEnv('VITE_API_TIMEOUT_MS', String(timeoutMs))
  const [api, http_, endpoints, errors, schemas] = await Promise.all([
    import('../src/api/index'),
    import('../src/api/http'),
    import('../src/api/endpoints'),
    import('../src/api/errors'),
    import('../src/api/schemas'),
  ])
  return { api, request: http_.request, ENDPOINTS: endpoints.ENDPOINTS, errors, schemas }
}

beforeEach(() => {
  window.sessionStorage.clear()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('request headers', () => {
  it('stamps every call with a correlation id', async () => {
    const { request, ENDPOINTS } = await withLiveApi()
    let seen: string | null = null

    server.use(
      http.get(`${TEST_API_ORIGIN}${ENDPOINTS.listProjects.path}`, ({ request: req }) => {
        seen = req.headers.get('X-Request-Id')
        return HttpResponse.json({ projects: [] })
      })
    )

    await request(ENDPOINTS.listProjects, { service: 'projects' })
    expect(seen).toMatch(/.{8,}/)
  })

  it('sends an Idempotency-Key on lead creation', async () => {
    const { api, ENDPOINTS } = await withLiveApi()
    const keys: string[] = []

    server.use(
      http.post(`${TEST_API_ORIGIN}${ENDPOINTS.createLead.path}`, ({ request: req }) => {
        const key = req.headers.get('Idempotency-Key')
        if (key) keys.push(key)
        return HttpResponse.json({ ticket: 'NYC-1', createdAt: 1 }, { status: 201 })
      })
    )

    await api.createLead(
      {
        businessName: 'A',
        businessType: 'Laundromat',
        needType: 'First site for the business',
        contact: 'a@b.co',
      },
      'local-1'
    )
    expect(keys).toHaveLength(1)
    expect(keys[0]).toBeTruthy()
  })
})

describe('double submit', () => {
  it('reuses one idempotency key until the server accepts, then rotates', async () => {
    const { api, ENDPOINTS } = await withLiveApi()
    const keys: string[] = []
    let failFirst = true

    server.use(
      http.post(`${TEST_API_ORIGIN}${ENDPOINTS.createLead.path}`, ({ request: req }) => {
        keys.push(req.headers.get('Idempotency-Key') ?? '')
        if (failFirst) {
          failFirst = false
          return new HttpResponse(null, { status: 503 })
        }
        return HttpResponse.json({ ticket: 'NYC-1', createdAt: 1 }, { status: 201 })
      })
    )

    const fields = {
      businessName: 'A',
      businessType: 'Laundromat',
      needType: 'First site for the business',
      contact: 'a@b.co',
    }

    await api.createLead(fields, 'local-1')
    // the retry after 503 must carry the same key, or the studio gets two leads
    expect(keys).toHaveLength(2)
    expect(keys[0]).toBe(keys[1])

    await api.createLead(fields, 'local-2')
    // a genuinely new submission gets a new key
    expect(keys[2]).not.toBe(keys[0])
  })
})

describe('retries', () => {
  it('retries a 503 and succeeds', async () => {
    const { request, ENDPOINTS } = await withLiveApi()
    let calls = 0

    server.use(
      http.get(`${TEST_API_ORIGIN}${ENDPOINTS.listProjects.path}`, () => {
        calls += 1
        if (calls < 3) return new HttpResponse(null, { status: 503 })
        return HttpResponse.json({ projects: [] })
      })
    )

    await request(ENDPOINTS.listProjects, { service: 'projects' })
    expect(calls).toBe(3)
  })

  it('honours Retry-After on 429', async () => {
    const { request, ENDPOINTS } = await withLiveApi()
    let calls = 0

    server.use(
      http.get(`${TEST_API_ORIGIN}${ENDPOINTS.listProjects.path}`, () => {
        calls += 1
        if (calls === 1) {
          return new HttpResponse(null, { status: 429, headers: { 'Retry-After': '0' } })
        }
        return HttpResponse.json({ projects: [] })
      })
    )

    await request(ENDPOINTS.listProjects, { service: 'projects' })
    expect(calls).toBe(2)
  })

  it('gives up after three attempts and reports the status', async () => {
    const { request, ENDPOINTS, errors } = await withLiveApi()
    let calls = 0

    server.use(
      http.get(`${TEST_API_ORIGIN}${ENDPOINTS.listProjects.path}`, () => {
        calls += 1
        return new HttpResponse(null, { status: 503 })
      })
    )

    await expect(
      request(ENDPOINTS.listProjects, { service: 'projects' })
    ).rejects.toBeInstanceOf(errors.ApiError)
    expect(calls).toBe(3)
  })

  it('refuses to retry an unsafe POST that carries no idempotency key', async () => {
    const { request, ENDPOINTS } = await withLiveApi()
    let calls = 0

    server.use(
      http.post(`${TEST_API_ORIGIN}${ENDPOINTS.createLead.path}`, () => {
        calls += 1
        return new HttpResponse(null, { status: 503 })
      })
    )

    await expect(
      request(ENDPOINTS.createLead, { service: 'leads', body: {} })
    ).rejects.toThrow()
    // exactly one: replaying it could create a duplicate lead
    expect(calls).toBe(1)
  })
})

describe('timeout', () => {
  it('aborts a hanging request and reports code "timeout"', async () => {
    const { request, ENDPOINTS, errors } = await withLiveApi(40)

    server.use(
      http.get(`${TEST_API_ORIGIN}${ENDPOINTS.listProjects.path}`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 400))
        return HttpResponse.json({ projects: [] })
      })
    )

    const failure = await request(ENDPOINTS.listProjects, { service: 'projects' }).catch(
      (error: unknown) => error
    )
    expect(failure).toBeInstanceOf(errors.ApiError)
    expect((failure as InstanceType<typeof errors.ApiError>).code).toBe('timeout')
  }, 20_000)
})

describe('contract drift', () => {
  it('raises ContractError, not a crash, when a field goes missing', async () => {
    const { request, ENDPOINTS, errors, schemas } = await withLiveApi()

    server.use(
      http.get(`${TEST_API_ORIGIN}${ENDPOINTS.listProjects.path}`, () =>
        // `projects` renamed server-side — exactly the independent-deploy failure
        HttpResponse.json({ items: [] })
      )
    )

    const failure = await request(ENDPOINTS.listProjects, {
      service: 'projects',
      schema: schemas.ProjectListSchema,
    }).catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(errors.ContractError)
    const contract = failure as InstanceType<typeof errors.ContractError>
    expect(contract.code).toBe('contract')
    expect(contract.issues.length).toBeGreaterThan(0)
  })

  it('does not retry a contract violation', async () => {
    const { request, ENDPOINTS, schemas } = await withLiveApi()
    let calls = 0

    server.use(
      http.get(`${TEST_API_ORIGIN}${ENDPOINTS.listProjects.path}`, () => {
        calls += 1
        return HttpResponse.json({ items: [] })
      })
    )

    await request(ENDPOINTS.listProjects, {
      service: 'projects',
      schema: schemas.ProjectListSchema,
    }).catch(() => undefined)

    // a shape mismatch is fixed by a deploy, so repeating it is pure latency
    expect(calls).toBe(1)
  })
})

describe('blind fallback (removed at stage 3)', () => {
  it('still hides a total outage behind local data, and says so in telemetry', async () => {
    const { api } = await withLiveApi()
    const events: string[] = []
    const stop = api.onTelemetry((event) => events.push(event.name))

    server.use(
      http.get(
        `${TEST_API_ORIGIN}/api/v1/projects`,
        () => new HttpResponse(null, { status: 500 })
      )
    )

    const result = await api.listProjects()
    stop()

    expect(result.sample).toBe(true)
    expect(events).toContain('api_local_fallback')
  })
})
