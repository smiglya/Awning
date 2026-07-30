import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseSvg, rasterise } from './lib/svg-raster.mjs'

/**
 * Generates the two raster assets the site needs, with no dependencies and no
 * network: a 1200x630 Open Graph card and a hero video poster.
 *
 * Both are drawn from brand/*.svg, so the artwork has exactly one home. This
 * script used to carry its own copy of the mark's geometry, which made four
 * copies in the repo and no way to notice when one fell behind.
 *
 * An existing file is never overwritten: drop a designed card into
 * public/og-image.png and it survives every build. Pass --force to redraw.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const INK = [0x0a, 0x0a, 0x0a]
const PAPER = [0xfa, 0xfa, 0xf9]
const GREY = [0xde, 0xde, 0xda]

const artwork = (name) => parseSvg(readFileSync(join(root, 'brand', name), 'utf8')).shapes

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

/* ------------------------------------------------------------- compositing */

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

class Canvas {
  constructor(width, height) {
    this.width = width
    this.height = height
    this.pixels = Buffer.alloc(width * height * 3)
  }

  /** @param paint (x, y) => colour triple */
  each(paint) {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const colour = paint(x, y)
        const offset = (y * this.width + x) * 3
        this.pixels[offset] = colour[0]
        this.pixels[offset + 1] = colour[1]
        this.pixels[offset + 2] = colour[2]
      }
    }
  }

  get(x, y) {
    const offset = (y * this.width + x) * 3
    return [this.pixels[offset], this.pixels[offset + 1], this.pixels[offset + 2]]
  }

  /** Composites artwork in one flat colour, respecting the antialiased edge. */
  draw(shapes, box, colour) {
    const coverage = rasterise(shapes, this.width, this.height, box)
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const alpha = coverage[y * this.width + x]
        if (alpha <= 0) continue
        const blended = mix(this.get(x, y), colour, Math.min(alpha, 1))
        const offset = (y * this.width + x) * 3
        this.pixels[offset] = blended[0]
        this.pixels[offset + 1] = blended[1]
        this.pixels[offset + 2] = blended[2]
      }
    }
  }

  toPng() {
    return encodePng(this.width, this.height, this.pixels)
  }
}

/* ------------------------------------------------------------------ cards */

/**
 * The link preview. What matters here is that the brand name is legible at the
 * size Slack and Telegram actually render — roughly 360px wide in a sidebar —
 * so the lockup gets over half the width and everything else stays quiet.
 */
function drawOgImage() {
  const canvas = new Canvas(1200, 630)
  const bandTop = 630 - 96

  canvas.each((x, y) => {
    if (y >= bandTop) return INK
    // faint plotting grid, same 64px module as the showcase section
    if (x % 64 === 0 || y % 64 === 0) return mix(PAPER, GREY, 0.55)
    return PAPER
  })

  // One margin governs everything: the lockup spans the full measure and the
  // signature mark hangs off the same left edge.
  const margin = 160
  const measure = 1200 - margin * 2

  canvas.draw(
    artwork('awning-logotype.svg'),
    { x: margin, y: 150, width: measure, height: 250 },
    INK
  )
  // the mark alone, reversed out of the band
  canvas.draw(artwork('logo.svg'), { x: margin, y: bandTop + 26, width: 44, height: 44 }, PAPER)

  return canvas.toPng()
}

/**
 * Stands in for the hero video until enough of it has arrived, and permanently
 * on a network that blocks the CDN. Deliberately quiet: it is a held breath
 * before the animation, not a competing image.
 */
function drawPoster() {
  const canvas = new Canvas(1280, 720)

  canvas.each((x, y) => (x % 80 === 0 || y % 80 === 0 ? mix(PAPER, GREY, 0.4) : PAPER))
  canvas.draw(artwork('logo.svg'), { x: 490, y: 210, width: 300, height: 300 }, GREY)

  return canvas.toPng()
}

/* ------------------------------------------------------------------- write */

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

/**
 * Deliberately exits 0 even on failure. `npm run build` chains this before the
 * prerender, and both assets are cosmetic: the prerender already omits the
 * social tags when the card is absent, and a missing poster costs one blank
 * frame. Neither is worth failing a deploy over.
 */
try {
  mkdirSync(join(root, 'public'), { recursive: true })
  emit('og-image.png', drawOgImage, '1200x630')
  emit('hero-poster.png', drawPoster, '1280x720')
} catch (error) {
  console.warn('[images] skipped:', error.message)
}
