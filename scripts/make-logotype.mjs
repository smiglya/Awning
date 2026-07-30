import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseSvg, inkBounds } from './lib/svg-raster.mjs'

/**
 * Assembles brand/awning-logotype.svg: the mark, then "wning".
 *
 *   node scripts/make-logotype.mjs
 *
 * Writes src/components/Brand.tsx as well — see the note down there.
 *
 * Not set in a typeface. Four of the five letters are constructed here from one
 * metric system and a handful of primitives; the fifth is supplied artwork.
 *
 *   w  pointed apexes — the mark's own V geometry, twice over
 *   n  a plain geometric arch: the quiet letter, and it appears twice
 *   i  a key, from brand/letter-i-key.svg. The studio sells turnkey sites, and
 *      this is the one place the offer is in the logo and not the copy. Drawn
 *      externally and only fitted here, so it stays editable in a design tool
 *   g  circular bowl, with the descender cut on the mark's exact slope
 *
 * Proportions follow the original artwork rather than a text face: x-height at
 * 52% of cap height, which is geometric-sans territory (Futura sits at 48%,
 * Inter at 71%). A text face's large x-height makes a logotype read as body copy
 * set large, which is what an earlier attempt here got wrong.
 *
 * Everything shares BASE, TOP and S by construction rather than by correction —
 * the first hand-assembled version had three baselines and three x-heights — and
 * the only judgement left is spacing, which is per letter and per side.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/* ------------------------------------------------------------------ metrics */

/** The mark is 12x13 in logo.svg; this puts it at 270.18 x 292.70. */
const MARK_SCALE = 22.515

const CAP = 13 * MARK_SCALE // the mark's height, and so the cap height
const BASE = CAP // baseline, with y running downwards from the cap line
const XH = Math.round(CAP * 0.52 * 100) / 100 // x-height
const TOP = BASE - XH // where the lowercase starts
/**
 * Stem width, 18% of the x-height. Heavier than a text weight on purpose: the
 * mark's left leg is 69 units thick against the same cap height, and at a
 * Regular weight the lowercase reads as thin apology beside it.
 */
const S = 27

/** Descender depth, 63% of the x-height, which is where the g stops looking clipped. */
const DESC = 96

/**
 * The mark's own slope: 6 across for 13 down, 24.8 degrees off vertical. Reused
 * for the single angled cut in the lowercase, on the g's descender, so the
 * letters and the mark share a line rather than merely sitting side by side.
 */
const MARK_SLOPE = 6 / 13

/**
 * Optical, not metric. See the note above build().
 *
 * Side bearings are per letter and per side, because equal gaps do not look
 * equal: a flat stem needs air, a curve needs less because it already recedes,
 * and a point needs least of all. One SPACE for everything is what produced the
 * uneven rhythm in the artwork this replaces.
 */
const MARK_GAP = 34
const BEARINGS = {
  // its top right corner is a point, so it can sit closer to what follows
  w: { left: 12, right: 8 },
  n: { left: 14, right: 14 },
  // flat-footed on both sides at the baseline, like the n
  i: { left: 18, right: 18 },
  // round on both sides
  g: { left: 10, right: 10 },
}

const round = (n) => Number(n.toFixed(2))
const xy = (x, y) => `${round(x)} ${round(y)}`

/* --------------------------------------------------------------- primitives */

/** The exact cubic constant for a quarter circle. */
const KAPPA = 0.5522847498

const RIGHT = 0
const DOWN = Math.PI / 2
const LEFT = Math.PI
const UP = -Math.PI / 2

const on = (cx, cy, r, angle) => [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]

/**
 * One quarter of a circle as a cubic, continuing an open path. Angles are in
 * radians with y running down, so DOWN is +PI/2. Every curve in the lowercase
 * goes through here, which is the only way five letters end up agreeing.
 */
function quarter(cx, cy, r, from, to) {
  const [x0, y0] = on(cx, cy, r, from)
  const [x1, y1] = on(cx, cy, r, to)
  const c = KAPPA * r * Math.sign(to - from)
  return (
    `C${xy(x0 - Math.sin(from) * c, y0 + Math.cos(from) * c)} ` +
    `${xy(x1 + Math.sin(to) * c, y1 - Math.cos(to) * c)} ${xy(x1, y1)}`
  )
}

function moveTo(cx, cy, r, angle) {
  return `M${xy(...on(cx, cy, r, angle))}`
}

function lineTo(x, y) {
  return `L${xy(x, y)}`
}

/**
 * @param direction 1 clockwise, -1 anticlockwise. A ring needs its inner contour
 *   wound against the outer one: even-odd would give the hole either way, but
 *   browsers default to nonzero, and a filled counter is not a ring.
 */
function circle(cx, cy, r, direction = 1) {
  const step = (DOWN * direction) / 1
  let d = moveTo(cx, cy, r, UP)
  let a = UP
  for (let i = 0; i < 4; i += 1) {
    d += quarter(cx, cy, r, a, a + step)
    a += step
  }
  return `${d}Z`
}

function polygon(points) {
  return `M${points.map(([x, y]) => xy(x, y)).join('L')}Z`
}

/* ------------------------------------------------------------------ letters */

/**
 * Two pointed V's sharing their middle stroke, which is the mark's shape twice
 * over. The apexes stay sharp: blunting them is the safe choice and also throws
 * away the only thing tying this letter to the awning.
 */
function letterW() {
  const width = 93 // of one V
  const half = width / 2
  // horizontal thickness that gives S measured perpendicular to the stroke
  const t = S / Math.cos(Math.atan(half / XH))
  // inner edges are the outer ones moved in by t, so they cross higher up
  const innerApex = BASE - XH * ((2 * t) / width)

  const v = (x) =>
    polygon([
      [x, TOP],
      [x + half, BASE],
      [x + width, TOP],
      [x + width - t, TOP],
      [x + half, innerApex],
      [x + t, TOP],
    ])

  return { paths: [v(0), v(width - t)], width: 2 * width - t }
}

/** A plain geometric arch. Deliberately the quiet letter — it appears twice. */
function letterN() {
  const outer = 60
  const inner = outer - S
  const width = outer * 2
  const spring = TOP + outer

  return {
    paths: [
      `M${xy(0, BASE)}` +
        lineTo(0, spring) +
        quarter(outer, spring, outer, LEFT, LEFT + DOWN) + // up over the top left
        quarter(outer, spring, outer, UP, RIGHT) + // and down the right
        lineTo(width, BASE) +
        lineTo(width - S, BASE) +
        lineTo(width - S, spring) +
        quarter(outer, spring, inner, RIGHT, UP) + // back over the inside
        quarter(outer, spring, inner, LEFT + DOWN, LEFT) +
        lineTo(S, BASE) +
        'Z',
    ],
    width,
  }
}

/**
 * Supplied artwork, not drawn here: brand/letter-i-key.svg is the key, and the
 * only thing this does is fit it to the rest of the lowercase.
 *
 * Its x-height is scaled to match, which lands its stem within a unit of S — the
 * drawing was already made to these proportions — and it is set on the shared
 * baseline. Nothing else is touched.
 */
const KEY_SOURCE = {
  /** Both read off brand/letter-i-key.svg, and restated in its own comment. */
  baseline: 205.92,
  xHeightTop: 63.072,
}

function letterI() {
  const source = readFileSync(join(root, 'brand/letter-i-key.svg'), 'utf8')
  const paths = [...source.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1])
  if (paths.length === 0) throw new Error('brand/letter-i-key.svg holds no paths')

  const sourceXH = KEY_SOURCE.baseline - KEY_SOURCE.xHeightTop
  const scale = XH / sourceXH
  // the source's ink starts at the origin, so this puts its baseline on ours
  const dy = BASE - KEY_SOURCE.baseline * scale

  let width = 0
  for (const [, x] of source.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)) {
    width = Math.max(width, Number(x) * scale)
  }

  return { paths: paths.map((d) => transformPath(d, scale, 0, dy)), width }
}

/**
 * Circular bowl, straight stem, and a descender whose terminal is cut on the
 * mark's slope. It is the only angled terminal in the lowercase, which is what
 * makes it read as deliberate rather than as a wobble.
 */
function letterG() {
  const outer = XH / 2
  const inner = outer - S
  const width = outer * 2
  const centre = BASE - outer

  const stemLeft = width - S
  const spine = width - S / 2 // the stem's centreline
  const bottom = BASE + DESC

  // the stem turns left over a quarter circle, then runs straight to a terminal
  const bend = 34 // centreline radius of the turn
  const hinge = spine - bend // where the turn's centre sits
  const turnAt = bottom - S / 2 - bend
  const tail = 30 // straight run after the turn

  // the terminal is cut on the mark's slope: the one angled edge in the lowercase
  const cutRun = S * MARK_SLOPE

  return {
    paths: [
      circle(outer, centre, outer, 1) + circle(outer, centre, inner, -1),
      `M${xy(stemLeft, TOP)}` +
        lineTo(width, TOP) +
        lineTo(width, turnAt) +
        quarter(hinge, turnAt, bend + S / 2, RIGHT, DOWN) + // outer of the bend
        lineTo(hinge - tail + cutRun, bottom) +
        lineTo(hinge - tail, bottom - S) + // chamfered terminal
        lineTo(hinge, bottom - S) +
        quarter(hinge, turnAt, bend - S / 2, DOWN, RIGHT) + // inner of the bend
        lineTo(stemLeft, TOP) +
        'Z',
    ],
    width,
  }
}

/* ------------------------------------------------------------------- layout */

/** logo.svg is all straight segments, so it scales to exact path data. */
function markPath() {
  const { shapes } = parseSvg(readFileSync(join(root, 'brand/logo.svg'), 'utf8'))
  if (shapes.length !== 1) throw new Error('logo.svg should hold exactly one shape')
  return shapes[0]
    .map((ring) => polygon(ring.map(([x, y]) => [x * MARK_SCALE, y * MARK_SCALE])))
    .join('')
}

/**
 * Scale then translate every coordinate in a path.
 *
 * Safe only because every path involved — the ones built above and the supplied
 * key — uses absolute commands whose arguments are all "x y" pairs: M, L, C, Z.
 * A relative command or an arc would need real parsing, and would come out of
 * here silently wrong, so the two callers are the whole contract.
 */
function transformPath(d, scale, dx, dy) {
  return d.replace(/(-?[\d.]+) (-?[\d.]+)/g, (_, x, y) =>
    xy(Number(x) * scale + dx, Number(y) * scale + dy)
  )
}

const shift = (d, dx) => transformPath(d, 1, dx, 0)

/**
 * The gap between the mark and the w is set by eye, not by metric. The mark's
 * right side is a receding diagonal, so the two form a wedge that closes near
 * the baseline; the number that looks even there is smaller than the letter
 * shapes alone would suggest.
 */
function build() {
  const word = [
    ['w', letterW()],
    ['n', letterN()],
    ['i', letterI()],
    ['n', letterN()],
    ['g', letterG()],
  ]
  const paths = [markPath()]

  let pen = 12 * MARK_SCALE + MARK_GAP

  for (const [name, letter] of word) {
    const bearing = BEARINGS[name]
    pen += bearing.left
    for (const d of letter.paths) paths.push(shift(d, pen))
    pen += letter.width + bearing.right
  }

  return paths
}

function measure(paths) {
  const probe = `<svg>${paths.map((d) => `<path d="${d}"/>`).join('')}</svg>`
  return inkBounds(parseSvg(probe).shapes)
}

const drawn = build()
const bounds = measure(drawn)
if (Math.abs(bounds.minX) > 0.01 || Math.abs(bounds.minY) > 0.01) {
  throw new Error(`ink should start at the origin, starts at ${bounds.minX}, ${bounds.minY}`)
}

const width = round(bounds.maxX)
const height = round(bounds.maxY)

const svg = `<!-- Awning logotype: the mark, then the name as drawn letters.

     Generated by scripts/make-logotype.mjs — edit that, not this. Every letter
     is constructed there from one metric system, so all five share a baseline,
     an x-height and a stem width by construction rather than by correction.

     The i is a key: ring bow, three stepped teeth, blade. The studio sells
     turnkey websites, and this is where that sits in the logo, not the copy.

     viewBox is tight to the ink so no empty space travels with the artwork.
     fill is currentColor so the lockup can reverse out of a dark surface. -->
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 ${width} ${height}"
  width="${width}"
  height="${height}"
  fill="currentColor"
>
${drawn.map((d) => `  <path d="${d}" />`).join('\n')}
</svg>
`

writeFileSync(join(root, 'brand/awning-logotype.svg'), svg)

/* ------------------------------------------------------- the React component */

/**
 * Brand.tsx is written from here too.
 *
 * The site needs the artwork inline — it inherits `color`, it is in the
 * prerendered HTML rather than one request behind it, and the prerender has no
 * browser to fetch anything with. That means a second copy of the geometry, and
 * transcribing thousand-character path data by hand is exactly how a logo ends
 * up half-updated. So don't transcribe it.
 */
const markSource = readFileSync(join(root, 'brand/logo.svg'), 'utf8')
// read both out of the file rather than restating them, so the two cannot diverge
const markBox = markSource.match(/viewBox="([^"]+)"/)[1]
const markData = markSource.match(/\sd="([^"]+)"/)[1]
const descenderShare = Math.round(((height - CAP) / height) * 100)

const component = `/**
 * The mark and the logotype, inline.
 *
 * GENERATED by scripts/make-logotype.mjs. Run that after changing brand/logo.svg
 * or any metric in it; hand edits here are overwritten. Kept deliberately thin
 * so there is no reason to edit it. tests/brand.test.ts checks it against the
 * files in brand/ in both directions.
 *
 * Inline rather than <img src="/logo.svg">: these inherit \`color\`, so one
 * drawing serves both paper and ink; they are present in the prerendered HTML
 * instead of arriving a request later; and the prerender has no browser to fetch
 * with. Both are aria-hidden — they carry nothing a screen reader needs beyond
 * the brand name, which the surrounding markup provides as text.
 */

export interface BrandArtProps {
  className?: string
}

/** Ratio ${round(12 / 13)}, so height drives width. */
export function LogoMark({ className }: BrandArtProps) {
  return (
    <svg
      className={className}
      viewBox="${markBox}"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="${markData}" />
    </svg>
  )
}

/**
 * The name drawn as letters, with the mark standing in for the capital A, and
 * the i drawn as a key.
 *
 * Ratio ${round(width / height)}. The g's descender is the bottom ${descenderShare}% of the box, so
 * the word sits high inside it: anything vertically centring this has to
 * compensate. See .logo-type in SiteNav.css.
 */
export function Logotype({ className }: BrandArtProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 ${width} ${height}"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
${drawn.map((d) => `      <path d="${d}" />`).join('\n')}
    </svg>
  )
}
`

writeFileSync(join(root, 'src/components/Brand.tsx'), component)

console.log(
  `brand/awning-logotype.svg  ${width} x ${height}  ${drawn.length} paths` +
    `  (cap ${round(CAP)}, x-height ${XH}, stem ${S})`
)
console.log(
  `src/components/Brand.tsx   ratio ${round(width / height)}, ` +
    `descender ${descenderShare}% of the box`
)
