/**
 * House icon set. Pixel art on a 16x16 module grid, and nothing else.
 *
 * The key in the logotype is set from rectangular modules, so the icons are set
 * the same way — that is the whole reason this is pixel art rather than a
 * fashion. Mixing these with line icons on one screen breaks the join, so there
 * are no line icons left anywhere on the site: either everything is pixel or
 * nothing is.
 *
 * Rules the drawings keep, all of them checkable and checked in
 * tests/design-system.test.ts:
 *
 *   - 16x16 modules, nothing outside the grid, no fractional cell
 *   - <rect> on whole coordinates, shape-rendering crispEdges, no antialiasing
 *   - fill="currentColor" on the root, no stroke — a rasteriser that ignores
 *     stroke drops the outline silently, and silence is the bad failure here
 *   - one module minimum, two for the main silhouette
 *   - diagonals staircase 1:1, never a smoothed slope
 *   - orange is at most one connected group of cells, and only on icons that
 *     sit beside an action
 *
 * Sizes: the module lands on whole pixels at 16, 32 and 48. 24 is the
 * legibility floor the brief sets, not a preferred size — every glyph here has
 * to survive it, which is why none of them carries a one-module detail that
 * only the two-module version of the same shape could have carried.
 */

const GRID = 16

/**
 * '#' ink, 'o' the accent cell, anything else empty.
 *
 * Written as pictures rather than coordinates on purpose: a bitmap is the one
 * representation where a wrong cell is visible in the diff, and where "the bit
 * matches the logo" is something a reviewer can check by looking.
 */
type Bitmap = readonly string[]

interface Run {
  x: number
  y: number
  w: number
}

/** Horizontal runs of matching cells, so one rect covers a whole span. */
function runs(rows: Bitmap, glyphs: string): Run[] {
  const out: Run[] = []

  rows.forEach((row, y) => {
    let x = 0
    while (x < GRID) {
      if (!glyphs.includes(row[x] ?? '.')) {
        x += 1
        continue
      }
      let w = 1
      while (x + w < GRID && glyphs.includes(row[x + w] ?? '.')) w += 1
      out.push({ x, y, w })
      x += w
    }
  })

  return out
}

export interface IconProps {
  /** 16, 32 or 48 keep the module on whole pixels. 24 is the floor. */
  size?: number
  className?: string
  /**
   * Light the accent cells. Off by default, and deliberately so: the glyph has
   * to be complete without it, and on an orange ground an orange cell is not a
   * highlight, it is a hole. The hero arrow rides on --cta and passes false.
   */
  accent?: boolean
}

function pixels(rows: Bitmap) {
  return function Icon({ size = 32, className, accent = false }: IconProps) {
    // with the accent off, the hot cells fall back to ink, so the silhouette
    // never depends on whether the colour was allowed
    const ink = runs(rows, accent ? '#' : '#o')
    const hot = accent ? runs(rows, 'o') : []

    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${GRID} ${GRID}`}
        fill="currentColor"
        shapeRendering="crispEdges"
        className={className}
        aria-hidden="true"
        focusable="false"
      >
        {ink.map((r) => (
          <rect key={`i${r.y}-${r.x}`} x={r.x} y={r.y} width={r.w} height={1} />
        ))}
        {hot.length > 0 && (
          <g fill="var(--accent)">
            {hot.map((r) => (
              <rect key={`a${r.y}-${r.x}`} x={r.x} y={r.y} width={r.w} height={1} />
            ))}
          </g>
        )}
      </svg>
    )
  }
}

/* ------------------------------------------------------------ why us cards */

/** Built to be found: a pin with a ring punched through the head. */
export const IconPin = pixels([
  '................',
  '.....######.....',
  '....########....',
  '...##########...',
  '..############..',
  '..####....####..',
  '..####....####..',
  '..####....####..',
  '..############..',
  '...##########...',
  '....########....',
  '.....######.....',
  '......####......',
  '.......##.......',
  '.......##.......',
  '................',
])

/** Nothing monthly: the calendar, struck through. */
export const IconNoCalendar = pixels([
  '...##......##...',
  '...##......##...',
  '.##############.',
  '.##############.',
  '.##############.',
  '.##.......##.##.',
  '.##......##..##.',
  '.##.....##...##.',
  '.##....##....##.',
  '.##...##.....##.',
  '.##..##......##.',
  '.##.##.......##.',
  '.####........##.',
  '.##############.',
  '.##############.',
  '................',
])

/** We do the writing: an I-beam caret standing beside three lines of text. */
export const IconWriting = pixels([
  '................',
  '................',
  '.####...........',
  '..##..#########.',
  '..##..#########.',
  '..##............',
  '..##..#########.',
  '..##..#########.',
  '..##............',
  '..##..######....',
  '..##..######....',
  '..##............',
  '.####...........',
  '................',
  '................',
  '................',
])

/** Two languages: the same bubble twice, offset. */
export const IconTwoTongues = pixels([
  '.##########.....',
  '.##########.....',
  '.##......##.....',
  '.##......##.....',
  '.##......##.....',
  '.##########.....',
  '.##########.....',
  '...##...........',
  '...##...........',
  '.......########.',
  '.......########.',
  '.......##....##.',
  '.......##....##.',
  '.......########.',
  '.......########.',
  '...........##...',
])

/* ------------------------------------------------------------------- the key */

/**
 * You get the keys. The bit is the logotype's, module for module.
 *
 * brand/letter-i-key.svg sets its teeth by insetting the left edge 0, 1, 2 then
 * 1 modules from the shaft, each tooth two module-rows deep, with the right
 * edge running straight down as the stem. That is the pattern below, and it is
 * the reason this glyph is not free-drawn: the logo already carries the
 * turnkey idea, the copy already says keys, and an icon that invented its own
 * teeth would quietly break the rhyme the section is built on.
 *
 * The accent is one connected group at the deepest tooth, on the silhouette
 * edge where it actually reads rather than buried inside the ink.
 */
export const IconKey = pixels([
  '........######..',
  '.......########.',
  '.......##....##.',
  '.......##....##.',
  '.......########.',
  '........######..',
  '......######....',
  '......######....',
  '.......#####....',
  '.......#####....',
  '........o###....',
  '........o###....',
  '.......#####....',
  '.......#####....',
  '..........##....',
  '..........##....',
])

/* -------------------------------------------------- icons beside an action */

/** Hero and pill arrow. The tip is the accent when the ground is paper. */
export const IconArrow = pixels([
  '................',
  '................',
  '................',
  '................',
  '.........##.....',
  '..........##....',
  '...........##...',
  '..###########o..',
  '..###########o..',
  '...........##...',
  '..........##....',
  '.........##.....',
  '................',
  '................',
  '................',
  '................',
])

/** Most taken. The accent is the star's core. */
export const IconStar = pixels([
  '................',
  '.......##.......',
  '......####......',
  '......####......',
  '.....######.....',
  '################',
  '.##############.',
  '..#####oo#####..',
  '...####oo####...',
  '....########....',
  '...##########...',
  '..####....####..',
  '.####......####.',
  '####........####',
  '................',
  '................',
])

/** Request received. The accent is where the stroke lands. */
export const IconCheck = pixels([
  '................',
  '................',
  '................',
  '................',
  '.............o..',
  '............oo..',
  '...........##...',
  '..#.......##....',
  '..##.....##.....',
  '...##...##......',
  '....##.##.......',
  '.....###........',
  '......##........',
  '................',
  '................',
  '................',
])

/* -------------------------------------------------- add-on group headings */

/** Design and brand: a nib, flat topped, slit down the middle. */
export const IconNib = pixels([
  '................',
  '..############..',
  '..############..',
  '..############..',
  '...####..####...',
  '...####..####...',
  '....########....',
  '....########....',
  '.....######.....',
  '.....######.....',
  '......####......',
  '......####......',
  '.......##.......',
  '.......##.......',
  '.......##.......',
  '................',
])

/** Features: a gear, square because a round one costs its teeth at 24px. */
export const IconGear = pixels([
  '...##......##...',
  '...##......##...',
  '..############..',
  '..############..',
  '..############..',
  '..############..',
  '######....######',
  '######....######',
  '######....######',
  '######....######',
  '..############..',
  '..############..',
  '..############..',
  '..############..',
  '...##......##...',
  '...##......##...',
])

/** Getting found: a glass with a staircase handle. */
export const IconGlass = pixels([
  '..########......',
  '.##########.....',
  '.##......##.....',
  '.##......##.....',
  '.##......##.....',
  '.##......##.....',
  '.##......##.....',
  '.##########.....',
  '..########......',
  '..........##....',
  '...........##...',
  '............##..',
  '.............##.',
  '..............##',
  '................',
  '................',
])

/** After launch: an open-ended wrench. */
export const IconWrench = pixels([
  '.##..##.........',
  '.##..##.........',
  '.######.........',
  '.######.........',
  '..####..........',
  '...####.........',
  '....####........',
  '.....####.......',
  '......####......',
  '.......####.....',
  '........####....',
  '.........####...',
  '..........####..',
  '...........####.',
  '............##..',
  '................',
])

/** Speed: the bolt. */
export const IconBolt = pixels([
  '................',
  '........####....',
  '.......####.....',
  '......####......',
  '.....####.......',
  '....##########..',
  '....##########..',
  '.......####.....',
  '......####......',
  '.....####.......',
  '....####........',
  '...####.........',
  '..####..........',
  '................',
  '................',
  '................',
])

/* ------------------------------------------------------------- ui controls */

/**
 * Menu open and shut. Two whole glyphs rather than one rotated 135 degrees:
 * a pixel grid that turns off-axis resamples to mush, and the brief is explicit
 * that pixel art switches whole frames like a sprite instead of morphing.
 */
export const IconPlus = pixels([
  '................',
  '................',
  '.......##.......',
  '.......##.......',
  '.......##.......',
  '.......##.......',
  '.......##.......',
  '..############..',
  '..############..',
  '.......##.......',
  '.......##.......',
  '.......##.......',
  '.......##.......',
  '.......##.......',
  '................',
  '................',
])

export const IconCross = pixels([
  '................',
  '................',
  '................',
  '...##......##...',
  '....##....##....',
  '.....##..##.....',
  '......####......',
  '.......##.......',
  '......####......',
  '.....##..##.....',
  '....##....##....',
  '...##......##...',
  '..##........##..',
  '................',
  '................',
  '................',
])

/* ------------------------------------------------- footer marks, abstract */

export const IconMatrix = pixels([
  '................',
  '.###..###..###..',
  '.###..###..###..',
  '.###..###..###..',
  '................',
  '................',
  '.###..###..###..',
  '.###..###..###..',
  '.###..###..###..',
  '................',
  '................',
  '.###..###..###..',
  '.###..###..###..',
  '.###..###..###..',
  '................',
  '................',
])

export const IconSignal = pixels([
  '................',
  '................',
  '.............##.',
  '.............##.',
  '.............##.',
  '.........##..##.',
  '.........##..##.',
  '.........##..##.',
  '.....##..##..##.',
  '.....##..##..##.',
  '.....##..##..##.',
  '.##..##..##..##.',
  '.##..##..##..##.',
  '.##..##..##..##.',
  '.##..##..##..##.',
  '................',
])

export const IconFrame = pixels([
  '................',
  '.##############.',
  '.##############.',
  '.##...##.....##.',
  '.##...##.....##.',
  '.##...##.....##.',
  '.##...##.....##.',
  '.##############.',
  '.##############.',
  '.##...##.....##.',
  '.##...##.....##.',
  '.##...##.....##.',
  '.##...##.....##.',
  '.##############.',
  '.##############.',
  '................',
])

export const IconOrbit = pixels([
  '................',
  '................',
  '....########....',
  '...##########...',
  '..############..',
  '..##........##..',
  '..##..####..##..',
  '..##..####..##..',
  '..##..####..##..',
  '..##..####..##..',
  '..##........##..',
  '..############..',
  '...##########...',
  '....########....',
  '................',
  '................',
])

export const SOCIAL_ICONS = [IconMatrix, IconSignal, IconFrame, IconOrbit]
