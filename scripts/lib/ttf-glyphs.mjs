/**
 * Pulls glyph outlines out of a TrueType file.
 *
 * Enough of the format to set one word, and nothing else: head, maxp, cmap,
 * loca, glyf, hmtx and OS/2. No hinting, no shaping, no ligatures, no kerning
 * from GPOS — a six-letter lockup needs none of them, and everything it does
 * need is checked at load rather than assumed.
 *
 * Outlines come out as cubic path data, because TrueType stores quadratics and
 * every consumer here speaks cubic. The conversion is exact, not approximate.
 */

class Reader {
  constructor(buffer, offset = 0) {
    this.buffer = buffer
    this.offset = offset
  }
  u8() {
    return this.buffer[this.offset++]
  }
  u16() {
    const value = this.buffer.readUInt16BE(this.offset)
    this.offset += 2
    return value
  }
  i16() {
    const value = this.buffer.readInt16BE(this.offset)
    this.offset += 2
    return value
  }
  u32() {
    const value = this.buffer.readUInt32BE(this.offset)
    this.offset += 4
    return value
  }
}

function tables(buffer) {
  const reader = new Reader(buffer, 4)
  const count = reader.u16()
  reader.offset += 6
  const found = new Map()
  for (let i = 0; i < count; i += 1) {
    const tag = buffer.toString('ascii', reader.offset, reader.offset + 4)
    reader.offset += 8
    found.set(tag, reader.u32())
    reader.offset += 4
  }
  return found
}

/** Format 4 and 12 only — every Latin font in use has one or the other. */
function characterMap(buffer, cmapStart) {
  const reader = new Reader(buffer, cmapStart + 2)
  const count = reader.u16()

  let best = null
  for (let i = 0; i < count; i += 1) {
    const platform = reader.u16()
    const encoding = reader.u16()
    const offset = reader.u32()
    const unicode =
      (platform === 3 && (encoding === 1 || encoding === 10)) || platform === 0
    if (unicode) best = cmapStart + offset
  }
  if (best === null) throw new Error('cmap: no Unicode subtable')

  const sub = new Reader(buffer, best)
  const format = sub.u16()
  const map = new Map()

  if (format === 4) {
    sub.offset += 4
    const segments = sub.u16() / 2
    sub.offset += 6
    const ends = Array.from({ length: segments }, () => sub.u16())
    sub.offset += 2
    const starts = Array.from({ length: segments }, () => sub.u16())
    const deltas = Array.from({ length: segments }, () => sub.i16())
    const rangeOffsetAt = sub.offset
    const rangeOffsets = Array.from({ length: segments }, () => sub.u16())

    for (let s = 0; s < segments; s += 1) {
      for (let code = starts[s]; code <= ends[s] && code !== 0xffff; code += 1) {
        let glyph
        if (rangeOffsets[s] === 0) {
          glyph = (code + deltas[s]) & 0xffff
        } else {
          const at = rangeOffsetAt + s * 2 + rangeOffsets[s] + (code - starts[s]) * 2
          glyph = buffer.readUInt16BE(at)
          if (glyph !== 0) glyph = (glyph + deltas[s]) & 0xffff
        }
        if (glyph !== 0) map.set(code, glyph)
      }
    }
    return map
  }

  if (format === 12) {
    sub.offset += 10
    const groups = sub.u32()
    for (let g = 0; g < groups; g += 1) {
      const start = sub.u32()
      const end = sub.u32()
      const glyph = sub.u32()
      for (let code = start; code <= end; code += 1) map.set(code, glyph + (code - start))
    }
    return map
  }

  throw new Error(`cmap: unsupported format ${format}`)
}

/** @returns contours: arrays of {x, y, on} */
function readGlyph(buffer, glyf, loca, index, depth = 0) {
  if (depth > 4) throw new Error('glyf: composite nesting too deep')
  const start = loca[index]
  const end = loca[index + 1]
  if (start === end) return [] // an empty glyph, such as a space

  const reader = new Reader(buffer, glyf + start)
  const contourCount = reader.i16()
  reader.offset += 8 // bounding box, which we recompute from the points anyway

  if (contourCount < 0) {
    // composite: 'i' and every accented letter are usually built this way
    const contours = []
    for (;;) {
      const flags = reader.u16()
      const glyphIndex = reader.u16()
      let dx
      let dy
      if (flags & 1) {
        dx = reader.i16()
        dy = reader.i16()
      } else {
        dx = (reader.u8() << 24) >> 24
        dy = (reader.u8() << 24) >> 24
      }
      if (flags & 8) reader.offset += 2
      else if (flags & 0x40) reader.offset += 4
      else if (flags & 0x80) reader.offset += 8

      if (!(flags & 2)) {
        throw new Error('glyf: composite uses point matching, which is not supported')
      }

      for (const contour of readGlyph(buffer, glyf, loca, glyphIndex, depth + 1)) {
        contours.push(contour.map((p) => ({ x: p.x + dx, y: p.y + dy, on: p.on })))
      }
      if (!(flags & 0x20)) break
    }
    return contours
  }

  const endPoints = Array.from({ length: contourCount }, () => reader.u16())
  const total = contourCount === 0 ? 0 : endPoints[contourCount - 1] + 1

  // Read the length into a variable first. `offset += reader.u16()` would not
  // work: a compound assignment reads its target before evaluating the right
  // side, so u16's own two-byte advance gets overwritten.
  const instructionLength = reader.u16()
  reader.offset += instructionLength

  const flags = []
  while (flags.length < total) {
    const flag = reader.u8()
    flags.push(flag)
    if (flag & 8) {
      const repeat = reader.u8()
      for (let r = 0; r < repeat; r += 1) flags.push(flag)
    }
  }

  const read = (shortBit, sameBit) => {
    const values = []
    let value = 0
    for (const flag of flags) {
      if (flag & shortBit) {
        const delta = reader.u8()
        value += flag & sameBit ? delta : -delta
      } else if (!(flag & sameBit)) {
        value += reader.i16()
      }
      values.push(value)
    }
    return values
  }

  const xs = read(2, 16)
  const ys = read(4, 32)

  const contours = []
  let from = 0
  for (const last of endPoints) {
    contours.push(
      Array.from({ length: last - from + 1 }, (_, i) => ({
        x: xs[from + i],
        y: ys[from + i],
        on: (flags[from + i] & 1) === 1,
      }))
    )
    from = last + 1
  }
  return contours
}

/**
 * TrueType quadratics, with the implied on-curve points between consecutive
 * control points made explicit, then lifted to cubics.
 */
function contourToPath(points, transform) {
  if (points.length === 0) return ''

  // rotate so the contour starts on-curve; if none is, use the implied midpoint
  let startIndex = points.findIndex((p) => p.on)
  let ordered
  let startPoint
  if (startIndex === -1) {
    const a = points[0]
    const b = points[points.length - 1]
    startPoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    ordered = points.slice()
  } else {
    ordered = [...points.slice(startIndex), ...points.slice(0, startIndex)]
    startPoint = ordered[0]
    ordered = ordered.slice(1)
  }

  const at = (p) => transform(p.x, p.y)
  const round = (n) => Number(n.toFixed(2))
  const start = at(startPoint)
  const parts = [`M${round(start[0])} ${round(start[1])}`]

  let current = startPoint
  let control = null

  const quad = (controlPoint, to) => {
    const [x0, y0] = at(current)
    const [cx, cy] = at(controlPoint)
    const [x1, y1] = at(to)
    // exact quadratic to cubic: the control points sit two thirds of the way
    const c1x = x0 + (2 / 3) * (cx - x0)
    const c1y = y0 + (2 / 3) * (cy - y0)
    const c2x = x1 + (2 / 3) * (cx - x1)
    const c2y = y1 + (2 / 3) * (cy - y1)
    parts.push(
      `C${round(c1x)} ${round(c1y)} ${round(c2x)} ${round(c2y)} ${round(x1)} ${round(y1)}`
    )
    current = to
  }

  for (const point of ordered) {
    if (point.on) {
      if (control === null) {
        const [x, y] = at(point)
        parts.push(`L${round(x)} ${round(y)}`)
        current = point
      } else {
        quad(control, point)
        control = null
      }
    } else if (control === null) {
      control = point
    } else {
      // two controls in a row imply an on-curve point halfway between them
      quad(control, { x: (control.x + point.x) / 2, y: (control.y + point.y) / 2 })
      control = point
    }
  }

  if (control === null) parts.push('Z')
  else {
    quad(control, startPoint)
    parts.push('Z')
  }

  return parts.join('')
}

export function openFont(buffer) {
  if (buffer.readUInt32BE(0) === 0x74746366) {
    throw new Error('font collections (.ttc) are not supported')
  }

  const offsets = tables(buffer)
  for (const required of ['head', 'maxp', 'cmap', 'loca', 'glyf', 'hhea', 'hmtx']) {
    if (!offsets.has(required)) throw new Error(`missing required table: ${required}`)
  }

  const head = offsets.get('head')
  const unitsPerEm = buffer.readUInt16BE(head + 18)
  const longLoca = buffer.readInt16BE(head + 50) === 1
  const numGlyphs = buffer.readUInt16BE(offsets.get('maxp') + 4)

  const locaStart = offsets.get('loca')
  const loca = Array.from({ length: numGlyphs + 1 }, (_, i) =>
    longLoca
      ? buffer.readUInt32BE(locaStart + i * 4)
      : buffer.readUInt16BE(locaStart + i * 2) * 2
  )

  const cmap = characterMap(buffer, offsets.get('cmap'))
  const glyf = offsets.get('glyf')

  const hMetrics = buffer.readUInt16BE(offsets.get('hhea') + 34)
  const hmtx = offsets.get('hmtx')
  const advance = (index) =>
    buffer.readUInt16BE(hmtx + Math.min(index, hMetrics - 1) * 4)

  // OS/2 version 2 and up carry the two metrics a lockup actually needs
  let capHeight = null
  let xHeight = null
  const os2 = offsets.get('OS/2')
  if (os2 !== undefined && buffer.readUInt16BE(os2) >= 2) {
    xHeight = buffer.readInt16BE(os2 + 86)
    capHeight = buffer.readInt16BE(os2 + 88)
  }

  return {
    unitsPerEm,
    capHeight,
    xHeight,
    /** @param transform (x, y) in font units -> [x, y] in output units */
    glyph(character, transform) {
      const index = cmap.get(character.codePointAt(0))
      if (index === undefined) throw new Error(`no glyph for "${character}"`)
      const contours = readGlyph(buffer, glyf, loca, index)
      return {
        advance: advance(index),
        path: contours.map((c) => contourToPath(c, transform)).join(''),
      }
    },
  }
}
