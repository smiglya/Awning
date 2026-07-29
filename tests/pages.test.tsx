import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../src/App'

/**
 * Smoke coverage: each route mounts, renders its own H1, and does not throw.
 * These are the tests that catch a broken import or a bad hook order before
 * anything reaches a browser.
 */

function renderAt(path: string) {
  window.history.pushState({}, '', path)
  return render(<App />)
}

describe('landing page', () => {
  it('mounts and shows the hero headline', () => {
    renderAt('/')
    expect(
      screen.getByRole('heading', { level: 1, name: /this is the portfolio/i })
    ).toBeInTheDocument()
  })

  it('shows the price floor in the hero', () => {
    renderAt('/')
    expect(screen.getByText(/it starts at \$200/i)).toBeInTheDocument()
  })

  it('renders the pricing tiers', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: /one page/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^everything$/i })).toBeInTheDocument()
  })
})

describe('client map page', () => {
  it('mounts and shows its own H1', () => {
    renderAt('/work-map')
    expect(
      screen.getByRole('heading', { level: 1, name: /every borough, same price/i })
    ).toBeInTheDocument()
  })

  it('labels the map as schematic rather than accurate', () => {
    renderAt('/work-map')
    expect(screen.getByText(/schematic map, not to scale/i)).toBeInTheDocument()
  })
})
