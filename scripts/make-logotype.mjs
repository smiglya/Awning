import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseSvg, inkBounds } from './lib/svg-raster.mjs'

/**
 * Derives every shipped logo variant from the supplied artwork.
 *
 *   node scripts/make-logotype.mjs
 *
 * Reads brand/logo.svg (the mark) and brand/logotype-source.svg (the lockup),
 * and writes brand/logo-flat.svg, brand/logo-full.svg, brand/logo-invert.svg
 * and src/components/Brand.tsx.
 *
 * This script used to construct "wning" from primitives, because there was no
 * lockup to work from. There is one now, so it does not: a generator that
 * redraws letters a designer has already drawn is a second opinion nobody
 * asked for, and the two would diverge on the first kerning change.
 *
 * What it does instead is the work the export cannot do for itself.
 *
 *   Strips the scaffolding. The lockup carries defs, two nested masks, ten
 *   radial gradients and four full-bleed rects to sweep one gradient ray across
 *   the word. Our rasteriser supports none of them and the prerenderer inlines
 *   raw path geometry, so in both the ray does not degrade — it vanishes. Worse,
 *   the mask geometry spans x -2207 to x 26184: parsed naively that becomes the
 *   ink bounds and the lockup lands as a speck in the corner of the OG card.
 *
 *   Takes the letters once. They exist twice in the export — as mask0's shape
 *   and again as the visible paths. Only the visible set is drawn.
 *
 *   Tightens the viewBox. Figma frames carry slack, and slack in a viewBox is a
 *   phantom margin that travels with the artwork into every layout that aligns
 *   it.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (name) => readFileSync(join(root, name), 'utf8')
const round = (n) => Number(n.toFixed(2))

/* ------------------------------------------------------------- extraction */

/**
 * The <path> elements that are direct children of <svg>, with their fills.
 *
 * Depth-aware rather than a regex, because the export nests a <g> inside a <g>
 * and a non-greedy match for a closing tag stops at the inner one — which
 * leaves the gradient rects in and half the document structure out. Anything
 * inside defs, a mask or a group is scaffolding by construction here: the
 * drawn artwork sits at the top level.
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
        const fill = tag.match(/\sfill="([^"]+)"/)?.[1] ?? null
        if (d) out.push({ d, fill })
      }
      continue
    }

    depth += isClose ? -1 : tag.endsWith('/>') ? 0 : 1
  }

  if (out.length === 0) throw new Error('no top-level paths found')
  return out
}

/** Ink bounds of a set of path data, through the same parser the OG card uses. */
function bounds(paths) {
  const probe = `<svg>${paths.map(({ d }) => `<path d="${d}"/>`).join('')}</svg>`
  return inkBounds(parseSvg(probe).shapes)
}

/**
 * The artwork has to start at the origin.
 *
 * Baking a translation into path data is possible but it rewrites every
 * coordinate in the file, which makes the next diff unreadable and puts a
 * rounding step between the designer's drawing and ours. A transform attribute
 * is the other option and our rasteriser rejects those on purpose. So: refuse,
 * and say what to do about it.
 */
function requireOrigin(box, file) {
  if (Math.abs(box.minX) > 0.01 || Math.abs(box.minY) > 0.01) {
    throw new Error(
      `${file}: ink starts at ${round(box.minX)}, ${round(box.minY)} rather than the ` +
        `origin. Re-export with the frame tight to the artwork.`
    )
  }
}

/* ------------------------------------------------------------------ input */

const markPaths = topLevelPaths(read('brand/logo.svg'))
const markBox = bounds(markPaths)
requireOrigin(markBox, 'brand/logo.svg')

const lockupPaths = topLevelPaths(read('brand/logotype-source.svg'))
const lockupBox = bounds(lockupPaths)
requireOrigin(lockupBox, 'brand/logotype-source.svg')

const width = round(lockupBox.maxX)
const height = round(lockupBox.maxY)
const markWidth = round(markBox.maxX)
const markHeight = round(markBox.maxY)

/**
 * Clear space is the height of the lowercase n, on all four sides.
 *
 * The letters come out of the export in the order w, n, n, g, tittle, stem —
 * positionally the i sits between the two n's, but it is written last. So the
 * first n is the second letter path, and the assertion below is what catches a
 * re-export that reorders them: a wrong pick here does not break anything
 * visibly, it just quietly sets the wrong clear space everywhere at once.
 */
const LETTERS = lockupPaths.slice(-6)
const nBox = bounds([LETTERS[1]])
if (nBox.height < 120 || nBox.height > 170) {
  throw new Error(
    `expected the second letter path to be an n, got a shape ${round(nBox.height)} tall. ` +
      `The export has been reordered — re-check which path is which.`
  )
}
const CLEAR = round(nBox.height)
/** What SiteNav.css multiplies the set height by. tests/brand.test.ts checks it. */
const CLEAR_RATIO = Number((CLEAR / height).toFixed(4))

/* ---------------------------------------------------------------- writing */

const flatPaths = (paths, indent) =>
  paths.map(({ d }) => `${indent}<path d="${d}" />`).join('\n')

/**
 * logo-flat.svg — the working file, and the one with rules attached.
 *
 * No defs, mask, gradient or filter; absolute commands only; fill on the root
 * and nowhere else; viewBox tight to the ink from 0 0. Everything downstream
 * depends on those: the navigation colours it by inheritance, the prerender
 * inlines it, and scripts/lib/svg-raster.mjs is ours rather than a browser.
 */
const flat = `<!-- Awning lockup, flat. GENERATED by scripts/make-logotype.mjs.

     Edit brand/logotype-source.svg, not this file.

     The supplied artwork with the gradient scaffolding removed and every fill
     collapsed to currentColor. This is the variant for navigation, the footer,
     the prerender and our own rasteriser — everywhere the surrounding CSS owns
     the colour. The mark is never orange here: on the site orange means "press
     this", and a logo is not a button.

     viewBox is tight to the ink, so no empty space travels with the artwork. -->
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 ${width} ${height}"
  width="${width}"
  height="${height}"
  fill="currentColor"
>
${flatPaths(lockupPaths, '  ')}
</svg>
`

/**
 * logo-full.svg — the supplied drawing, colour and gradient ray intact.
 *
 * For the Open Graph card and marketing surfaces a browser renders. It is the
 * one variant that keeps the orange, and it keeps it because the designer put
 * it there: three cells of the dissolve and the ray across the word.
 *
 * Do not put this in the navigation. It cannot reverse out of a dark ground,
 * our rasteriser drops the ray without a word, and it spends orange somewhere
 * the palette does not budget for it.
 */
const source = read('brand/logotype-source.svg')
const full = source
  .replace(/<!--[\s\S]*?-->/, '')
  .replace(/viewBox="0 0 [\d.]+ [\d.]+"/, `viewBox="0 0 ${width} ${height}"`)
  .replace(/\swidth="[\d.]+"/, ` width="${width}"`)
  .replace(/\sheight="[\d.]+"/, ` height="${height}"`)
  .trimStart()

const fullFile = `<!-- Awning lockup, full colour. GENERATED by scripts/make-logotype.mjs.

     Edit brand/logotype-source.svg, not this file.

     The supplied artwork with the frame tightened to the ink and the export's
     three off-palette colours already corrected in the source. Gradient ray and
     all three orange cells intact — this is the only variant that carries them,
     and the only one meant for a renderer that is a browser.

     Not for navigation: it cannot reverse out of ink, and our own rasteriser
     drops every gradient in it silently. Use logo-flat.svg there. -->
${full}`

/**
 * logo-invert.svg — reversed, and self-contained.
 *
 * The other two inherit `color`, which is right wherever CSS reaches. It does
 * not reach an <img> tag, an email signature or a PDF, and in all three an
 * inheriting file renders ink on ink and looks like nothing at all. So this one
 * names both colours, and they are palette values: #0A0A0A and #FAFAF9.
 *
 * Clear space is built in, because the places that need this variant are the
 * places nothing on our side controls the padding.
 */
const plateW = round(width + CLEAR * 2)
const plateH = round(height + CLEAR * 2)

const invert = `<!-- Awning lockup, reversed. GENERATED by scripts/make-logotype.mjs.

     Edit brand/logotype-source.svg, not this file.

     Paper artwork on an ink plate, with one lowercase-n of clear space on all
     four sides. The only variant that names its own colours, because it is the
     one for places CSS cannot reach: an <img> tag, an email signature, a PDF.
     Both values are from the palette — #0A0A0A is --ink, #FAFAF9 is --paper. -->
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 ${plateW} ${plateH}"
  width="${plateW}"
  height="${plateH}"
>
  <rect width="${plateW}" height="${plateH}" fill="#0A0A0A" />
  <g transform="translate(${CLEAR} ${CLEAR})" fill="#FAFAF9">
${flatPaths(lockupPaths, '    ')}
  </g>
</svg>
`

writeFileSync(join(root, 'brand/logo-flat.svg'), flat)
writeFileSync(join(root, 'brand/logo-full.svg'), fullFile)
writeFileSync(join(root, 'brand/logo-invert.svg'), invert)

/* --------------------------------------------------------- SVG to JSX */

/**
 * The colour lockup, as JSX, with every id made unique per instance.
 *
 * This is the whole reason a converter exists rather than a paste. The artwork
 * carries twelve ids — two masks and ten gradients — and the page renders the
 * lockup twice, in the navigation and across the foot. Two inline SVGs
 * declaring the same id is not a lint warning: the second mask silently wins
 * for both, and the ray either doubles up or vanishes depending on the browser.
 * So the ids are React's useId, which is stable across the prerender and the
 * hydration that follows it — a random suffix would differ between the two and
 * mismatch on every load.
 *
 * @returns {{ markup: string, decls: string }}
 */
function toJsx(source) {
  let markup = source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .trim()

  // attributes SVG spells with a hyphen and JSX does not
  markup = markup
    .replace(/style="mask-type:alpha"/g, "style={{ maskType: 'alpha' }}")
    .replace(/fill-opacity="/g, 'fillOpacity="')
    .replace(/stop-color="/g, 'stopColor="')

  const ids = [...new Set([...markup.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))]
  const decls = []

  ids.forEach((id, i) => {
    // named for the job rather than the export's numbering, which is a Figma
    // node id and means nothing here
    const role = id.startsWith('mask')
      ? id.startsWith('mask0')
        ? 'maskLetters'
        : 'maskRay'
      : `ray${i - 2}`

    decls.push(`  const ${role} = \`awning-${role}-\${uid}\``)
    markup = markup
      .replaceAll(` id="${id}"`, ` id={${role}}`)
      .replaceAll(`="url(#${id})"`, `={\`url(#\${${role}})\`}`)
  })

  return {
    markup: markup
      .split('\n')
      .map((line) => (line.trim() ? `      ${line.trim()}` : ''))
      .join('\n'),
    decls: decls.join('\n'),
  }
}

const lockupJsx = toJsx(read('brand/logotype-source.svg'))

const markJsx = markPaths
  .map(({ d, fill }) => `      <path d="${d}" fill="${fill}" />`)
  .join('\n')

/* ------------------------------------------------------- the React component */

/**
 * Brand.tsx is written from here too.
 *
 * The site needs the artwork inline — it inherits `color`, it is in the
 * prerendered HTML rather than one request behind it, and the prerender has no
 * browser to fetch anything with. That means a second copy of the geometry, and
 * transcribing thousands of characters of path data by hand is exactly how a
 * logo ends up half-updated. So don't transcribe it.
 */
const descenderShare = Math.round(((height - markHeight) / height) * 100)

const component = `import { useId } from 'react'

/**
 * The mark and the lockup, inline and in the supplied colours.
 *
 * GENERATED by scripts/make-logotype.mjs. Run that after changing
 * brand/logo.svg or brand/logotype-source.svg; hand edits here are overwritten.
 * tests/brand.test.ts checks it against the files in brand/ in both directions.
 *
 * Inline rather than <img src="/logo.svg">: the artwork is in the prerendered
 * HTML instead of arriving a request later, which for the thing at the top left
 * of every page is the difference between a logo and a gap where one will be.
 * Both are aria-hidden — they carry nothing a screen reader needs beyond the
 * brand name, which the surrounding markup provides as text.
 *
 * In colour, on purpose and against the brief. §6.2 says the mark is only ever
 * ink or paper and criterion 9 says the logo is never orange, the reasoning
 * being that orange has one job — "press this" — and spending it on a logo
 * blunts the button. That was overruled: the supplied artwork carries three
 * orange cells and a gradient ray across the word, and it ships as drawn.
 * brand/logo-flat.svg still exists for the rasteriser and for any surface that
 * needs the mark to inherit \`color\`.
 */

export interface BrandArtProps {
  className?: string
}

/**
 * The awning, dissolving into pixels at the lower right. Ratio ${round(markWidth / markHeight)}.
 */
export function LogoMark({ className }: BrandArtProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 ${markWidth} ${markHeight}"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
${markJsx}
    </svg>
  )
}

/**
 * The mark and "wning" beside it, with the ray swept across the word.
 *
 * Ratio ${round(width / height)}. The g's descender is the bottom ${descenderShare}% of the box, so
 * the word sits high inside it: anything vertically centring this has to
 * compensate. See .logo-type in SiteNav.css.
 *
 * Every id is suffixed with useId. The page renders this twice — the navigation
 * and the foot — and two inline SVGs sharing a mask id do not warn, they just
 * pick one and break the other.
 */
export function Logotype({ className }: BrandArtProps) {
  const uid = useId()
${lockupJsx.decls}

  return (
    <svg
      className={className}
      viewBox="0 0 ${width} ${height}"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
${lockupJsx.markup}
    </svg>
  )
}
`

writeFileSync(join(root, 'src/components/Brand.tsx'), component)

console.log(
  `brand/logo-flat.svg        ${width} x ${height}  ${lockupPaths.length} paths`
)
console.log(`brand/logo-full.svg        ${width} x ${height}  gradient ray kept`)
console.log(`brand/logo-invert.svg      ${plateW} x ${plateH}  paper on ink`)
console.log(
  `src/components/Brand.tsx   mark ${markWidth} x ${markHeight} (${markPaths.length} paths), ` +
    `lockup ratio ${round(width / height)}, descender ${descenderShare}%`
)
console.log(
  `clear space                ${CLEAR} units, ratio ${CLEAR_RATIO} — ` +
    `--logo-clear in SiteNav.css must match`
)
