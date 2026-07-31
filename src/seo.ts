import { BRAND, PRICING } from './data/copy'

/**
 * Per-route head data and structured data, in one place so the prerender and
 * the client agree.
 *
 * The site sells "built to be found" — shipping it as an empty <div id="root">
 * with one shared meta description would be the loudest possible contradiction
 * of its own offer.
 */

export const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://awning.nyc').replace(
  /\/$/,
  ''
)

/**
 * Set on preview deploys. A demo on a temporary URL should not be indexed:
 * once the real domain goes live the two would compete as duplicates, and the
 * preview would be the one with the older, stronger signals.
 */
export const NOINDEX = import.meta.env.VITE_NOINDEX === 'true'

export interface RouteMeta {
  path: string
  title: string
  description: string
  /** relative to SITE_URL */
  canonical: string
  changefreq: 'daily' | 'weekly' | 'monthly'
  priority: string
  index: boolean
}

/** ≤60 chars for the title, 140–160 for the description. */
export const ROUTE_META: RouteMeta[] = [
  {
    path: '/',
    title: `${BRAND} — websites for local NYC businesses`,
    description:
      'Turnkey websites for New York local business. $999 flat, paid once, live 48 hours after the brief. Motion drawn in house, no monthly fee, every login yours.',
    canonical: '/',
    changefreq: 'weekly',
    priority: '1.0',
    index: true,
  },
  {
    path: '/work-map',
    title: `Client map — ${BRAND}`,
    description:
      'Sample builds across all five New York boroughs, one pin each. See what each owner got and what it cost. Same flat price in Tottenville or Tribeca.',
    canonical: '/work-map',
    changefreq: 'monthly',
    priority: '0.8',
    index: true,
  },
]

export const NOT_FOUND_META: RouteMeta = {
  path: '/404',
  title: `Page not found — ${BRAND}`,
  description: 'That address does not exist on this site.',
  canonical: '/404',
  changefreq: 'monthly',
  priority: '0.0',
  // a 404 must never be indexed, or it competes with the pages that matter
  index: false,
}

export function metaFor(path: string): RouteMeta {
  return ROUTE_META.find((route) => route.path === path) ?? NOT_FOUND_META
}

/**
 * The only place the two conditions are combined.
 *
 * `index` is a property of the route; NOINDEX is a property of the deploy. Read
 * either one alone and the answers diverge: that is how a preview build ends up
 * serving `noindex` in the head while its own robots.txt submits a sitemap of
 * the same URLs.
 */
export function isIndexable(route: RouteMeta): boolean {
  return route.index && !NOINDEX
}

/* --------------------------------------------------------- structured data */

/**
 * Organization + Service rather than LocalBusiness.
 *
 * LocalBusiness requires a real postal address, and inventing one to win a map
 * pack is exactly what earns a manual penalty. Register as a service-area
 * business in Google Business Profile instead, then this can gain an address.
 *
 * No rating or testimonial markup of any kind is emitted: the quote on the page
 * is labelled a sample and the twelve clients are invented. Marking up
 * fabricated praise is a manual-action risk and, in the US, an FTC problem.
 * tests/design-system.test.ts reads the emitted JSON-LD and fails if any of it
 * appears — checking the output rather than this comment, because a comment
 * saying the right thing is not the same as code doing it.
 */
export function organizationJsonLd(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: BRAND,
    url: SITE_URL,
    description:
      'Web studio building turnkey websites for local businesses across New York City.',
    areaServed: ['Manhattan', 'Brooklyn', 'Queens', 'The Bronx', 'Staten Island'].map(
      (name) => ({ '@type': 'AdministrativeArea', name })
    ),
    knowsLanguage: ['en', 'es'],
  }
}

export function serviceJsonLd(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${SITE_URL}/#service`,
    name: 'Website design and build',
    serviceType: 'Website design and build',
    provider: { '@id': `${SITE_URL}/#organization` },
    areaServed: { '@type': 'City', name: 'New York' },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'USD',
      // read off the tiers rather than written down, so a price change here is
      // impossible to forget — the previous hardcoded pair outlived the offer
      // it described, and structured data is the last place anyone looks
      lowPrice: PRICING.tiers[0]?.amount ?? '999',
      highPrice: PRICING.tiers[PRICING.tiers.length - 1]?.amount ?? '3379',
      offerCount: String(PRICING.tiers.length),
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Website tiers',
      itemListElement: PRICING.tiers.map((tier) => ({
        '@type': 'Offer',
        name: tier.name,
        description: tier.forWho,
        price: tier.amount,
        priceCurrency: 'USD',
        // Pro+ is a floor, and an Offer that says 3379 flat when the page says
        // "from" is the kind of mismatch that gets structured data ignored
        ...(tier.from
          ? {
              priceSpecification: {
                '@type': 'PriceSpecification',
                minPrice: tier.amount,
                priceCurrency: 'USD',
              },
            }
          : {}),
      })),
    },
  }
}

export function websiteJsonLd(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: BRAND,
    publisher: { '@id': `${SITE_URL}/#organization` },
    inLanguage: 'en',
  }
}

export function breadcrumbJsonLd(route: RouteMeta): object | null {
  if (route.path === '/') return null
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      {
        '@type': 'ListItem',
        position: 2,
        name: route.title.split(' — ')[0],
        item: `${SITE_URL}${route.canonical}`,
      },
    ],
  }
}

export function jsonLdFor(route: RouteMeta): object[] {
  const blocks: object[] = [organizationJsonLd(), websiteJsonLd()]
  if (route.path === '/') blocks.push(serviceJsonLd())
  const crumbs = breadcrumbJsonLd(route)
  if (crumbs) blocks.push(crumbs)
  return blocks
}
