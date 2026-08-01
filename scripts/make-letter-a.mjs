import { writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Draws brand/letter-a-log.svg: the letter A built from three logs.
 *
 *   node scripts/make-letter-a.mjs
 *
 * Nothing on the site renders it yet. It exists as a script rather than as a
 * hand-kept file because the drawing is four hundred rectangles of wood grain —
 * a thing nobody can edit by hand, and a generated file with no generator is
 * the kind of asset that gets replaced rather than changed the first time it
 * needs a tweak.
 *
 * Open the SVG to look at it. There is no PNG step here on purpose: the one in
 * scripts/make-images.mjs exists because the Open Graph card has to be a raster,
 * and a second copy of a PNG encoder to preview a file a browser already opens
 * would be weight for nothing.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/* ------------------------------------------------------------------ canvas */

const W = 44
const H = 54

/** Rendered size of one pixel. Coordinates stay on the pixel grid. */
const MODULE = 16

const APEX_X = 22
const TOP_Y = 2
const FOOT_Y = 53
const SPREAD = 16

/** Log thickness, in pixels. */
const T = 10

/** How much of a log's cut end you see. */
const CAP_H = 6

const BAR_TOP = 34
const BAR_BOT = 44
const BAR_L = 13
const BAR_R = 42

/* ----------------------------------------------------------------- timber */

const C = {
  edge: '#14151C',
  w0: '#1D1F28',
  w2: '#382D27',
  w4: '#544131',
  w5: '#634D39',
  w6: '#725A41',
  e0: '#5E432E',
  e1: '#8A6440',
  e2: '#B4864F',
  e3: '#D2A26F',
}

/** Darkest to lightest. A streak steps along this rather than jumping about. */
const RAMP = [C.w0, C.w2, C.w4, C.w5, C.w6]

const grid = Array.from({ length: H }, () => Array(W).fill(null))
const px = (x, y, c) => {
  if (x >= 0 && x < W && y >= 0 && y < H) grid[y][x] = c
}

/** Deterministic: the same drawing every run, so the file is diffable. */
function hash(a, b) {
  let n = a * 374761393 + b * 668265263
  n = (n ^ (n >>> 13)) * 1274126177
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296
}

/**
 * One row of sawn timber.
 *
 * The shade walks rather than jumps — each streak steps one place along the
 * ramp from the last, and runs 7 to 16 pixels. Short segments of unrelated
 * shades read as static; long ones that drift read as grain. That is the whole
 * trick, and it is the difference between wood and noise.
 *
 * The position within the log biases it on top: the left takes the light and
 * the right falls away, which is what gives a flat rectangle its roundness.
 */
function timberRow(y, x0, x1, seed) {
  const out = []
  let level = 2 + Math.floor(hash(seed, y) * 2)
  let x = x0

  while (x < x1) {
    const len = 7 + Math.floor(hash(seed + x, y) * 10)
    const step = hash(y, seed + x * 3)
    if (step < 0.34) level -= 1
    else if (step > 0.68) level += 1
    level = Math.max(0, Math.min(RAMP.length - 1, level))

    for (let i = 0; i < len && x + i < x1; i += 1) {
      const depth = (x + i - x0) / Math.max(1, x1 - x0)
      let lvl = level
      if (depth < 0.22) lvl += 1
      else if (depth > 0.7) lvl -= 2
      out.push([x + i, RAMP[Math.max(0, Math.min(RAMP.length - 1, lvl))]])
    }
    x += len
  }

  return out
}

/**
 * The cut end of a log: concentric rings, lightest at the sapwood.
 * This is the one detail that says timber rather than a painted bar.
 */
function endGrain(x0, y0, w, h) {
  const rings = [C.e2, C.e0, C.e3, C.e1, C.e0, C.e1]
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const d = Math.min(x, y, w - 1 - x, h - 1 - y)
      px(x0 + x, y0 + y, rings[Math.min(d, rings.length - 1)])
    }
  }
}

/** Where each leg's centre sits on a given row. */
const span = (y) => {
  const t = (y - TOP_Y) / (FOOT_Y - TOP_Y)
  return {
    left: Math.round(APEX_X - SPREAD * t),
    right: Math.round(APEX_X + SPREAD * t),
  }
}

/* --------------------------------------------------------------- the legs */

for (let y = TOP_Y; y <= FOOT_Y; y += 1) {
  const { left, right } = span(y)

  for (const [centre, seed] of [
    [left, 11],
    [right, 29],
  ]) {
    const x0 = centre - T / 2
    const x1 = centre + T / 2
    for (const [x, shade] of timberRow(y, x0, x1, seed)) px(x, y, shade)
    px(x0 - 1, y, C.edge)
    px(x1, y, C.edge)
  }
}

/* the apex is one log end seen from above, so cap it rather than leave a seam */
endGrain(APEX_X - T / 2, TOP_Y, T, CAP_H)
for (let x = APEX_X - T / 2 - 1; x <= APEX_X + T / 2; x += 1) px(x, TOP_Y - 1, C.edge)

/* the right foot, cut off square */
{
  const { right } = span(FOOT_Y - CAP_H + 1)
  endGrain(right - T / 2, FOOT_Y - CAP_H + 1, T, CAP_H)
  for (let x = right - T / 2 - 1; x <= right + T / 2; x += 1) px(x, FOOT_Y + 1, C.edge)
}

/* ------------------------------------------- the crossbar, laid over the legs */

for (let y = BAR_TOP; y < BAR_BOT; y += 1) {
  const depth = (y - BAR_TOP) / (BAR_BOT - BAR_TOP)
  for (const [x, shade] of timberRow(y, BAR_L, BAR_R, 53)) {
    let out = shade
    // a beam lit from above: the top edge takes it, the underside loses it
    if (depth < 0.12) out = C.w6
    else if (depth < 0.24) out = C.w5
    else if (depth > 0.88) out = C.w0
    else if (depth > 0.76) out = C.w2
    px(x, y, out)
  }
}
for (let x = BAR_L; x <= BAR_R; x += 1) {
  px(x, BAR_TOP - 1, C.edge)
  px(x, BAR_BOT, C.edge)
}

/* its right end overshoots the leg, the way a beam overshoots a post */
endGrain(BAR_R - 5, BAR_TOP, 6, BAR_BOT - BAR_TOP)
for (let y = BAR_TOP - 1; y <= BAR_BOT; y += 1) px(BAR_R + 1, y, C.edge)

/* ------------------------------------------------------------------ output */

const runs = []
for (let y = 0; y < H; y += 1) {
  let x = 0
  while (x < W) {
    const c = grid[y][x]
    if (!c) {
      x += 1
      continue
    }
    let w = 1
    while (x + w < W && grid[y][x + w] === c) w += 1
    runs.push({ x, y, w, c })
    x += w
  }
}

/**
 * Grouped by colour, and the viewBox is the pixel grid rather than the rendered
 * size. Both are size: one fill attribute per colour instead of per rectangle,
 * and two-digit coordinates instead of four. width and height carry the module,
 * so a pixel still lands on 16 device units at the default size.
 */
const byColour = new Map()
for (const r of runs) byColour.set(r.c, [...(byColour.get(r.c) ?? []), r])

const svg = `<!-- The letter A, built from three logs. GENERATED by
     scripts/make-letter-a.mjs — run that, do not edit this.

     44 x 54 pixels, logs 10 thick. The viewBox is the pixel grid and the
     width and height carry the module, so one pixel renders as 16 units at the
     natural size. crispEdges keeps the browser from smoothing the grain into
     mush at any other size. -->
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 ${W} ${H}"
  width="${W * MODULE}"
  height="${H * MODULE}"
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

writeFileSync(join(root, 'brand/letter-a-log.svg'), svg)

console.log(
  `brand/letter-a-log.svg  ${W} x ${H} px, logs ${T} thick, ` +
    `${runs.length} rects, ${(svg.length / 1024).toFixed(1)} kB`
)
