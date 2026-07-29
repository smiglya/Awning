import { http, HttpResponse } from 'msw'
import { ENDPOINTS } from '../../src/api/endpoints'
import { CLIENTS } from '../../src/data/clients'

/**
 * Handlers are derived from ENDPOINTS rather than hand-written URLs, so the
 * tests exercise the same contract the production client calls. A path that
 * drifts in endpoints.ts drifts here too, and the tests fail — which is the
 * point.
 */

export const TEST_API_ORIGIN = 'http://localhost:8080'

const at = (endpoint: { path: string }) => `${TEST_API_ORIGIN}${endpoint.path}`

export const handlers = [
  http.post(at(ENDPOINTS.createLead), () =>
    HttpResponse.json(
      { ticket: 'NYC-260729-TEST', createdAt: 1_767_000_000_000 },
      { status: 201 }
    )
  ),

  http.get(at(ENDPOINTS.getLead), ({ params }) =>
    HttpResponse.json({
      ticket: String(params['ticket']),
      createdAt: 1_767_000_000_000,
      status: 'open',
    })
  ),

  http.post(at(ENDPOINTS.postMessage), async ({ request }) => {
    const body = (await request.json()) as { text: string; clientId: string }
    return HttpResponse.json(
      {
        id: 'srv-1',
        clientId: body.clientId,
        from: 'visitor',
        text: body.text,
        at: '10:00',
      },
      { status: 201 }
    )
  }),

  http.get(at(ENDPOINTS.getThread), () => HttpResponse.json({ messages: [] })),

  http.get(at(ENDPOINTS.listProjects), () =>
    HttpResponse.json({ projects: CLIENTS.slice(0, 3) })
  ),

  http.post(at(ENDPOINTS.subscribe), () =>
    HttpResponse.json({ ok: true }, { status: 202 })
  ),
]
