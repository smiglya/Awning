import { http, HttpResponse } from 'msw'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from './setup'
import { TEST_API_ORIGIN } from './msw/handlers'
import { clearProjectsCache } from '../src/data/useProjects'
import App from '../src/App'

/**
 * Stage 2 acceptance: with the backend stubbed out, the portfolio and the map
 * show an error with a retry — not an empty section and not a crash.
 */

const renderAt = (path: string) => {
  window.history.pushState({}, '', path)
  return render(<App />)
}

beforeEach(() => {
  clearProjectsCache()
})

afterEach(() => {
  vi.unstubAllEnvs()
  clearProjectsCache()
})

describe('projects load through the API layer', () => {
  it('shows the sample set when no backend is configured', async () => {
    renderAt('/')
    expect(
      await screen.findByRole('heading', { name: /Knickerbocker Pizza/i })
    ).toBeInTheDocument()
  })

  it('reserves the card boxes while loading instead of collapsing', () => {
    renderAt('/')
    // skeletons are decorative; what matters is that the grid exists at once
    const grid = document.querySelector('.work-grid')
    expect(grid).not.toBeNull()
    expect(grid?.children.length).toBe(6)
  })
})

describe('a configured backend that fails', () => {
  const withDownBackend = async () => {
    vi.resetModules()
    vi.stubEnv('VITE_API_BASE_URL', TEST_API_ORIGIN)
    server.use(
      http.get(
        `${TEST_API_ORIGIN}/api/v1/projects`,
        () => new HttpResponse(null, { status: 500 })
      )
    )
    const mod = await import('../src/App')
    return mod.default
  }

  it('surfaces an error with a retry on the landing page', async () => {
    const LiveApp = await withDownBackend()
    window.history.pushState({}, '', '/')
    render(<LiveApp />)

    expect(await screen.findByRole('alert', {}, { timeout: 10_000 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  }, 20_000)

  it('recovers when retry succeeds', async () => {
    const LiveApp = await withDownBackend()
    window.history.pushState({}, '', '/')
    render(<LiveApp />)

    const retry = await screen.findByRole(
      'button',
      { name: /try again/i },
      { timeout: 10_000 }
    )

    server.use(
      http.get(`${TEST_API_ORIGIN}/api/v1/projects`, () =>
        HttpResponse.json({
          projects: [
            {
              id: 'p1',
              client: 'Recovered Deli',
              category: 'Bodega',
              neighbourhood: 'Fordham',
              borough: 'The Bronx',
              price: '$200',
              days: '1 day',
              pages: '1',
              blurb: 'Came back after a retry.',
            },
          ],
        })
      )
    )

    await userEvent.click(retry)
    expect(
      await screen.findByRole('heading', { name: /Recovered Deli/i })
    ).toBeInTheDocument()
  }, 20_000)

  it('surfaces the error on the map page too', async () => {
    const LiveApp = await withDownBackend()
    window.history.pushState({}, '', '/work-map')
    render(<LiveApp />)

    expect(await screen.findByRole('alert', {}, { timeout: 10_000 })).toBeInTheDocument()
  }, 20_000)
})

describe('empty result', () => {
  it('says so rather than rendering an empty grid', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_API_BASE_URL', TEST_API_ORIGIN)
    server.use(
      http.get(`${TEST_API_ORIGIN}/api/v1/projects`, () =>
        HttpResponse.json({ projects: [] })
      )
    )
    const { default: LiveApp } = await import('../src/App')
    window.history.pushState({}, '', '/')
    render(<LiveApp />)

    expect(await screen.findByText(/No builds to show yet/i)).toBeInTheDocument()
  }, 20_000)
})
