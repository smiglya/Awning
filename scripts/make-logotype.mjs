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
 *   brand/Awning-footer.svg  the lockup with the gradient ray, for the foot
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
 * It also writes brand/logo-invert.svg — the footer lockup's drawn paths in
 * paper on an ink plate, for the places CSS cannot reach.
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

/**
 * A whole SVG as JSX, with every id made unique per instance.
 *
 * The footer lockup carries two masks and ten gradients to sweep its ray, which
 * is twelve ids. React renders one instance today and would render more the
 * moment the lockup appears twice — and two inline SVGs sharing a mask id do not
 * warn: one wins for both elements and the other drawing loses its ray. useId
 * rather than a counter or a random suffix, because the prerender and the
 * hydration after it must produce the same markup character for character.
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

/* --------------------------------------------------------------- the input */

const markSource = read('brand/logo.svg')
const navSource = read('brand/logo-compact.svg')
const footSource = read('brand/Awning-footer.svg')

const markPaths = topLevelPaths(markSource)
const navPaths = topLevelPaths(navSource)
const footPaths = topLevelPaths(footSource)

/**
 * The footer lockup is the same drawing with the ray added over the letters, so
 * its drawn paths — the ones outside the masks — have to match the navigation's.
 * If they part company, the page is setting two different logos and only a
 * scroll from one to the other would show it.
 */
if (navPaths.length !== footPaths.length) {
  throw new Error(
    `logo-compact.svg and Awning-footer.svg should be the same drawing, but ` +
      `hold ${navPaths.length} and ${footPaths.length} top-level paths`
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

/* ---------------------------------------------------------- the reversed file */

/**
 * logo-invert.svg, off the footer lockup's drawn paths.
 *
 * Nothing on the site reads it. It exists for the places CSS cannot reach — an
 * <img> tag, an email signature, a PDF — where an ink drawing on a dark ground
 * renders as nothing at all.
 */
const footBox = bounds(footPaths)
const fullW = round(footBox.maxX)
const fullH = round(footBox.maxY)
const clear = round(nBox.height)

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
${footPaths.map(({ d }) => `    <path d="${d}" />`).join('\n')}
  </g>
</svg>
`

writeFileSync(join(root, 'brand/logo-invert.svg'), invert)

/* ------------------------------------------------------- the React component */

const footJsx = toJsx(footSource)

const component = `import { useId } from 'react'

/**
 * The mark and the lockup, inline, exactly as the reference artwork draws them.
 *
 * GENERATED by scripts/make-logotype.mjs from brand/logo.svg,
 * brand/logo-compact.svg and brand/Awning-footer.svg. Edit those; hand edits here
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
 * The lockup with the ray swept across the word. The foot sets this one
 * oversized and clipped by the bottom of the page, which is the one place on
 * the site big enough for the ray to be seen at all.
 *
 * Every id is suffixed with useId. There are twelve of them between the two
 * masks and the ten gradients, and two inline SVGs sharing one do not warn:
 * a mask id declared twice picks a winner and the other drawing loses its ray.
 */
export function Logotype({ className }: BrandArtProps) {
  const uid = useId()
${footJsx.decls}

  return (
    <svg
      className={className}
      viewBox="${viewBox(footSource)}"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
${footJsx.markup}
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
  `reference   Awning-footer.svg ${viewBox(footSource)}  ${footPaths.length} drawn paths + ray`
)
console.log(`written     src/components/Brand.tsx   descender ${descenderShare}%`)
console.log(`written     brand/logo-invert.svg      ${plateW} x ${plateH}`)
console.log(
  `clear space ${round(nBox.height)} of ${navH} units, ratio ${clearRatio} — ` +
    `--logo-clear in SiteNav.css must match`
)
