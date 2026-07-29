import { http, HttpResponse } from 'msw'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from './setup'
import { TEST_API_ORIGIN } from './msw/handlers'
import { ErrorBoundary } from '../src/components/ErrorBoundary'
import { onTelemetry } from '../src/api/telemetry'
import * as outbox from '../src/api/outbox'

/**
 * Stage 3 acceptance. Each of these pins a behaviour that used to be a lie:
 * a lost lead reported as success, and a widget crash blanking the page.
 */

beforeEach(() => {
  outbox.clear()
  window.sessionStorage.clear()
})

afterEach(() => {
  vi.unstubAllEnvs()
  outbox.clear()
})

/* ------------------------------------------------------------ boundaries */

function Boom(): never {
  throw new Error('deliberate test crash')
}

describe('error boundaries', () => {
  it('contains a crash to its own subtree', () => {
    // React logs the caught error; that noise is expected here
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <div>
        <p>sibling content survives</p>
        <ErrorBoundary label="map" variant="inline">
          <Boom />
        </ErrorBoundary>
      </div>
    )

    expect(screen.getByText(/sibling content survives/i)).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(/map could not be displayed/i)
    spy.mockRestore()
  })

  it('reports the crash to telemetry with the boundary name', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const events: { name: string; detail?: unknown }[] = []
    const stop = onTelemetry((event) => events.push(event))

    render(
      <ErrorBoundary label="map" variant="inline">
        <Boom />
      </ErrorBoundary>
    )

    stop()
    spy.mockRestore()

    const crash = events.find((event) => event.name === 'ui_crash')
    expect(crash).toBeDefined()
    expect(JSON.stringify(crash?.detail)).toContain('map')
  })

  it('offers a reload on the page-level fallback', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    )
    expect(screen.getByRole('button', { name: /reload the page/i })).toBeInTheDocument()
    spy.mockRestore()
  })
})

/* ----------------------------------------------------------------- 404 */

describe('unknown routes', () => {
  it('renders a real 404 instead of the landing page', async () => {
    const { default: App } = await import('../src/App')
    window.history.pushState({}, '', '/pricing-typo')
    render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: /that page is not here/i })
    ).toBeInTheDocument()
    // the hero headline must NOT be present, or this is a soft 404
    expect(screen.queryByText(/this is the portfolio/i)).not.toBeInTheDocument()
  })
})

/* ---------------------------------------------------------------- outbox */

describe('a lead the server refuses', () => {
  const withDownLeads = async () => {
    vi.resetModules()
    vi.stubEnv('VITE_API_BASE_URL', TEST_API_ORIGIN)
    server.use(
      http.post(
        `${TEST_API_ORIGIN}/api/v1/leads`,
        () => new HttpResponse(null, { status: 500 })
      )
    )
    return import('../src/api/index')
  }

  it('is queued, not silently dropped', async () => {
    const api = await withDownLeads()
    const fields = {
      businessName: 'Corner Deli',
      businessType: 'Bodega or deli',
      needType: 'First site for the business',
      contact: 'deli@example.com',
    }

    await expect(api.createLead(fields, 'NYC-1')).rejects.toThrow()
    api.queueFailedLead(fields, 'NYC-1', new Error('boom'))

    expect(api.outbox.has('NYC-1')).toBe(true)
  }, 20_000)

  it('emits lead_submit_failed so the loss is visible to the studio', async () => {
    const api = await withDownLeads()
    const events: string[] = []
    const stop = api.onTelemetry((event) => events.push(event.name))

    api.queueFailedLead(
      {
        businessName: 'A',
        businessType: 'Laundromat',
        needType: 'First site for the business',
        contact: 'a@b.co',
      },
      'NYC-2',
      new Error('boom')
    )
    stop()

    expect(events).toContain('lead_submit_failed')
  }, 20_000)

  it('delivers from the queue once the server recovers', async () => {
    const api = await withDownLeads()
    api.queueFailedLead(
      {
        businessName: 'A',
        businessType: 'Laundromat',
        needType: 'First site for the business',
        contact: 'a@b.co',
      },
      'NYC-3',
      new Error('boom')
    )
    expect(api.outbox.has('NYC-3')).toBe(true)

    server.use(
      http.post(`${TEST_API_ORIGIN}/api/v1/leads`, () =>
        HttpResponse.json({ ticket: 'NYC-3', createdAt: 1 }, { status: 201 })
      )
    )

    const delivered = await api.flushOutbox()
    expect(delivered).toBe(1)
    expect(api.outbox.has('NYC-3')).toBe(false)
  }, 20_000)

  it('replays with the original idempotency key, so no duplicate is created', async () => {
    const api = await withDownLeads()
    const keys: string[] = []

    api.queueFailedLead(
      {
        businessName: 'A',
        businessType: 'Laundromat',
        needType: 'First site for the business',
        contact: 'a@b.co',
      },
      'NYC-4',
      new Error('boom')
    )
    const queuedKey = api.outbox.list()[0]?.idempotencyKey

    server.use(
      http.post(`${TEST_API_ORIGIN}/api/v1/leads`, ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key') ?? '')
        return HttpResponse.json({ ticket: 'NYC-4', createdAt: 1 }, { status: 201 })
      })
    )

    await api.flushOutbox()
    expect(keys[0]).toBe(queuedKey)
  }, 20_000)
})

/* ------------------------------------------------------- widget honesty */

describe('the chat panel after a refused submission', () => {
  it('tells the visitor it has not been sent', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_API_BASE_URL', TEST_API_ORIGIN)
    server.use(
      http.post(
        `${TEST_API_ORIGIN}/api/v1/leads`,
        () => new HttpResponse(null, { status: 500 })
      )
    )

    const { default: App } = await import('../src/App')
    window.history.pushState({}, '', '/')
    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: /chat with us/i }))
    await userEvent.type(screen.getByLabelText(/business name/i), 'Corner Deli')
    await userEvent.click(screen.getByRole('button', { name: /^Bodega or deli$/i }))
    await userEvent.click(
      screen.getByRole('button', { name: /^First site for the business$/i })
    )
    await userEvent.type(screen.getByLabelText(/email or phone/i), 'deli@example.com')
    await userEvent.click(screen.getByRole('button', { name: /start my request/i }))

    expect(
      await screen.findByText(/not sent yet/i, {}, { timeout: 15_000 })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try sending now/i })).toBeInTheDocument()
  }, 40_000)
})
