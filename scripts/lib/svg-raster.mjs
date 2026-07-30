/**
 * A rasteriser for exactly the SVG that brand/ contains, and nothing more.
 *
 * It exists so the generated PNGs derive from the same artwork the site uses.
 * The previous version hardcoded the mark's geometry in this script, which meant
 * four copies of the logo in the repo and no way to notice when they drifted.
 * Now the designer edits brand/*.svg and the Open Graph card follows.
 *
 * Deliberately not a general SVG library. Unsupported commands throw rather than
 * being skipped: a silently dropped path is a logo with a letter missing, and
 * that is the kind of thing nobody sees until it is in someone's Slack.
 */

/* ------------------------------------------------------------------ parsing */

function numbers(source) {
  return (source.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number)
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`))
  return match ? match[1] : null
}

function attrNumber(tag, name, fallback = 0) {
  const raw = attr(tag, name)
  return raw === null ? fallback : Number(raw)
}

/** Flattens one cubic segment. 24 steps is past the point of visible faceting. */
function cubic(points, x0, y0, x1, y1, x2, y2, x3, y3) {
  const steps = 24
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps
    const u = 1 - t
    points.push([
      u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
      u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
    ])
  }
}

/** @returns rings: arrays of [x, y], one per subpath */
function parsePath(d) {
  const tokens = d.match(/[MmLlHhVvCcZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []
  const rings = []
  let ring = null
  let x = 0
  let y = 0
  let startX = 0
  let startY = 0
  let command = null
  let i = 0

  const next = () => Number(tokens[i++])

  while (i < tokens.length) {
    const token = tokens[i]
    if (/[A-Za-z]/.test(token)) {
      command = token
      i += 1
    } else if (command === null) {
      throw new Error(`path data starts without a command: ${d.slice(0, 40)}`)
    }

    const relative = command === command.toLowerCase()
    const base = relative ? [x, y] : [0, 0]

    switch (command.toUpperCase()) {
      case 'M': {
        x = base[0] + next()
        y = base[1] + next()
        startX = x
        startY = y
        ring = [[x, y]]
        rings.push(ring)
        // a repeated coordinate pair after M continues as a lineto
        command = relative ? 'l' : 'L'
        break
      }
      case 'L': {
        x = base[0] + next()
        y = base[1] + next()
        ring.push([x, y])
        break
      }
      case 'H': {
        x = base[0] + next()
        ring.push([x, y])
        break
      }
      case 'V': {
        y = base[1] + next()
        ring.push([x, y])
        break
      }
      case 'C': {
        const x1 = base[0] + next()
        const y1 = base[1] + next()
        const x2 = base[0] + next()
        const y2 = base[1] + next()
        const x3 = base[0] + next()
        const y3 = base[1] + next()
        cubic(ring, x, y, x1, y1, x2, y2, x3, y3)
        x = x3
        y = y3
        break
      }
      case 'Z': {
        x = startX
        y = startY
        ring = null
        // SVG requires an explicit command after a close; leaving this null makes
        // a malformed path throw instead of quietly appending to the wrong ring
        command = null
        break
      }
      default:
        throw new Error(`unsupported path command "${command}" — extend the parser`)
    }
  }

  return rings.filter((r) => r.length > 2)
}

function rotator(transform) {
  if (!transform) return (px, py) => [px, py]
  const match = transform.match(/rotate\(([^)]*)\)/)
  if (!match) {
    throw new Error(`unsupported transform "${transform}" — extend the parser`)
  }
  const [angle, cx = 0, cy = 0] = numbers(match[1])
  const radians = (angle * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return (px, py) => {
    const dx = px - cx
    const dy = py - cy
    return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos]
  }
}

/**
 * @returns {{ viewBox: number[], shapes: Array<Array<Array<[number, number]>>> }}
 *   one entry per drawn element, each a list of rings. Elements stay separate
 *   because they overlap — the wordmark's stem runs into two of its own bars —
 *   and merging them into one even-odd surface would punch holes at the joins.
 */
export function parseSvg(source) {
  // Comments first, then defs. A defs block holds things like a frame clip
  // rectangle, and drawing that would flood the canvas with a solid fill.
  const body = source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<defs[\s\S]*?<\/defs>/g, '')

  const viewBoxAttr = source.match(/viewBox\s*=\s*"([^"]*)"/)
  const viewBox = viewBoxAttr ? numbers(viewBoxAttr[1]) : [0, 0, 0, 0]

  const shapes = []

  for (const [tag] of body.matchAll(/<(?:path|rect|ellipse|circle)\b[^>]*>/g)) {
    if (attr(tag, 'fill') === 'none') continue
    const move = rotator(attr(tag, 'transform'))

    if (tag.startsWith('<path')) {
      const d = attr(tag, 'd')
      if (!d) continue
      shapes.push(parsePath(d).map((ring) => ring.map(([px, py]) => move(px, py))))
      continue
    }

    if (tag.startsWith('<rect')) {
      const x = attrNumber(tag, 'x')
      const y = attrNumber(tag, 'y')
      const w = attrNumber(tag, 'width')
      const h = attrNumber(tag, 'height')
      shapes.push([
        [
          [x, y],
          [x + w, y],
          [x + w, y + h],
          [x, y + h],
        ].map(([px, py]) => move(px, py)),
      ])
      continue
    }

    // ellipse / circle
    const cx = attrNumber(tag, 'cx')
    const cy = attrNumber(tag, 'cy')
    const r = attrNumber(tag, 'r')
    const rx = attrNumber(tag, 'rx', r)
    const ry = attrNumber(tag, 'ry', r)
    const ring = []
    for (let k = 0; k < 72; k += 1) {
      const a = (k / 72) * Math.PI * 2
      ring.push(move(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry))
    }
    shapes.push([ring])
  }

  if (shapes.length === 0) throw new Error('no drawable elements found in the SVG')

  return { viewBox, shapes }
}

/** Tight ink bounds, which is what layout needs — a Figma frame usually has slack. */
export function inkBounds(shapes) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const rings of shapes) {
    for (const ring of rings) {
      for (const [x, y] of ring) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

/* -------------------------------------------------------------- rasterising */

const SUB_ROWS = 5

/**
 * Scanline fill of one element into a coverage buffer, even-odd within the
 * element. Even-odd rather than nonzero on purpose: it gives a glyph its counter
 * whichever way the exporter happened to wind the inner ring, and no glyph in
 * the wordmark has the self-overlap that would make the two rules disagree.
 */
function fillElement(rings, width, height, coverage) {
  const edges = []
  let top = Infinity
  let bottom = -Infinity
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i += 1) {
      const a = ring[i]
      const b = ring[(i + 1) % ring.length]
      if (a[1] === b[1]) continue
      edges.push([a[0], a[1], b[0], b[1]])
      top = Math.min(top, a[1], b[1])
      bottom = Math.max(bottom, a[1], b[1])
    }
  }
  if (edges.length === 0) return

  const firstRow = Math.max(0, Math.floor(top))
  const lastRow = Math.min(height - 1, Math.ceil(bottom))
  const weight = 1 / SUB_ROWS
  const crossings = []

  for (let py = firstRow; py <= lastRow; py += 1) {
    for (let s = 0; s < SUB_ROWS; s += 1) {
      const y = py + (s + 0.5) / SUB_ROWS
      crossings.length = 0
      for (const [x1, y1, x2, y2] of edges) {
        if (y1 <= y === y2 <= y) continue
        crossings.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1))
      }
      if (crossings.length < 2) continue
      crossings.sort((a, b) => a - b)

      for (let k = 0; k + 1 < crossings.length; k += 2) {
        addSpan(coverage, width, py, crossings[k], crossings[k + 1], weight)
      }
    }
  }
}

/** Accumulates a horizontal span with fractional coverage at both ends. */
function addSpan(coverage, width, row, xStart, xEnd, weight) {
  const x0 = Math.max(0, xStart)
  const x1 = Math.min(width, xEnd)
  if (x1 <= x0) return

  const first = Math.floor(x0)
  const last = Math.min(width - 1, Math.ceil(x1) - 1)
  const offset = row * width

  for (let px = first; px <= last; px += 1) {
    const left = Math.max(x0, px)
    const right = Math.min(x1, px + 1)
    if (right > left) coverage[offset + px] += (right - left) * weight
  }
}

/**
 * @returns Float32Array of coverage 0..1, one entry per pixel.
 * @param fit  {width, height} of the box the ink is fitted into, and where it sits
 */
export function rasterise(shapes, canvasWidth, canvasHeight, fit) {
  const bounds = inkBounds(shapes)
  const scale = Math.min(fit.width / bounds.width, fit.height / bounds.height)
  const offsetX = fit.x + (fit.width - bounds.width * scale) / 2
  const offsetY = fit.y + (fit.height - bounds.height * scale) / 2

  const place = ([x, y]) => [
    offsetX + (x - bounds.minX) * scale,
    offsetY + (y - bounds.minY) * scale,
  ]

  const coverage = new Float32Array(canvasWidth * canvasHeight)
  for (const rings of shapes) {
    fillElement(
      rings.map((ring) => ring.map(place)),
      canvasWidth,
      canvasHeight,
      coverage
    )
  }

  // Elements share the buffer, so where two overlap their coverage sums. Clamping
  // turns that back into a union: solid inside, and no seam along the join.
  for (let i = 0; i < coverage.length; i += 1) {
    if (coverage[i] > 1) coverage[i] = 1
  }

  return coverage
}
