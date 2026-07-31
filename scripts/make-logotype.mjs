import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseSvg, inkBounds } from './lib/svg-raster.mjs'

/**
 * Builds src/components/Brand.tsx from the reference artwork.
 *
 *   node scripts/make-logotype.mjs
 *
 * REFERENCE FILES — this script reads them and must never write them:
 *
 *   brand/logo.svg           the mark, in colour
 *   brand/logo-compact.svg   the lockup, in colour
 *   brand/logo-flat.svg      the same lockup, all ink
 *   brand/wning.svg          the wordmark on its own
 *
 * They are maintained by hand. An earlier version of this script generated
 * three of the four, which meant one run silently replaced a designer's file
 * with a reconstruction of it — the reason that rule is now the first thing
 * written here.
 *
 * Everything the site renders comes from those files. The component is written
 * rather than transcribed because the artwork has to be inline — it belongs in
 * the prerendered HTML instead of arriving a request later — and copying
 * thousands of characters of path data by hand is exactly how a logo ends up
 * half-updated.
 *
 * It also still derives brand/logo-full.svg and brand/logo-invert.svg from
 * brand/logotype-source.svg, which is the Figma export carrying the gradient
 * ray. Only the Open Graph card reads those. That lineage now disagrees with
 * the reference and is a loose end, not a feature.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (name) => readFileSync(join(root, name), 'utf8')
const round = (n) => Number(n.toFixed(2))

/* ------------------------------------------------------------- extraction */

/**
 * The <path> elements that are direct children of <svg>, with their fills.
 *
 * Depth-aware rather than a regex, because the Figma export nests a <g> inside
 * a <g> and a non-greedy match for a closing tag stops at the inner one — which
 * leaves the gradient scaffolding in and half the structure out.
 */
function topLevelPaths(source) {
  const body = source.replace(/<!--[\s\S]*?-->/g, '')
  const out = []
  let depth = 0

  for (const [tag] of body.matchAll(/<\/?(?:defs|mask|g|path)\b[^>]*>/g)) {
    const isClose = tag.startsWith('</')
    const name = tag.replace(/^<\/?/, '').match(/^[a-z]+/)[0]

    if (name === 'path') {
      if (depth === 0 && !isClose) {
        const d = tag.match(/\sd="([^"]+)"/)?.[1]
        const fill = tag.match(/\sfill="([^"]+)"/)?.[1] ?? 'currentColor'
        if (d) out.push({ d, fill })
      }
      continue
    }

    depth += isClose ? -1 : tag.endsWith('/>') ? 0 : 1
  }

  if (out.length === 0) throw new Error('no top-level paths found')
  return out
}

/** The viewBox as written, not as measured: a reference file is not corrected. */
function viewBox(source) {
  const box = source.match(/viewBox="([^"]+)"/)?.[1]
  if (!box) throw new Error('no viewBox')
  return box
}

function bounds(paths) {
  const probe = `<svg>${paths.map(({ d }) => `<path d="${d}"/>`).join('')}</svg>`
  return inkBounds(parseSvg(probe).shapes)
}

const jsxPaths = (paths, indent) =>
  paths.map(({ d, fill }) => `${indent}<path d="${d}" fill="${fill}" />`).join('\n')

/* --------------------------------------------------------------- the input */

const markSource = read('brand/logo.svg')
const navSource = read('brand/logo-compact.svg')
const footSource = read('brand/logo-flat.svg')

const markPaths = topLevelPaths(markSource)
const navPaths = topLevelPaths(navSource)
const footPaths = topLevelPaths(footSource)

if (navPaths.length !== footPaths.length) {
  throw new Error(
    `logo-compact.svg and logo-flat.svg should be the same drawing in two ` +
      `colourways, but hold ${navPaths.length} and ${footPaths.length} paths`
  )
}

/** The frame's height as the file declares it, not as the ink measures. */
const navH = Number(viewBox(navSource).split(/\s+/)[3])

/**
 * Clear space is the height of the lowercase n, on all four sides.
 *
 * The lockup's paths come out in the order the export wrote them: fifteen
 * dissolve cells, the mark, then w, n, n, g and the two pieces of the i. So the
 * first n is the second of the last six, and the assertion is what catches a
 * re-export that reorders them — a wrong pick here breaks nothing visibly, it
 * just sets the wrong clear space everywhere at once.
 */
const letters = navPaths.slice(-6)
const nBox = bounds([letters[1]])
if (nBox.height < 120 || nBox.height > 170) {
  throw new Error(
    `expected the second letter path to be an n, got a shape ${round(nBox.height)} tall`
  )
}

const clearRatio = Number((nBox.height / navH).toFixed(4))

/** The baseline is the n's foot; everything below it is the g's descender. */
const descenderShare = Math.round(((navH - nBox.maxY) / navH) * 100)

/* ------------------------------------------------------- the derived pair */

/**
 * logo-full.svg and logo-invert.svg, from the Figma export rather than the
 * reference. Only scripts/make-images.mjs reads them, for the Open Graph card.
 */
const lockupPaths = topLevelPaths(read('brand/logotype-source.svg'))
const lockupBox = bounds(lockupPaths)
const fullW = round(lockupBox.maxX)
const fullH = round(lockupBox.maxY)
const clear = round(nBox.height)

const source = read('brand/logotype-source.svg')
const full = `<!-- Awning lockup, full colour. GENERATED by scripts/make-logotype.mjs.

     Edit brand/logotype-source.svg, not this file.

     The Figma export with its gradient ray, frame tightened to the ink. Only
     the Open Graph card reads it. Note that this is NOT the reference artwork:
     brand/logo-compact.svg is what the site renders, and it carries no ray. -->
${source
  .replace(/<!--[\s\S]*?-->/, '')
  .replace(/viewBox="0 0 [\d.]+ [\d.]+"/, `viewBox="0 0 ${fullW} ${fullH}"`)
  .replace(/\swidth="[\d.]+"/, ` width="${fullW}"`)
  .replace(/\sheight="[\d.]+"/, ` height="${fullH}"`)
  .trimStart()}`

const plateW = round(fullW + clear * 2)
const plateH = round(fullH + clear * 2)

const invert = `<!-- Awning lockup, reversed. GENERATED by scripts/make-logotype.mjs.

     Paper artwork on an ink plate, with one lowercase-n of clear space on all
     four sides. For the places CSS cannot reach — an <img> tag, an email
     signature, a PDF — where a file that inherits colour renders ink on ink and
     looks like nothing at all. Both values are from the palette. -->
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 ${plateW} ${plateH}"
  width="${plateW}"
  height="${plateH}"
>
  <rect width="${plateW}" height="${plateH}" fill="#0A0A0A" />
  <g transform="translate(${clear} ${clear})" fill="#FAFAF9">
${lockupPaths.map(({ d }) => `    <path d="${d}" />`).join('\n')}
  </g>
</svg>
`

writeFileSync(join(root, 'brand/logo-full.svg'), full)
writeFileSync(join(root, 'brand/logo-invert.svg'), invert)

/* ------------------------------------------------------- the React component */

const component = `/**
 * The mark and the lockup, inline, exactly as the reference artwork draws them.
 *
 * GENERATED by scripts/make-logotype.mjs from brand/logo.svg,
 * brand/logo-compact.svg and brand/logo-flat.svg. Edit those; hand edits here
 * are overwritten.
 *
 * Inline rather than <img src="/logo.svg">: the artwork is in the prerendered
 * HTML instead of arriving a request later, which for the thing at the top left
 * of every page is the difference between a logo and a gap where one will be.
 * All three are aria-hidden — they carry nothing a screen reader needs beyond
 * the brand name, which the surrounding markup provides as text.
 *
 * The fills are the artwork's own. Nothing here inherits \`color\`, so none of
 * these can reverse out of a dark ground; brand/logo-invert.svg exists for that.
 */

export interface BrandArtProps {
  className?: string
}

/** The awning, dissolving into pixels at the lower right. */
export function LogoMark({ className }: BrandArtProps) {
  return (
    <svg
      className={className}
      viewBox="${viewBox(markSource)}"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
${jsxPaths(markPaths, '      ')}
    </svg>
  )
}

/**
 * The lockup in colour. This is what the navigation sets.
 *
 * The g's descender is the bottom ${descenderShare}% of the box, so the word sits high
 * inside it: anything vertically centring this has to compensate. See
 * .logo-type in SiteNav.css.
 */
export function LogoCompact({ className }: BrandArtProps) {
  return (
    <svg
      className={className}
      viewBox="${viewBox(navSource)}"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
${jsxPaths(navPaths, '      ')}
    </svg>
  )
}

/**
 * The same lockup, all ink. The foot sets this one oversized and clipped by the
 * bottom of the page, where the colour version would put a great deal of orange
 * somewhere the palette does not budget for it.
 */
export function Logotype({ className }: BrandArtProps) {
  return (
    <svg
      className={className}
      viewBox="${viewBox(footSource)}"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
${jsxPaths(footPaths, '      ')}
    </svg>
  )
}
`

writeFileSync(join(root, 'src/components/Brand.tsx'), component)

console.log(
  `reference   logo.svg          ${viewBox(markSource)}  ${markPaths.length} paths`
)
console.log(
  `reference   logo-compact.svg  ${viewBox(navSource)}  ${navPaths.length} paths, colour`
)
console.log(
  `reference   logo-flat.svg     ${viewBox(footSource)}  ${footPaths.length} paths, ink`
)
console.log(`written     src/components/Brand.tsx   descender ${descenderShare}%`)
console.log(`written     brand/logo-full.svg        ${fullW} x ${fullH}  (OG card only)`)
console.log(`written     brand/logo-invert.svg      ${plateW} x ${plateH}`)
console.log(
  `clear space ${round(nBox.height)} of ${navH} units, ratio ${clearRatio} — ` +
    `--logo-clear in SiteNav.css must match`
)
