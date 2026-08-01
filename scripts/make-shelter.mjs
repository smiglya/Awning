import { writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Draws the shelter, and the campfire on its own.
 *
 *   node scripts/make-shelter.mjs
 *
 * The silhouette is black, by instruction — the reference (brand/Концепт.png)
 * is a black mass, and black is the one colour here that comes from neither
 * supplied palette. Everything that burns or holds the fire does:
 * brand/fire-palitra.svg for the flame and its embers, brand/wood-palitra.svg
 * for the pile.
 *
 *   logo-new.svg   The shelter, with the supplied fire burning inside it.
 *   campfire.svg   That fire and its woodpile on their own.
 *
 * Nothing on the site renders either yet. Replacing the mark is a decision, and
 * the reference lockups under brand/ are still the ones in use.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** The silhouette. Not a palette colour, and not a token — the mark's own. */
const BLACK = '#000000'

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

/**
 * brand/fire.svg, cell for cell.
 *
 * Eight by fourteen, transcribed rather than redrawn — the supplied flame is
 * the reference, and a flame generated to look like it would drift the moment
 * either file changed. If the flame is redrawn (one is in progress), this
 * table is the only thing to update: re-transcribe and rerun.
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

/* --------------------------------------------------------------- woodpile */

/**
 * Five logs, stacked the way the reference stacks them: two legs leaning into
 * the flame from either side, a sleeper behind them and two in front. The legs
 * are what make it a стопка домиком rather than a row — they cross into the
 * fire, and their tips char where they enter it.
 *
 * Lighting comes from the flame, so each leg carries its light face on the
 * side that looks at the fire and its dark rim on the side that looks away.
 * The pile is drawn back to front, painter's order, and after the flame — the
 * fire rises from behind the wood, which is why the flame bitmap's bottom rows
 * are allowed to vanish behind the sleepers.
 */
const PILE_W = 14
const PILE_H = 5

function drawWoodpile(c, ox, oy, scale) {
  const cell = (x, y, colour) => {
    for (let dy = 0; dy < scale; dy += 1) {
      for (let dx = 0; dx < scale; dx += 1) {
        c.set(ox + x * scale + dx, oy + y * scale + dy, colour)
      }
    }
  }
  const sleeper = (x0, x1, y, top, rim) => {
    for (let x = x0; x <= x1; x += 1) {
      cell(x, y, x === x0 || x === x1 ? rim : top)
      cell(x, y + 1, rim)
    }
  }

  sleeper(2, 11, 1, WOOD.n, WOOD.u)
  sleeper(0, 7, 3, WOOD.p, WOOD.k)
  sleeper(6, 13, 3, WOOD.b, WOOD.k)

  for (let r = 0; r < PILE_H; r += 1) {
    const x = 4 - r
    // charred where the tip sits inside the flame, lit wood below
    const face = r === 0 ? WOOD.g : WOOD.p
    cell(x, r, WOOD.k)
    cell(x + 1, r, face)
    cell(PILE_W - 2 - x, r, face)
    cell(PILE_W - 1 - x, r, WOOD.k)
  }
}

/* ---------------------------------------------------------------- embers */

/**
 * The reference scatters embers across the black — riding the updraft above
 * the flame, caught on the flaps and walls. Fixed positions, not noise: the
 * same drawing every run. Each is one fire-scale cell, and the gold ones sit
 * only on black, where 8.32:1 makes them glow — on white, gold is 1.5:1 and
 * reads as a stain.
 */
const EMBERS = [
  // in the entrance, riding up from the flame
  [48, 46, F.A],
  [53, 52, F.R],
  [43, 56, F.O],
  [56, 58, F.R],
  [40, 64, F.A],
  [51, 38, F.R],
  [44, 30, F.A],
  // caught on the flaps
  [31, 74, F.O],
  [27, 82, F.R],
  [64, 72, F.A],
  [69, 80, F.R],
  // and on the walls
  [14, 78, F.A],
  [19, 76, F.G],
  [83, 80, F.O],
]

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
      for (let x = outer; x < wallIn; x += 1) c.set(flip(x), y, BLACK)
      // two pixels of daylight, then the flap folded back inside
      for (let x = wallIn + 2; x < flapEnd; x += 1) c.set(flip(x), y, BLACK)
    }
  }

  /* feet: pads under each wall, and no ground line — the reference stands on
     its own rather than sitting on a bar */
  for (let i = 0; i < 3; i += 1) {
    for (let x = 0; x < 11; x += 1) {
      c.set(1 + x, FOOT + 1 - i, BLACK)
      c.set(W - 2 - x, FOOT + 1 - i, BLACK)
    }
  }

  /* the pole rises straight out of the apex, and the pennant flies right with
     a notch cut into its edge */
  for (let y = 2; y <= APEX + 2; y += 1) {
    c.set(CX - 1, y, BLACK)
    c.set(CX, y, BLACK)
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
    { m: BLACK }
  )

  /* the glint on the wall, in the wood palette's dusty rose */
  stamp(c, ['..m..', '.mmm.', 'mmmmm', '.mmm.', '..m..'], 15, 72, { m: WOOD.p })

  /* the fire, doubled so the supplied eight-by-fourteen carries at this size,
     then the woodpile in front of it and the embers over everything.

     The flame rides high enough that the pile hides only its two bottom rows —
     the first attempt let the wood swallow the wide gold rows and the fire
     came out stubby. Two rows is the natural seam: they are the ones with the
     gap the original bitmap already leaves for the wood. */
  const scale = 2
  stamp(
    c,
    FIRE,
    CX - (8 * scale) / 2,
    FOOT - 14 * scale + 1 - (PILE_H - 2) * scale,
    F,
    scale
  )
  drawWoodpile(c, CX - PILE_W, FOOT - PILE_H * scale + 1, scale)

  for (const [x, y, colour] of EMBERS) {
    for (let dy = 0; dy < scale; dy += 1) {
      for (let dx = 0; dx < scale; dx += 1) c.set(x + dx, y + dy, colour)
    }
  }

  return c
}

/* --------------------------------------------------- the fire on its own */

function fireOnly() {
  const c = canvas(14, 20)
  stamp(c, FIRE, 3, 3, F)
  drawWoodpile(c, 0, 15, 1)
  for (const [x, y, colour] of [
    [6, 0, F.A],
    [9, 1, F.R],
    [3, 2, F.O],
  ]) {
    c.set(x, y, colour)
  }
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
     ${c.w} x ${c.h} pixels: a black silhouette, fire and wood in the two
     supplied palettes. The viewBox is the pixel grid and the module rides on
     width and height, so one pixel lands on ${module} units at the natural
     size. crispEdges keeps a browser from smoothing the grid into mush. -->
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
  ['logo-new.svg', shelter(), 'The shelter, black, with the supplied fire inside it.'],
  [
    'campfire.svg',
    fireOnly(),
    'The fire over its woodpile, stacked as the reference stacks it.',
  ],
]

for (const [name, c, note] of OUT) {
  const out = toSvg(c)
  writeFileSync(join(root, 'brand', name), out.svg(note))
  console.log(`brand/${name.padEnd(16)} ${c.w} x ${c.h} px, ${out.runs} rects`)
}
