import { writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Draws brand/logo-new.svg and brand/campfire.svg.
 *
 *   node scripts/make-shelter.mjs
 *
 * The shelter with a fire burning inside it, from the concept in
 * brand/Концепт.png, and the campfire on its own from brand/Костер.png.
 *
 * Nothing on the site renders either one yet. They are a proposal for the mark,
 * and swapping the logo is a decision rather than a side effect of drawing one.
 *
 * A script rather than hand-kept files: the shelter is four hundred rectangles
 * and the flame is a field rather than an outline, so neither is editable by
 * hand. Open the SVGs to look at them.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/* ---------------------------------------------------------------- palette */

/**
 * The fire's colours are the reference's, not the site's.
 *
 * This is worth saying out loud: the page declares eight colours and this
 * drawing adds nine more. A fire that reads as fire needs the whole ramp from
 * a dark red rim to a white heart, and the three oranges the brand already owns
 * cover a third of it. If the mark ships, the palette rule needs rewriting to
 * say "eight for the interface, and the mark is a drawing".
 */
const C = {
  ink: '#0A0A0A',
  d: '#A32218', // the rim, and the sparks that fly off it
  r: '#E63A22',
  o: '#FF7A18',
  a: '#FFB13B',
  y: '#FFE08A',
  w: '#F4FBF6', // the heart, where a fire runs white
  l: '#E0BC8C', // log, lit face
  m: '#A9784E', // log, turned away
  k: '#5E3B22', // log, cut end
  spark: '#5A5A5A',
}

/** Deterministic: the same drawing every run, so a diff means a change. */
function hash(a, b) {
  let n = a * 374761393 + b * 668265263
  n = (n ^ (n >>> 13)) * 1274126177
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296
}

const canvas = (w, h) => ({
  w,
  h,
  cells: Array.from({ length: h }, () => Array(w).fill(null)),
  set(x, y, c) {
    if (x >= 0 && x < this.w && y >= 0 && y < this.h) this.cells[y][x] = c
  },
  at(x, y) {
    return this.cells[y]?.[x] ?? null
  },
})

/* ------------------------------------------------------------------- fire */

const FIRE_W = 20
const FIRE_H = 26
const LOG_TOP = 21

/**
 * The flame, built as heat rather than traced as an outline.
 *
 * The reference is concentric — a white heart, then yellow, amber, orange, red
 * and a dark rim — so that is how it is drawn: a heat field falling away from a
 * point under the base, cut into those six bands. Tracing the bands by hand
 * gives a flame whose colours do not nest, and that reads as a mistake even
 * when nobody can say which pixel is wrong.
 *
 * The silhouette is a teardrop, widest a third of the way up, wobbled per row
 * so the edge is ragged the way flame is.
 */
function drawFire(c, ox, oy) {
  const cx = 9.5
  const base = LOG_TOP - 0.5
  const bands = [C.w, C.y, C.a, C.o, C.r, C.d]

  for (let y = 0; y < LOG_TOP; y += 1) {
    const up = (base - y) / base

    let half = 7.6 * Math.sin(Math.PI * Math.min(1, up * 0.86 + 0.14)) ** 0.75
    half *= 0.82 + hash(y, 3) * 0.36
    if (up > 0.72) half *= 1 - (up - 0.72) * 1.6

    for (let x = 0; x < FIRE_W; x += 1) {
      const dx = Math.abs(x + 0.5 - cx)
      if (dx > half) continue

      // hot on the axis and at the base, cooling outward and upward
      const heat = (1 - dx / Math.max(0.8, half)) * 0.68 + (1 - up) * 0.62
      const wobble = hash(x * 7, y * 13) * 0.1
      const band = Math.min(
        bands.length - 1,
        Math.max(0, Math.floor((1 - heat + wobble) * bands.length * 1.02))
      )
      c.set(ox + x, oy + y, bands[band])
    }
  }

  /**
   * A dark rim around the flame.
   *
   * Applied by neighbour after the fill, not as an outer band by radius. The
   * band would follow the maths; the rim has to follow the silhouette, and it
   * is the silhouette that is ragged.
   */
  const lit = new Set([C.r, C.o, C.a])
  const rim = []
  for (let y = 0; y < LOG_TOP; y += 1) {
    for (let x = 0; x < FIRE_W; x += 1) {
      if (!lit.has(c.at(ox + x, oy + y))) continue
      const bare = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dy]) => !c.at(ox + x + dx, oy + y + dy))
      if (bare) rim.push([ox + x, oy + y])
    }
  }
  for (const [x, y] of rim) c.set(x, y, C.d)

  /* embers, which is what stops a flame looking cut out of paper */
  const sparks = [
    [10, 0, C.d],
    [11, 1, C.r],
    [4, 3, C.d],
    [16, 2, C.o],
    [17, 3, C.d],
    [3, 6, C.o],
    [18, 7, C.r],
    [2, 9, C.d],
    [19, 10, C.o],
    [1, 12, C.d],
    [0, 15, C.d],
  ]
  for (const [x, y, shade] of sparks) c.set(ox + x, oy + y, shade)

  /* the logs it burns on */
  const logs = ['kmmlmmk.kmmlmmk.kmlk', 'kllmllk.kllmllk.klmk', '.kmmmk...kmmmk..kmk.']
  logs.forEach((row, i) => {
    for (let x = 0; x < row.length; x += 1) {
      const ch = row[x]
      if (ch === '.') continue
      c.set(ox + x, oy + LOG_TOP + i, ch === 'k' ? C.k : ch === 'm' ? C.m : C.l)
    }
  })
}

/* ---------------------------------------------------------------- shelter */

const W = 80
const H = 84
const CX = 40
const APEX = 16
const FOOT = 76

/** Half the span at the foot, the wall's thickness there, and the flap's. */
const OUTER = 38
const WALL = 20
const FLAP = 8

function drawShelter(c) {
  for (let y = APEX; y <= FOOT; y += 1) {
    const t = (y - APEX) / (FOOT - APEX)
    const outer = Math.round(CX - OUTER * t)
    const wallIn = outer + Math.max(1, Math.round(WALL * t))
    const flapW = Math.max(1, Math.round(FLAP * t))

    for (const side of [-1, 1]) {
      const flip = (x) => (side < 0 ? x : W - 1 - x)

      for (let x = outer; x < wallIn; x += 1) c.set(flip(x), y, C.ink)

      /**
       * Two pixels of daylight, then the entrance flap folded back inside.
       *
       * Two rather than one: a single-pixel seam on a diagonal is a staircase
       * that keeps closing up under rounding, and what you see is a dotted line
       * that reads as a rendering fault rather than as a fold.
       *
       * Clamped short of the centre, or near the apex the two flaps cross and
       * draw an X through the top of the tent.
       */
      const flapEnd = Math.min(wallIn + 2 + flapW, CX - 1)
      for (let x = wallIn + 2; x < flapEnd; x += 1) c.set(flip(x), y, C.ink)
    }
  }

  /* the feet, where the poles splay out and take the ground */
  for (let i = 0; i < 4; i += 1) {
    for (let x = 0; x < 7; x += 1) {
      c.set(2 + x, FOOT - i, C.ink)
      c.set(W - 3 - x, FOOT - i, C.ink)
    }
  }

  for (let y = FOOT + 1; y <= FOOT + 4; y += 1) {
    for (let x = 0; x < W; x += 1) c.set(x, y, C.ink)
  }

  /* the pole, and a swallowtail pennant notched into its left edge */
  for (let y = 6; y <= APEX + 2; y += 1) {
    c.set(CX, y, C.ink)
    c.set(CX - 1, y, C.ink)
  }
  const flag = [
    'mmmmmmmmmmmmm',
    'mmmmmmmmmmmmm',
    '.mmmmmmmmmmmm',
    '..mmmmmmmmmmm',
    '.mmmmmmmmmmmm',
    'mmmmmmmmmmmmm',
    'mmmmmmmmmmmmm',
  ]
  flag.forEach((row, i) => {
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] === 'm') c.set(CX - 13 + x, 6 + i, C.ink)
    }
  })

  /* the glint on the left wall, straight from the concept */
  const star = ['..m..', '.mmm.', 'mmmmm', '.mmm.', '..m..']
  star.forEach((row, i) => {
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] === 'm') c.set(11 + x, 58 + i, C.spark)
    }
  })
}

/* ------------------------------------------------------------------ write */

/**
 * Grouped by colour, with the viewBox on the pixel grid and the module carried
 * by width and height. One fill attribute per colour instead of per rectangle,
 * and two-digit coordinates instead of four — a third off the file for no
 * change to what renders.
 */
function toSvg(c, note, module = 16) {
  const runs = []
  for (let y = 0; y < c.h; y += 1) {
    let x = 0
    while (x < c.w) {
      const col = c.cells[y][x]
      if (!col) {
        x += 1
        continue
      }
      let w = 1
      while (x + w < c.w && c.cells[y][x + w] === col) w += 1
      runs.push({ x, y, w, c: col })
      x += w
    }
  }

  const byColour = new Map()
  for (const r of runs) byColour.set(r.c, [...(byColour.get(r.c) ?? []), r])

  const svg = `<!-- ${note}

     GENERATED by scripts/make-shelter.mjs — run that, do not edit this.
     ${c.w} x ${c.h} pixels. The viewBox is the pixel grid and the module rides on
     width and height, so one pixel lands on ${module} units at the natural size.
     crispEdges keeps a browser from smoothing the grid into mush. -->
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 ${c.w} ${c.h}"
  width="${c.w * module}"
  height="${c.h * module}"
  shape-rendering="crispEdges"
>
${[...byColour]
  .map(
    ([colour, rs]) =>
      `  <g fill="${colour}">${rs
        .map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="1"/>`)
        .join('')}</g>`
  )
  .join('\n')}
</svg>
`

  return { runs: runs.length, svg }
}

const fire = canvas(FIRE_W, FIRE_H)
drawFire(fire, 0, 0)

const shelter = canvas(W, H)
drawShelter(shelter)
drawFire(shelter, CX - 10, FOOT - 26)

const a = toSvg(fire, 'The campfire that burns inside the shelter.')
const b = toSvg(
  shelter,
  'The shelter, with a fire burning inside it. A proposal for the mark.'
)

writeFileSync(join(root, 'brand/campfire.svg'), a.svg)
writeFileSync(join(root, 'brand/logo-new.svg'), b.svg)

console.log(`brand/campfire.svg  ${FIRE_W} x ${FIRE_H} px, ${a.runs} rects`)
console.log(
  `brand/logo-new.svg  ${W} x ${H} px, ${b.runs} rects, ${(b.svg.length / 1024).toFixed(1)} kB`
)
