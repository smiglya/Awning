import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Generates the two raster assets the site needs, with no dependencies and no
 * network: a 1200x630 Open Graph card and a hero video poster.
 *
 * Written as code rather than shipped as binaries so the brand geometry stays
 * editable and reviewable in the diff. Both are drawn from the same primitives
 * as the logo: two rounded bars rotated -35 degrees.
 *
 * What it draws is geometry only — no type, because rasterising a font without
 * a library is not worth the code. A designed card with the headline on it will
 * always beat this one, so an existing file is never overwritten: drop your own
 * public/og-image.png in and it survives every build. Pass --force to redraw.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const INK = [0x0a, 0x0a, 0x0a]
const PAPER = [0xfa, 0xfa, 0xf9]
const GREY = [0xde, 0xde, 0xda]

/* ------------------------------------------------------------ PNG encoding */

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buffer) {
  let c = 0xffffffff
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

/** @param pixels RGB triples, row-major */
function encodePng(width, height, pixels) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // truecolour RGB
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  // each scanline is prefixed with its filter type; 0 means none
  const raw = Buffer.alloc(height * (1 + width * 3))
  let offset = 0
  for (let y = 0; y < height; y += 1) {
    raw[offset] = 0
    offset += 1
    pixels.copy(raw, offset, y * width * 3, (y + 1) * width * 3)
    offset += width * 3
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* --------------------------------------------------------------- geometry */

/** Signed distance to a rounded rectangle centred at the origin. */
function roundedRectSdf(x, y, halfW, halfH, radius) {
  const dx = Math.abs(x) - (halfW - radius)
  const dy = Math.abs(y) - (halfH - radius)
  const ox = Math.max(dx, 0)
  const oy = Math.max(dy, 0)
  return Math.hypot(ox, oy) + Math.min(Math.max(dx, dy), 0) - radius
}

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

/**
 * Draws the logo mark: two rounded bars, rotated -35 degrees together.
 * @returns coverage 0..1 for antialiasing
 */
function markCoverage(px, py, cx, cy, scale) {
  const angle = (-35 * Math.PI) / 180
  // inverse-rotate the sample point into the mark's own space
  const dx = px - cx
  const dy = py - cy
  const cos = Math.cos(-angle)
  const sin = Math.sin(-angle)
  const lx = (dx * cos - dy * sin) / scale
  const ly = (dx * sin + dy * cos) / scale

  // matches the SVG in components/icons and SiteNav: 26x26 viewBox, two bars
  const barA = roundedRectSdf(lx - (7.5 - 13), ly - (13 - 13), 3.5, 11, 3.5)
  const barB = roundedRectSdf(lx - (18.5 - 13), ly - (15.25 - 13), 3.5, 8.75, 3.5)
  const d = Math.min(barA, barB)

  // one-pixel feather, expressed in mark units
  const feather = 1 / scale
  if (d <= -feather) return 1
  if (d >= feather) return 0
  return 0.5 - d / (2 * feather)
}

/* ------------------------------------------------------------------ cards */

function drawOgImage() {
  const width = 1200
  const height = 630
  const pixels = Buffer.alloc(width * height * 3)

  const markCx = 250
  const markCy = 300
  const markScale = 11 // 26 units * 11 ≈ 286px tall

  const barTop = height - 96

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let colour = PAPER

      // faint plotting grid, same 64px module as the showcase section
      if (x % 64 === 0 || y % 64 === 0) colour = mix(PAPER, GREY, 0.55)

      // ink band along the bottom, echoing the marquee strip
      if (y >= barTop) colour = INK

      const coverage = markCoverage(x, y, markCx, markCy, markScale)
      if (coverage > 0) colour = mix(colour, INK, coverage)

      const offset = (y * width + x) * 3
      pixels[offset] = colour[0]
      pixels[offset + 1] = colour[1]
      pixels[offset + 2] = colour[2]
    }
  }

  return encodePng(width, height, pixels)
}

function drawPoster() {
  // 16:9, matching the hero video, so the poster cannot shift layout
  const width = 1280
  const height = 720
  const pixels = Buffer.alloc(width * height * 3)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let colour = PAPER
      if (x % 80 === 0 || y % 80 === 0) colour = mix(PAPER, GREY, 0.4)

      const coverage = markCoverage(x, y, width / 2, height / 2, 9)
      if (coverage > 0) colour = mix(colour, GREY, coverage)

      const offset = (y * width + x) * 3
      pixels[offset] = colour[0]
      pixels[offset + 1] = colour[1]
      pixels[offset + 2] = colour[2]
    }
  }

  return encodePng(width, height, pixels)
}

/**
 * Deliberately exits 0 even on failure. `npm run build` chains this before the
 * prerender, and both assets are cosmetic: the prerender already omits the
 * social tags when the card is absent, and a missing poster costs one blank
 * frame. Neither is worth failing a deploy over.
 */
const force = process.argv.includes('--force')

function emit(name, draw, note) {
  const target = join(root, 'public', name)
  if (existsSync(target) && !force) {
    console.log(`${name}  kept (already present; --force to redraw)`)
    return
  }
  const png = draw()
  writeFileSync(target, png)
  console.log(`${name}  ${(png.length / 1024).toFixed(1)} kB  ${note}`)
}

try {
  mkdirSync(join(root, 'public'), { recursive: true })
  emit('og-image.png', drawOgImage, '1200x630')
  emit('hero-poster.png', drawPoster, '1280x720')
} catch (error) {
  console.warn('[images] skipped:', error.message)
}
