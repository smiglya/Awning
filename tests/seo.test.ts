import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  isIndexable,
  jsonLdFor,
  metaFor,
  NOT_FOUND_META,
  ROUTE_META,
  SITE_URL,
} from '../src/seo'
import { toAppPath, toHref } from '../src/router'

/**
 * The site sells "built to be found", so these are correctness tests, not
 * cosmetics. Each one pins a mistake that is easy to make and invisible until
 * a crawler or a link scraper is looking.
 */

describe('route metadata', () => {
  it('keeps every title inside the length search engines display', () => {
    for (const route of ROUTE_META) {
      expect(route.title.length, route.path).toBeLessThanOrEqual(60)
    }
  })

  it('gives every route a description in the useful range', () => {
    for (const route of ROUTE_META) {
      expect(route.description.length, route.path).toBeGreaterThanOrEqual(120)
      expect(route.description.length, route.path).toBeLessThanOrEqual(180)
    }
  })

  it('never repeats a description between routes', () => {
    const seen = new Set(ROUTE_META.map((route) => route.description))
    expect(seen.size).toBe(ROUTE_META.length)
  })

  it('resolves an unknown path to the noindex 404 metadata', () => {
    const meta = metaFor('/nope')
    expect(meta).toBe(NOT_FOUND_META)
    expect(meta.index).toBe(false)
  })

  it('builds absolute canonical URLs', () => {
    for (const route of ROUTE_META) {
      expect(`${SITE_URL}${route.canonical}`).toMatch(/^https:\/\//)
    }
  })
})

describe('indexability', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('indexes the real routes and never the 404', () => {
    for (const route of ROUTE_META) expect(isIndexable(route), route.path).toBe(true)
    expect(isIndexable(NOT_FOUND_META)).toBe(false)
  })

  it('withholds every route on a preview deploy', async () => {
    // the bug this pins: `index` is a property of the route and NOINDEX is a
    // property of the deploy. Reading only the first one let a preview build
    // serve noindex in the head while publishing a sitemap of the same URLs.
    vi.stubEnv('VITE_NOINDEX', 'true')
    vi.resetModules()
    const preview = await import('../src/seo')

    for (const route of preview.ROUTE_META) {
      expect(preview.isIndexable(route), route.path).toBe(false)
    }
  })
})

describe('structured data', () => {
  const everything = ROUTE_META.flatMap((route) => jsonLdFor(route))
  const serialised = JSON.stringify(everything)

  it('never claims a review or a rating', () => {
    // the on-page quote is labelled a sample and the clients are invented;
    // marking either up is a manual-action risk and an FTC problem in the US
    expect(serialised).not.toContain('AggregateRating')
    expect(serialised).not.toContain('"Review"')
    expect(serialised).not.toContain('reviewRating')
  })

  it('never claims a postal address it does not have', () => {
    expect(serialised).not.toContain('PostalAddress')
    expect(serialised).not.toContain('LocalBusiness')
  })

  it('declares the price range that the page actually shows', () => {
    expect(serialised).toContain('"lowPrice":"200"')
    expect(serialised).toContain('"highPrice":"900"')
  })

  it('puts a breadcrumb on the inner route but not on the home page', () => {
    const home = JSON.stringify(jsonLdFor(metaFor('/')))
    const map = JSON.stringify(jsonLdFor(metaFor('/work-map')))
    expect(home).not.toContain('BreadcrumbList')
    expect(map).toContain('BreadcrumbList')
  })
})

describe('base-aware paths', () => {
  it('round-trips every route', () => {
    for (const route of ROUTE_META) {
      expect(toAppPath(toHref(route.path))).toBe(route.path)
    }
  })

  it('tolerates the trailing slash GitHub Pages adds to directory indexes', () => {
    expect(toAppPath('/work-map/')).toBe('/work-map')
    expect(toAppPath('/')).toBe('/')
  })
})
