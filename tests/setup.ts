import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { handlers } from './msw/handlers'
import { clearProjectsCache } from '../src/data/useProjects'

export const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  cleanup()
  window.localStorage.clear()
  window.sessionStorage.clear()
  // module-level cache must not leak between tests
  clearProjectsCache()
})
afterAll(() => server.close())

/* --------------------------------------------------------- jsdom gaps --- */
// jsdom implements none of these, and every one of them is used by either
// Framer Motion's viewport triggers or the reduced-motion hooks.

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
})

class MockObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

vi.stubGlobal('IntersectionObserver', MockObserver)
vi.stubGlobal('ResizeObserver', MockObserver)

window.scrollTo = vi.fn()
Element.prototype.scrollIntoView = vi.fn()
