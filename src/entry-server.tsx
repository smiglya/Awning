import { renderToString } from 'react-dom/server'
import { MotionConfig } from 'motion/react'
import { ChatProvider } from './components/ChatWidget'
import { ErrorBoundary } from './components/ErrorBoundary'
import { RouterProvider } from './router'
import Landing from './pages/Landing'
import MapPage from './pages/MapPage'
import NotFound from './pages/NotFound'
import { seedProjectsCache } from './data/useProjects'
import { CLIENTS } from './data/clients'
import { isIndexable, jsonLdFor, metaFor, SITE_URL, type RouteMeta } from './seo'

// the prerender script reads these out of the server bundle
export { ROUTE_META, SITE_URL, isIndexable } from './seo'

/**
 * Build-time renderer. Each route becomes a real HTML file with its own head,
 * so a crawler — and every link scraper, which never runs JS at all — gets
 * content rather than an empty root div.
 */

function PageFor({ path }: { path: string }) {
  if (path === '/work-map') return <MapPage />
  if (path === '/') return <Landing />
  return <NotFound />
}

export interface RenderResult {
  html: string
  head: string
  meta: RouteMeta
}

export function render(path: string, ogImageVersion: string | null = null): RenderResult {
  // real cards in the prerendered HTML rather than skeletons
  seedProjectsCache(CLIENTS)

  const html = renderToString(
    <MotionConfig reducedMotion="user">
      <ErrorBoundary>
        <RouterProvider initialPath={path}>
          <ChatProvider>
            <PageFor path={path} />
          </ChatProvider>
        </RouterProvider>
      </ErrorBoundary>
    </MotionConfig>
  )

  return { html, head: headFor(path, ogImageVersion), meta: metaFor(path) }
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

/** JSON-LD is inlined, not fetched: scrapers do not run scripts. */
function escapeJsonLd(value: object): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

/**
 * @param ogImageVersion a short digest of public/og-image.png, or null when the
 *   file is not there.
 *
 *   Null means the social tags are omitted entirely. A tag pointing at a 404 is
 *   worse than no tag: scrapers cache the failure, and some show a broken-image
 *   frame rather than falling back to text.
 *
 *   The digest goes on the URL as a query, so redrawing the card changes where
 *   it lives. Without that the filename is constant for the life of the site
 *   and every cache between here and a reader is entitled to keep serving the
 *   first version it ever fetched — which is how a card goes on advertising a
 *   price that was retired three commits ago.
 */
export function headFor(path: string, ogImageVersion: string | null = null): string {
  const meta = metaFor(path)
  const url = `${SITE_URL}${meta.canonical}`
  const hasOgImage = ogImageVersion !== null
  const image = `${SITE_URL}/og-image.png?v=${ogImageVersion ?? ''}`

  const tags = [
    `<title>${escapeAttr(meta.title)}</title>`,
    `<meta name="description" content="${escapeAttr(meta.description)}" />`,
    `<link rel="canonical" href="${escapeAttr(url)}" />`,
    isIndexable(meta)
      ? `<meta name="robots" content="index,follow,max-image-preview:large" />`
      : `<meta name="robots" content="noindex,follow" />`,

    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Awning" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta property="og:url" content="${escapeAttr(url)}" />`,
    `<meta property="og:title" content="${escapeAttr(meta.title)}" />`,
    `<meta property="og:description" content="${escapeAttr(meta.description)}" />`,

    `<meta name="twitter:card" content="${hasOgImage ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${escapeAttr(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(meta.description)}" />`,
  ]

  if (hasOgImage) {
    tags.push(
      `<meta property="og:image" content="${escapeAttr(image)}" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      // describes what the card actually shows; the price is in the description,
      // not drawn on the image, and alt text that promises text nobody can find
      // is worse than none
      `<meta property="og:image:alt" content="The Awning logotype: the mark and the word, with an orange ray across the letters" />`,
      `<meta name="twitter:image" content="${escapeAttr(image)}" />`
    )
  }

  for (const block of jsonLdFor(meta)) {
    tags.push(`<script type="application/ld+json">${escapeJsonLd(block)}</script>`)
  }

  return tags.join('\n    ')
}

/** Routes the build writes to disk. */
export const PRERENDER_PATHS = ['/', '/work-map', '/404']
