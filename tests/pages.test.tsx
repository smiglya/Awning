import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../src/App'
import { ADDONS, PRICING } from '../src/data/copy'

/** Tier names carry a +, which a bare RegExp would read as a quantifier. */
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

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
      screen.getByRole('heading', { level: 1, name: /the price is on the page/i })
    ).toBeInTheDocument()
  })

  it('shows the price floor in the hero', () => {
    renderAt('/')
    // the headline names the number rather than promising a conversation about
    // it, which is the whole positioning — so it is worth a test of its own
    expect(
      screen.getByText(new RegExp(`it starts at \\${PRICING.tiers[0]?.price}`, 'i'))
    ).toBeInTheDocument()
  })

  it('renders every pricing tier', () => {
    renderAt('/')
    for (const tier of PRICING.tiers) {
      expect(
        screen.getByRole('heading', { name: new RegExp(`^${escape(tier.name)}$`) }),
        tier.name
      ).toBeInTheDocument()
    }
  })

  it('gives the orange button to exactly one tier', () => {
    renderAt('/')
    // .pill-cta is the only filled button the page allows, and the brief spends
    // it on Pro. Two of them means the eye has nowhere to land.
    const filled = document.querySelectorAll('.tier .pill-cta')
    expect(filled).toHaveLength(1)
    expect(filled[0]?.textContent).toBe(PRICING.tiers.find((t) => t.featured)?.cta)
  })

  it('shows no price from the retired offer', () => {
    renderAt('/')
    // Rendered text, not source. The rolling-number demo assembled "$200" one
    // digit at a time, so it matched no grep and outlived the offer it quoted.
    const rendered = document.body.textContent ?? ''
    for (const stale of ['$200', '$500', '$900', '$450']) {
      expect(rendered, `page still shows ${stale}`).not.toContain(stale)
    }
  })

  it('publishes the add-on prices', () => {
    renderAt('/')
    for (const group of ADDONS.groups) {
      expect(
        screen.getByRole('heading', { name: group.head }),
        group.head
      ).toBeInTheDocument()
    }
    // the section exists to put a number beside every line
    expect(screen.getAllByText(/^\$[\d,]/).length).toBeGreaterThan(20)
  })
})

describe('client map page', () => {
  it('mounts and shows its own H1', () => {
    renderAt('/work-map')
    expect(
      screen.getByRole('heading', { level: 1, name: /every borough, same price/i })
    ).toBeInTheDocument()
  })

  it('labels the map as schematic rather than accurate', async () => {
    renderAt('/work-map')
    expect(await screen.findByText(/schematic map, not to scale/i)).toBeInTheDocument()
  })
})
