import { writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Draws the shelter, and the campfire on its own.
 *
 *   node scripts/make-shelter.mjs
 *
 * Every colour here comes from one of the two supplied palettes and nowhere
 * else. That is now the brand rule rather than a preference for this drawing,
 * which is why the three earlier prototypes collapsed back into one: Ember
 * existed only to avoid spending colours the site had not declared, and the
 * fire palette is declared now, so the constraint it was answering is gone.
 *
 *   logo-new.svg   The shelter, with the supplied fire burning inside it.
 *   campfire.svg   That fire on its own, at the size it was drawn.
 *
 * Nothing on the site renders either yet. Replacing the mark is a decision, and
 * the reference lockups under brand/ are still the ones in use.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** brand/fire-palitra.svg, hottest to coolest. */
const F = {
  Y: '#F7F804',
  G: '#F9CF01',
  O: '#F96607',
  A: '#F84608',
  R: '#F70008',
}

/** brand/wood-palitra.svg. */
const WOOD = {
  n: '#785748',
  g: '#4C4240',
  b: '#83443D',
  s: '#40403E',
  p: '#B45950',
  u: '#5B333E',
  k: '#502732',
}

/** The darkest wood is the mark's ink, and it is 12.52 against white. */
const INK = WOOD.k

/**
 * brand/fire.svg, cell for cell.
 *
 * Eight by fourteen, transcribed rather than redrawn — the supplied flame is
 * the reference, and a flame generated to look like it would drift the moment
 * either file changed. The gap at the bottom centre is in the original and is
 * not an omission: the flame arches over the spot the logs occupy.
 */
const FIRE = [
  '..A.....',
  '..RR....',
  '...AR.A.',
  '...RA...',
  'R..RARR.',
  '..RROOR.',
  '..RAOOR.',
  '.RAOOORR',
  '.RAOOOOR',
  '.ROGGGOR',
  'ROOGGGOR',
  'ROYG.YOR',
  'RRY..YR.',
  '.RR..R..',
]

/** Logs: lit face, turned face, cut end. */
const LOGS = ['bnnpnnb.bnnpnnb', 'kbbnbbk.kbbnbbk', '.kbbbk...kbbbk.']

const canvas = (w, h) => ({
  w,
  h,
  cells: Array.from({ length: h }, () => Array(w).fill(null)),
  set(x, y, c) {
    if (x >= 0 && x < this.w && y >= 0 && y < this.h) this.cells[y][x] = c
  },
})

/** Draws a bitmap at `scale`, so the supplied 8x14 can fill a 16x28 opening. */
function stamp(c, rows, ox, oy, map, scale = 1) {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const shade = map[row[x]]
      if (!shade) continue
      for (let dy = 0; dy < scale; dy += 1) {
        for (let dx = 0; dx < scale; dx += 1) {
          c.set(ox + x * scale + dx, oy + y * scale + dy, shade)
        }
      }
    }
  })
}

/* ---------------------------------------------------------------- shelter */

const W = 100
const H = 100
const CX = 50
const APEX = 14
const FOOT = 90
const SPAN = FOOT - APEX

/**
 * The shelter is one solid mass with a narrow slit cut through it, not four
 * diagonal lines.
 *
 * The first pass made the flap three pixels wide and the whole drawing came out
 * as an A built from strokes — the walls have to carry real weight before the
 * slit reads as a fold rather than as an outline. Wall eighteen, flap fourteen,
 * two of daylight between them.
 *
 * Both edges curve. The flaps hug the pole near the apex and swing out low
 * down, which is what makes the entrance a lens rather than a triangle.
 */
const outerAt = (t) => CX - 48 * t
const wallAt = (t) => CX - 30 * t ** 0.85
const flapWidthAt = (t) => 14 * t ** 1.05

/** The opening never closes below this, or the fire has nowhere to sit. */
const OPENING = 11

function shelter() {
  const c = canvas(W, H)

  for (let y = APEX; y <= FOOT; y += 1) {
    const t = (y - APEX) / SPAN
    const outer = Math.round(outerAt(t))
    const wallIn = Math.round(wallAt(t))
    const flapEnd = Math.min(wallIn + 2 + Math.round(flapWidthAt(t)), CX - OPENING)

    for (const side of [-1, 1]) {
      const flip = (x) => (side < 0 ? x : W - 1 - x)
      for (let x = outer; x < wallIn; x += 1) c.set(flip(x), y, INK)
      // two pixels of daylight, then the flap folded back inside
      for (let x = wallIn + 2; x < flapEnd; x += 1) c.set(flip(x), y, INK)
    }
  }

  /* feet: pads under each wall, and no ground line — the reference stands on
     its own rather than sitting on a bar */
  for (let i = 0; i < 3; i += 1) {
    for (let x = 0; x < 11; x += 1) {
      c.set(1 + x, FOOT + 1 - i, INK)
      c.set(W - 2 - x, FOOT + 1 - i, INK)
    }
  }

  /* the pole rises straight out of the apex, and the pennant flies right with
     a notch cut into its edge */
  for (let y = 2; y <= APEX + 2; y += 1) {
    c.set(CX - 1, y, INK)
    c.set(CX, y, INK)
  }
  stamp(
    c,
    [
      'mmmmmmmmmmmmmm',
      'mmmmmmmmmmmmmm',
      'mmmmmmmmmmmmm.',
      'mmmmmmmmmmmm..',
      'mmmmmmmmmmmmm.',
      'mmmmmmmmmmmmmm',
      'mmmmmmmmmmmmmm',
    ],
    CX + 1,
    2,
    { m: INK }
  )

  /* the glint, in the wood palette's dusty rose rather than a grey */
  stamp(c, ['..m..', '.mmm.', 'mmmmm', '.mmm.', '..m..'], 15, 72, { m: WOOD.p })

  /* the fire, doubled so the supplied eight-by-fourteen carries at this size.
     Drawn last, so it sits in the opening rather than behind the flaps. */
  const scale = 2
  const fx = CX - (8 * scale) / 2
  const fy = FOOT - 14 * scale + 1
  stamp(c, FIRE, fx, fy, F, scale)
  stamp(c, LOGS, fx, FOOT - 2, WOOD, 1)

  return c
}

function fireOnly() {
  const c = canvas(15, 17)
  stamp(c, FIRE, 3, 0, F)
  stamp(c, LOGS, 0, 14, WOOD)
  return c
}

/* ------------------------------------------------------------------ output */

/**
 * Grouped by colour, with the viewBox on the pixel grid and the module carried
 * by width and height: one fill attribute per colour instead of per rectangle,
 * and two-digit coordinates instead of four.
 */
function toSvg(c, module = 8) {
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

  const body = [...byColour]
    .map(
      ([colour, rs]) =>
        `  <g fill="${colour}">${rs
          .map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="1"/>`)
          .join('')}</g>`
    )
    .join('\n')

  return {
    runs: runs.length,
    svg: (note) => `<!-- ${note}

     GENERATED by scripts/make-shelter.mjs — run that, do not edit this.
     ${c.w} x ${c.h} pixels, in the two supplied palettes and nothing else. The
     viewBox is the pixel grid and the module rides on width and height, so one
     pixel lands on ${module} units at the natural size. crispEdges keeps a
     browser from smoothing the grid into mush. -->
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 ${c.w} ${c.h}"
  width="${c.w * module}"
  height="${c.h * module}"
  shape-rendering="crispEdges"
>
${body}
</svg>
`,
  }
}

const OUT = [
  ['logo-new.svg', shelter(), 'The shelter, with the supplied fire burning inside it.'],
  [
    'campfire.svg',
    fireOnly(),
    'brand/fire.svg over its logs, transcribed cell for cell.',
  ],
]

for (const [name, c, note] of OUT) {
  const out = toSvg(c)
  writeFileSync(join(root, 'brand', name), out.svg(note))
  console.log(`brand/${name.padEnd(16)} ${c.w} x ${c.h} px, ${out.runs} rects`)
}
