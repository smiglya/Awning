import { http, HttpResponse } from 'msw'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from './setup'
import { TEST_API_ORIGIN } from './msw/handlers'
import * as outbox from '../src/api/outbox'

/**
 * Stage 4. The transport stays simulated, so what is under test is the seam:
 * optimistic bubbles reconcile instead of duplicating, a failed message says so
 * and can be retried, and the disclosure follows whoever is actually answering.
 */

beforeEach(() => {
  outbox.clear()
  window.sessionStorage.clear()
})

afterEach(() => {
  vi.unstubAllEnvs()
  outbox.clear()
})

async function openThread(live: boolean) {
  vi.resetModules()
  if (live) vi.stubEnv('VITE_API_BASE_URL', TEST_API_ORIGIN)
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
  await screen.findByLabelText(/write a message/i, {}, { timeout: 10_000 })
}

describe('the qualifying form opens a thread', () => {
  it('carries the answers into the first bubble', async () => {
    await openThread(false)
    expect(screen.getByText(/Corner Deli · Bodega or deli/i)).toBeInTheDocument()
  }, 40_000)

  it('states that replies are automated, not a person', async () => {
    await openThread(false)
    expect(screen.getByText(/replies here are automated/i)).toBeInTheDocument()
  }, 40_000)
})

describe('an undeliverable message', () => {
  it('is marked undelivered and offers a retry, rather than vanishing', async () => {
    server.use(
      http.post(`${TEST_API_ORIGIN}/api/v1/leads`, () =>
        HttpResponse.json({ ticket: 'NYC-9', createdAt: 1 }, { status: 201 })
      ),
      http.post(
        `${TEST_API_ORIGIN}/api/v1/leads/:ticket/messages`,
        () => new HttpResponse(null, { status: 500 })
      ),
      http.get(`${TEST_API_ORIGIN}/api/v1/leads/:ticket/messages`, () =>
        HttpResponse.json({ messages: [] })
      )
    )

    await openThread(true)
    await userEvent.type(screen.getByLabelText(/write a message/i), 'Do you do menus?')
    await userEvent.click(screen.getByRole('button', { name: /^send$/i }))

    // the bubble stays put — losing the typed text would be the worst outcome
    expect(screen.getByText(/Do you do menus\?/i)).toBeInTheDocument()
    expect(
      await screen.findByText(/not delivered/i, {}, { timeout: 15_000 })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^retry$/i })).toBeInTheDocument()
  }, 60_000)
})

describe('reconciliation on reopen', () => {
  it('does not duplicate a sent message when the thread is refetched', async () => {
    // stands in for the server's store, so the GET returns what the POST saved
    const stored: unknown[] = []

    server.use(
      http.post(`${TEST_API_ORIGIN}/api/v1/leads`, () =>
        HttpResponse.json({ ticket: 'NYC-8', createdAt: 1 }, { status: 201 })
      ),
      http.post(
        `${TEST_API_ORIGIN}/api/v1/leads/:ticket/messages`,
        async ({ request }) => {
          const body = (await request.json()) as { text: string; clientId: string }
          const saved = {
            id: 'server-side-id',
            clientId: body.clientId,
            from: 'visitor',
            text: body.text,
            at: '10:00',
          }
          stored.push(saved)
          return HttpResponse.json(saved, { status: 201 })
        }
      ),
      http.get(`${TEST_API_ORIGIN}/api/v1/leads/:ticket/messages`, () =>
        HttpResponse.json({ messages: stored })
      )
    )

    await openThread(true)
    await userEvent.type(screen.getByLabelText(/write a message/i), 'Only once please')
    await userEvent.click(screen.getByRole('button', { name: /^send$/i }))
    expect(
      await screen.findAllByText(/Only once please/i, {}, { timeout: 15_000 })
    ).toHaveLength(1)

    // close and reopen: the refetch must reconcile, not append
    await userEvent.click(screen.getByRole('button', { name: /^close chat$/i }))
    await userEvent.click(screen.getByRole('button', { name: /back to your request/i }))

    const matches = await screen.findAllByText(
      /Only once please/i,
      {},
      { timeout: 15_000 }
    )
    expect(matches).toHaveLength(1)
  }, 60_000)
})

describe('who is answering', () => {
  it('drops the "automated" claim once a human replies', async () => {
    server.use(
      http.post(`${TEST_API_ORIGIN}/api/v1/leads`, () =>
        HttpResponse.json({ ticket: 'NYC-7', createdAt: 1 }, { status: 201 })
      ),
      http.get(`${TEST_API_ORIGIN}/api/v1/leads/:ticket/messages`, () =>
        HttpResponse.json({
          messages: [
            {
              id: 'h1',
              from: 'support',
              text: 'Hi, this is Maria from the studio.',
              at: '10:02',
              authorKind: 'human',
              agent: { name: 'Maria' },
            },
          ],
        })
      )
    )

    await openThread(true)

    expect(
      await screen.findByText(
        /someone from the studio is on this thread/i,
        {},
        { timeout: 15_000 }
      )
    ).toBeInTheDocument()
    expect(screen.queryByText(/replies here are automated/i)).not.toBeInTheDocument()
  }, 60_000)

  it('says "assistant", not "person", when an LLM answers', async () => {
    server.use(
      http.post(`${TEST_API_ORIGIN}/api/v1/leads`, () =>
        HttpResponse.json({ ticket: 'NYC-6', createdAt: 1 }, { status: 201 })
      ),
      http.get(`${TEST_API_ORIGIN}/api/v1/leads/:ticket/messages`, () =>
        HttpResponse.json({
          messages: [
            {
              id: 'a1',
              from: 'support',
              text: 'A four page build is $450.',
              at: '10:02',
              authorKind: 'assistant',
              agent: { name: 'Awning assistant' },
            },
          ],
        })
      )
    )

    await openThread(true)

    expect(
      await screen.findByText(/you are talking to an assistant/i, {}, { timeout: 15_000 })
    ).toBeInTheDocument()
  }, 60_000)
})
