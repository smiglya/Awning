import { useId } from 'react'
import './PixelFire.css'

/**
 * A band of pixel flame along the bottom of a conversion button.
 *
 * Three oranges interacting, drawn on the same module grid as every other glyph
 * on the site, and switching whole frames rather than morphing — which is what
 * §7.1 requires of pixel art and also the only way a four-frame flicker reads as
 * fire instead of as a gradient sliding about.
 *
 * Why a band and not a fill. The conversion button is already --cta, and the
 * three fire colours measure 1.09, 1.16 and 1.29 to one against it. Painted over
 * the button they are invisible; worse, they would sit under ink type that has
 * 5.13:1 to work with and take some of it away. Along the bottom edge the flame
 * has the button's boundary to read against and the label keeps every point of
 * its contrast.
 *
 * The tiling is an SVG pattern rather than a fixed-width strip. Buttons here run
 * from "Send" to "Start the $1,795 build", and a strip sized for one is either
 * cut off or stretched on the other — stretched being the worse of the two,
 * since it turns square modules into rectangles and the pixel logic with them.
 *
 * Every id carries useId. Three of these render on the landing page and two
 * inline SVGs sharing a pattern id do not warn: one wins for both and the other
 * button loses its flame.
 */

/** 3px modules: 16 across and 4 up, so one tile is 48 by 12. */
const MODULE = 3
const COLS = 16
const ROWS = 4

/**
 * '.' is the button showing through, and the letters run coolest at the tip to
 * hottest at the base — which is the way a flame actually reads, and the reason
 * the brightest of the three sits along the bottom rather than the top.
 */
const PAINT: Record<string, string> = {
  a: 'var(--accent)',
  b: 'var(--cta-hover)',
  c: 'var(--ember)',
}

const FRAMES: readonly (readonly string[])[] = [
  ['...c........c...', '..bcb......bcb..', '.babab....babab.', 'aaaaaaa..aaaaaaa'],
  ['....c......c....', '...bcb....bbb...', '..babab..babab..', 'aaaaaaaaaaaaaaaa'],
  ['..c..........c..', '..bcb.....bcb...', '.babab...babab..', 'aaaaaa..aaaaaaaa'],
  ['.....c.....c....', '....bcb...bcb...', '..babab..babab..', 'aaaaaaaaaaaaaaaa'],
]

interface Cell {
  x: number
  y: number
  w: number
  paint: string
}

/** Horizontal runs of one colour, so a row of flame is one rect and not six. */
function cells(rows: readonly string[]): Cell[] {
  const out: Cell[] = []

  rows.forEach((row, y) => {
    let x = 0
    while (x < COLS) {
      const glyph = row[x] ?? '.'
      if (!(glyph in PAINT)) {
        x += 1
        continue
      }
      let w = 1
      while (x + w < COLS && row[x + w] === glyph) w += 1
      out.push({ x, y, w, paint: PAINT[glyph] as string })
      x += w
    }
  })

  return out
}

export default function PixelFire() {
  const uid = useId()

  return (
    <span className="fire" aria-hidden="true">
      <svg
        className="fire-art"
        width="100%"
        height={ROWS * MODULE}
        shapeRendering="crispEdges"
        focusable="false"
      >
        <defs>
          {FRAMES.map((rows, frame) => (
            <pattern
              key={frame}
              id={`${uid}-${frame}`}
              width={COLS * MODULE}
              height={ROWS * MODULE}
              patternUnits="userSpaceOnUse"
            >
              {cells(rows).map((cell) => (
                <rect
                  key={`${cell.y}-${cell.x}`}
                  x={cell.x * MODULE}
                  y={cell.y * MODULE}
                  width={cell.w * MODULE}
                  height={MODULE}
                  fill={cell.paint}
                />
              ))}
            </pattern>
          ))}
        </defs>

        {FRAMES.map((_, frame) => (
          <rect
            key={frame}
            className="fire-frame"
            width="100%"
            height="100%"
            fill={`url(#${uid}-${frame})`}
          />
        ))}
      </svg>
    </span>
  )
}
