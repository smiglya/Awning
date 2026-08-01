import { writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Draws the shelter marks, and the campfire on its own.
 *
 *   node scripts/make-shelter.mjs
 *
 * Three prototypes, and they are three answers to the same two problems rather
 * than three moods. The concept needs nine colours the site does not declare,
 * and at the 24 pixels the navigation sets a mark at, a campfire inside a tent
 * is two orange dots.
 *
 *   logo-new.svg        Camp. The concept as drawn — flag, ground, the full
 *                       fire with its logs and embers. Large use only.
 *
 *   logo-new-ember.svg  The working mark. Square, cropped tight, no flag and no
 *                       ground, and a flame built only from --paper and the
 *                       three oranges the palette already owns. Adds nothing to
 *                       the palette and loses nothing at 24px.
 *
 *   logo-new-poles.svg  The open frame. A shelter is poles rather than walls,
 *                       and with the tie set where an A puts its crossbar the
 *                       mark reads as a tent, a fire and the letter at once.
 *
 * Nothing on the site renders any of them yet: choosing a mark is a decision,
 * not a side effect of drawing three.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const C = {
  ink: '#0A0A0A',
  paper: '#FAFAF9',
  hover: '#FF3E04',
  accent: '#FF6131',
  ember: '#FF3C00',
  d: '#A32218',
  r: '#E63A22',
  o: '#FF7A18',
  a: '#FFB13B',
  y: '#FFE08A',
  w: '#F4FBF6',
  l: '#E0BC8C',
  m: '#A9784E',
  k: '#5E3B22',
  spark: '#5A5A5A',
}

/**
 * Two ramps: the reference's, and one built only from colours the site owns.
 *
 * The second is the whole argument for the Ember prototype. --paper is the site
 * already declares a near-white, and the three oranges are already spent on
 * conversion, so a flame made of those four costs the palette nothing. The
 * reference's ramp is richer and needs nine values the design system would have
 * to be rewritten to allow.
 */
const RICH = [C.w, C.y, C.a, C.o, C.r, C.d]
const PALETTE = [C.paper, C.accent, C.hover, C.ember]

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

/**
 * The flame, built as heat rather than traced as an outline.
 *
 * The reference is concentric — a white heart, then yellow, amber, orange, red
 * and a dark rim — so the drawing is a heat field falling away from a point
 * under the base, cut into bands. Tracing bands by hand gives a flame whose
 * colours do not nest, and that reads as a mistake even when nobody can say
 * which pixel is wrong.
 *
 * `spread` is how hard the field is cut. A four-stop ramp needs a tighter cut
 * than a six-stop one or the heart swallows the flame — which is exactly what
 * the palette version did on its first pass.
 */
function drawFire(
  c,
  ox,
  oy,
  { fw, fh, bands, logs = true, sparks = true, rim = true, spread = 1.02 }
) {
  const cx = (fw - 1) / 2
  const base = fh - 0.5

  for (let y = 0; y < fh; y += 1) {
    const up = (base - y) / base
    let half = (fw / 2.6) * Math.sin(Math.PI * Math.min(1, up * 0.86 + 0.14)) ** 0.75
    half *= 0.82 + hash(y, 3) * 0.36
    if (up > 0.72) half *= 1 - (up - 0.72) * 1.6

    for (let x = 0; x < fw; x += 1) {
      const dx = Math.abs(x + 0.5 - cx - 0.5)
      if (dx > half) continue
      const heat = (1 - dx / Math.max(0.8, half)) * 0.68 + (1 - up) * 0.62
      const wobble = hash(x * 7, y * 13) * 0.1
      const band = Math.min(
        bands.length - 1,
        Math.max(0, Math.floor((1 - heat + wobble) * bands.length * spread))
      )
      c.set(ox + x, oy + y, bands[band])
    }
  }

  /**
   * The dark rim, applied by neighbour rather than by radius. A radius follows
   * the maths; the rim has to follow the silhouette, and the silhouette is the
   * ragged part.
   */
  if (rim) {
    const lit = new Set(bands.slice(0, -1))
    const edge = []
    for (let y = 0; y < fh; y += 1) {
      for (let x = 0; x < fw; x += 1) {
        if (!lit.has(c.at(ox + x, oy + y))) continue
        const bare = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].some(([dx, dy]) => !c.at(ox + x + dx, oy + y + dy))
        if (bare) edge.push([ox + x, oy + y])
      }
    }
    for (const [x, y] of edge) c.set(x, y, bands[bands.length - 1])
  }

  /* embers, which is what stops a flame looking cut out of paper */
  if (sparks) {
    const shades = bands.length > 4 ? [C.d, C.r, C.o] : [C.ember, C.hover, C.accent]
    const spots = [
      [Math.round(fw * 0.2), 3],
      [Math.round(fw * 0.85), 2],
      [Math.round(fw * 0.1), 7],
      [Math.round(fw * 0.95), 8],
      [Math.round(fw * 0.05), 12],
    ]
    spots.forEach(([x, y], i) => c.set(ox + x, oy + y, shades[i % shades.length]))
  }

  if (logs) {
    const rows = ['kmmlmmk.kmmlmmk.kmlk', 'kllmllk.kllmllk.klmk', '.kmmmk...kmmmk..kmk.']
    const scale = fw / 20
    rows.forEach((row, i) => {
      for (let x = 0; x < row.length; x += 1) {
        const ch = row[x]
        if (ch === '.') continue
        c.set(
          ox + Math.round(x * scale),
          oy + fh + i,
          ch === 'k' ? C.k : ch === 'm' ? C.m : C.l
        )
      }
    })
  }
}

/**
 * The A-frame: two walls, with the entrance flaps folded back inside.
 *
 * `flap` at zero leaves a plain silhouette, which is what the small mark wants
 * — the fold is a detail that turns to noise below about forty pixels.
 */
function drawFrame(c, { cx, apex, foot, outer, wall, flap }) {
  for (let y = apex; y <= foot; y += 1) {
    const t = (y - apex) / (foot - apex)
    const o = Math.round(cx - outer * t)
    const wallIn = o + Math.max(1, Math.round(wall * t))
    const flapW = flap ? Math.max(1, Math.round(flap * t)) : 0

    for (const side of [-1, 1]) {
      const flip = (x) => (side < 0 ? x : c.w - 1 - x)
      for (let x = o; x < wallIn; x += 1) c.set(flip(x), y, C.ink)
      if (!flapW) continue

      /**
       * Two pixels of daylight, then the flap. Two rather than one: a
       * single-pixel seam on a diagonal is a staircase that keeps closing up
       * under rounding, and what renders is a dotted line that reads as a fault
       * rather than as a fold.
       *
       * Clamped short of the centre, or near the apex the two sides cross and
       * draw an X through the top of the tent.
       */
      const end = Math.min(wallIn + 2 + flapW, cx - 1)
      for (let x = wallIn + 2; x < end; x += 1) c.set(flip(x), y, C.ink)
    }
  }
}

/* ------------------------------------------------------ 1. Camp, the scene */

function camp() {
  const c = canvas(80, 84)
  const CX = 40
  const FOOT = 76
  drawFrame(c, { cx: CX, apex: 16, foot: FOOT, outer: 38, wall: 20, flap: 8 })

  for (let i = 0; i < 4; i += 1) {
    for (let x = 0; x < 7; x += 1) {
      c.set(2 + x, FOOT - i, C.ink)
      c.set(c.w - 3 - x, FOOT - i, C.ink)
    }
  }
  for (let y = FOOT + 1; y <= FOOT + 4; y += 1) {
    for (let x = 0; x < c.w; x += 1) c.set(x, y, C.ink)
  }

  for (let y = 6; y <= 18; y += 1) {
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

  const star = ['..m..', '.mmm.', 'mmmmm', '.mmm.', '..m..']
  star.forEach((row, i) => {
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] === 'm') c.set(11 + x, 58 + i, C.spark)
    }
  })

  drawFire(c, CX - 10, FOOT - 26, { fw: 20, fh: 21, bands: RICH })
  return c
}

/* -------------------------------------------- 2. Ember, the working mark */

function ember() {
  const c = canvas(48, 48)
  const CX = 24
  drawFrame(c, { cx: CX, apex: 3, foot: 44, outer: 23, wall: 13, flap: 0 })
  for (let y = 45; y <= 47; y += 1) {
    for (let x = 0; x < c.w; x += 1) c.set(x, y, C.ink)
  }
  drawFire(c, CX - 7, 30, {
    fw: 14,
    fh: 14,
    bands: PALETTE,
    logs: false,
    sparks: false,
    spread: 1.5,
  })
  return c
}

/* ------------------------------------------ 3. Poles, the open structure */

function poles() {
  const c = canvas(72, 76)
  const CX = 36
  const APEX = 14
  const FOOT = 68
  const TH = 4

  /* the poles run past their crossing, the way lashed poles do */
  for (let y = 4; y <= FOOT; y += 1) {
    const t = (y - APEX) / (FOOT - APEX)
    const lean = Math.round(30 * t)
    for (let i = 0; i < TH; i += 1) {
      c.set(CX - lean - i, y, C.ink)
      c.set(CX + lean + i - (TH - 1), y, C.ink)
    }
  }

  /* the tie, set where an A puts its crossbar — which is what makes this one
     a letter as well as a shelter */
  for (let y = 41; y < 45; y += 1) {
    const t = (y - APEX) / (FOOT - APEX)
    const lean = Math.round(30 * t)
    for (let x = CX - lean; x <= CX + lean; x += 1) c.set(x, y, C.ink)
  }
  for (let y = FOOT + 1; y <= FOOT + 3; y += 1) {
    for (let x = 0; x < c.w; x += 1) c.set(x, y, C.ink)
  }

  drawFire(c, CX - 9, FOOT - 24, { fw: 18, fh: 20, bands: RICH })
  return c
}

/* -------------------------------------------------- the fire on its own */

function fireOnly() {
  const c = canvas(20, 26)
  drawFire(c, 0, 0, { fw: 20, fh: 21, bands: RICH })
  return c
}

/* ------------------------------------------------------------------ output */

/**
 * Grouped by colour, with the viewBox on the pixel grid and the module carried
 * by width and height: one fill attribute per colour instead of per rectangle,
 * and two-digit coordinates instead of four.
 */
function toSvg(c, module = 16) {
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
     ${c.w} x ${c.h} pixels. The viewBox is the pixel grid and the module rides
     on width and height, so one pixel lands on ${module} units at the natural
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
  ['logo-new.svg', camp(), 'Camp: the concept as drawn, for large use.'],
  ['logo-new-ember.svg', ember(), 'The working mark, in palette colours only.'],
  ['logo-new-poles.svg', poles(), 'The open frame, which also reads as an A.'],
  ['campfire.svg', fireOnly(), 'The campfire that burns inside the shelter.'],
]

for (const [name, c, note] of OUT) {
  const out = toSvg(c)
  writeFileSync(join(root, 'brand', name), out.svg(note))
  console.log(`brand/${name.padEnd(20)} ${c.w} x ${c.h} px, ${out.runs} rects`)
}
