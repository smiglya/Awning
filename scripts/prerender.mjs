import { build } from 'vite'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/**
 * Build, then write one real HTML file per route.
 *
 * Not a migration to Next: two static routes do not justify a framework, and
 * this keeps the custom router. What it buys is that a crawler and, more
 * importantly, every link scraper — Slack, Telegram, WhatsApp, LinkedIn, none
 * of which execute JavaScript — receive the actual page.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const ssrDir = join(root, '.ssr')

async function main() {
  console.log('[prerender] client build')
  await build({ root, logLevel: 'warn' })

  console.log('[prerender] server build')
  await build({
    root,
    logLevel: 'warn',
    build: {
      ssr: resolve(root, 'src/entry-server.tsx'),
      outDir: '.ssr',
      emptyOutDir: true,
      rollupOptions: { output: { entryFileNames: 'entry-server.js' } },
    },
  })

  const entry = pathToFileURL(join(ssrDir, 'entry-server.js')).href
  const { render, PRERENDER_PATHS } = await import(entry)

  const template = await readFile(join(dist, 'index.html'), 'utf8')

  // Social image tags are emitted only if the asset is really there. Run
  // `npm run images` to generate it; a tag pointing at a 404 gets cached as a
  // failure by the scrapers that matter.
  const hasOgImage = existsSync(join(dist, 'og-image.png'))
  if (!hasOgImage) {
    console.warn(
      '[prerender] og-image.png missing — social image tags omitted. Run: npm run images'
    )
  }

  for (const path of PRERENDER_PATHS) {
    const { html, head } = render(path, hasOgImage)

    let page = template
    // the built template carries the base <title> and description; the
    // per-route head replaces them wholesale rather than appending duplicates
    page = page.replace(/<title>[\s\S]*?<\/title>\s*/, '')
    page = page.replace(/<meta\s+name="description"[^>]*>\s*/, '')
    page = page.replace('</head>', `  ${head}\n  </head>`)
    page = page.replace('<div id="root"></div>', `<div id="root">${html}</div>`)

    const target =
      path === '/'
        ? join(dist, 'index.html')
        : path === '/404'
          ? join(dist, '404.html')
          : join(dist, path.replace(/^\//, ''), 'index.html')

    if (!existsSync(dirname(target))) await mkdir(dirname(target), { recursive: true })
    await writeFile(target, page, 'utf8')
    console.log(`[prerender] ${path} -> ${target.replace(root, '.')}`)
  }

  const seo = await import(entry)
  if (typeof seo.isIndexable !== 'function') {
    throw new Error('sitemap: isIndexable missing from the server build')
  }
  // filtered through the app's own predicate, so the sitemap can never disagree
  // with the robots meta tag the same build just wrote into every page
  const indexable = seo.ROUTE_META.filter((route) => seo.isIndexable(route))
  await writeSitemap(indexable, seo.SITE_URL)
}

async function writeSitemap(indexable, site) {
  if (!indexable || !site) {
    throw new Error('sitemap: route metadata missing from the server build')
  }

  /**
   * A preview build (VITE_NOINDEX=true) serves every page with noindex, so
   * there is nothing legitimate to put in a sitemap. Advertising one anyway
   * would submit URLs the same build asks not to index.
   *
   * Crawling stays allowed on purpose: `Disallow: /` would stop crawlers from
   * ever reading the noindex tag, which is how temporary URLs end up stuck in
   * results as bare links. Allow the crawl, refuse the index.
   */
  if (indexable.length === 0) {
    await writeFile(
      join(dist, 'robots.txt'),
      'User-agent: *\nAllow: /\n\n# Preview deploy. Every page carries meta robots noindex;\n# no sitemap is published for it.\n',
      'utf8'
    )
    console.log('[prerender] preview build: robots.txt written, sitemap skipped')
    return
  }

  const stamp = new Date().toISOString().slice(0, 10)
  const urls = indexable
    .map(
      (route) =>
        `  <url>\n    <loc>${site}${route.canonical}</loc>\n` +
        `    <lastmod>${stamp}</lastmod>\n` +
        `    <changefreq>${route.changefreq}</changefreq>\n` +
        `    <priority>${route.priority}</priority>\n  </url>`
    )
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
  await writeFile(join(dist, 'sitemap.xml'), xml, 'utf8')

  const robots = `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`
  await writeFile(join(dist, 'robots.txt'), robots, 'utf8')

  console.log('[prerender] sitemap.xml and robots.txt written')
}

main().catch((error) => {
  console.error('[prerender] failed:', error)
  process.exitCode = 1
})
