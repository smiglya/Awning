import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The artwork lives twice: as SVG files under brand/, which designers edit, and
 * as inline JSX in Brand.tsx, which the site renders. Both copies are justified
 * — see the note in Brand.tsx — but two copies of anything drift, and a
 * half-updated logo is the kind of defect that ships because it looks fine on
 * whichever page you happened to open.
 *
 * So: compare them. Not pixels, just the numbers that define the shapes.
 */

const read = (path: string) => readFileSync(resolve(__dirname, '..', path), 'utf8')

/**
 * The four files a designer maintains by hand. Nothing generates these, and the
 * tests below check that nothing tries to: an earlier version of the generator
 * wrote three of them, so one run replaced a hand-drawn file with a
 * reconstruction of it and said nothing.
 */
const REFERENCE = [
  'logo.svg',
  'wning.svg',
  'logo-flat.svg',
  'logo-compact.svg',
  'Awning-footer.svg',
]

/** Strips comments, so prose about a colour is never mistaken for the colour. */
const body = (markup: string) => markup.replace(/<!--[\s\S]*?-->/g, '')

/**
 * Every drawn shape, reduced to the numbers that define it. Attribute order,
 * whitespace and JSX line wrapping all differ between a file and a component,
 * and none of them change the drawing — so normalise them away and compare what
 * does. Sorted, because document order is not part of a flat fill.
 */
function geometry(markup: string): string[] {
  return [...markup.matchAll(/<path[\s\S]*?\sd="([^"]+)"/g)]
    .map((m) => `path ${((m[1] ?? '').match(/-?\d*\.?\d+/g) ?? []).join(' ')}`)
    .sort()
}

/** The <path> elements that are direct children of <svg>, depth-aware. */
function topLevelPaths(markup: string): string[] {
  const out: string[] = []
  let depth = 0

  for (const [tag] of body(markup).matchAll(/<\/?(?:defs|mask|g|path)\b[^>]*>/g)) {
    const isClose = tag.startsWith('</')
    const name = tag.replace(/^<\/?/, '').match(/^[a-z]+/)?.[0]

    if (name === 'path') {
      if (depth === 0 && !isClose) {
        const d = tag.match(/\sd="([^"]+)"/)?.[1]
        if (d) out.push(d)
      }
      continue
    }
    depth += isClose ? -1 : tag.endsWith('/>') ? 0 : 1
  }

  return out
}

/** Bounds from every coordinate in a path, control points included. */
function coarseBounds(d: string) {
  const ys: number[] = []
  // M L C take coordinate pairs; H and V take a single ordinate. Splitting on
  // the commands is what keeps the x/y alternation honest — read the numbers
  // straight through and every H shifts the parity of everything after it.
  for (const match of d.matchAll(/([MLHVCZ])([^MLHVCZ]*)/g)) {
    const cmd = match[1]
    const values = (match[2] ?? '').match(/-?\d*\.?\d+/g)?.map(Number) ?? []
    if (cmd === 'H') continue
    if (cmd === 'V') ys.push(...values)
    else values.forEach((v, i) => i % 2 === 1 && ys.push(v))
  }
  return { height: Math.max(...ys) - Math.min(...ys), bottom: Math.max(...ys) }
}

/* ------------------------------------------------------- the reference set */

describe('the reference artwork', () => {
  it('is never written by the generator', () => {
    /**
     * The rule this pins is the one that was actually broken: the generator
     * used to produce logo-flat.svg and logo-compact.svg, so running it
     * overwrote a designer's file with the script's idea of it. Reading them is
     * fine. Writing them is the bug.
     */
    const script = read('scripts/make-logotype.mjs')
    const written = [...script.matchAll(/writeFileSync\([^,]*,\s*'([^']*)'/g)].map(
      (m) => m[1]
    )
    const writtenPaths = [
      ...script.matchAll(/writeFileSync\(join\(root, '([^']*)'/g),
    ].map((m) => m[1])

    for (const file of REFERENCE) {
      for (const target of [...written, ...writtenPaths]) {
        expect(target, `the generator writes ${file}`).not.toContain(file)
      }
    }
  })

  it('draws the two lockups as one shape in two colourways', () => {
    // logo-compact is the colour version and logo-flat the ink one. If their
    // geometry ever parts company, one of them is a different logo wearing the
    // same name, and the site would be setting both.
    expect(topLevelPaths(read('brand/logo-compact.svg'))).toEqual(
      topLevelPaths(read('brand/logo-flat.svg'))
    )
  })

  it('keeps logo-flat.svg to ink alone', () => {
    const fills =
      body(read('brand/logo-flat.svg')).match(/fill="(#[0-9a-fA-F]{6})"/g) ?? []
    expect(fills.length).toBeGreaterThan(0)
    for (const fill of fills) {
      expect(fill.toUpperCase(), 'logo-flat.svg is the ink colourway').toBe(
        'FILL="#0A0A0A"'
      )
    }
  })

  it('spends the orange only in the mark, and only on the dissolve', () => {
    // The three oranges belong to the pixel cells at the mark's lower right.
    // Orange anywhere else in the drawing — a letter, the awning itself — would
    // be the logo competing with the button for the one thing orange means.
    for (const file of ['logo.svg', 'logo-compact.svg']) {
      const paths = [...body(read(`brand/${file}`)).matchAll(/<path[^>]*>/g)].map(
        (m) => m[0]
      )
      const orange = paths.filter((tag) => /#FF(3C00|3E04|6131)/i.test(tag))
      expect(orange, `${file} has no orange at all`).toHaveLength(3)
    }
  })
})

/* ---------------------------------------------------------- the component */

describe('brand artwork', () => {
  const jsx = read('src/components/Brand.tsx')

  it('renders every shape the reference defines', () => {
    // Every shape, not a count. The dissolve alone is fifteen cells, so any
    // expected total would have to be re-guessed on every design change, and a
    // number nobody can derive is a number people update without checking.
    for (const file of ['logo.svg', 'logo-compact.svg', 'Awning-footer.svg']) {
      for (const shape of geometry(body(read(`brand/${file}`)))) {
        expect(geometry(jsx), file).toContain(shape)
      }
    }
  })

  it('holds exactly that and nothing else', () => {
    /**
     * Set equality, which subsumes the count: a shape dropped from the
     * component fails above, a stray one left behind after an edit fails here,
     * and neither is visible from reading brand/ alone.
     *
     * Sets rather than arrays, because the two lockups are the same geometry in
     * two colourways and counting would read that reuse as duplication.
     */
    const inFiles = new Set([
      ...geometry(body(read('brand/logo.svg'))),
      ...geometry(body(read('brand/logo-compact.svg'))),
      ...geometry(body(read('brand/Awning-footer.svg'))),
    ])
    expect(new Set(geometry(jsx))).toEqual(inFiles)
  })

  it('takes the viewBox from the file rather than recomputing it', () => {
    // A reference file is not corrected. Measuring the ink and tightening the
    // box would be an improvement the designer did not ask for, and it would
    // shift every alignment that depends on the frame.
    for (const file of ['logo.svg', 'logo-compact.svg', 'Awning-footer.svg']) {
      const box = read(`brand/${file}`).match(/viewBox="([^"]+)"/)?.[1]
      expect(box, file).toMatch(/^0 0 /)
      expect(jsx, file).toContain(`viewBox="${box}"`)
    }
  })

  it('carries the artwork’s own fills, not currentColor', () => {
    // None of the three can reverse out of a dark ground, which is what
    // brand/logo-invert.svg is for. Saying so here stops someone "fixing" the
    // component by swapping the fills for currentColor and flattening the
    // colour version to one tone.
    expect(jsx).not.toContain('fill="currentColor"')
    expect(jsx).toContain('#FF6131')
  })
})

/* ------------------------------------------------------------ derived files */

describe('derived and consumed', () => {
  it('reverses out of ink, in palette colours', () => {
    const invert = body(read('brand/logo-invert.svg'))
    expect(invert).toContain('fill="#0A0A0A"')
    expect(invert).toContain('fill="#FAFAF9"')
    expect(invert).not.toContain('currentColor')
  })

  it('keeps the ray to the footer lockup', () => {
    // The bar sets logo-compact.svg at 34px, where a ray is a couple of pixels
    // per letter. The foot sets Awning-footer.svg across the whole measure,
    // which is the one place on the site big enough to carry it.
    expect(body(read('brand/Awning-footer.svg'))).toContain('<radialGradient')
    expect(body(read('brand/logo-compact.svg'))).not.toContain('<radialGradient')
  })

  it('draws the Open Graph card from the reference, not a copy of it', () => {
    // There were two lockups for a while — the reference and an earlier Figma
    // export the card read instead — so the site and its own link preview
    // disagreed about the logo. One drawing now, and the card reads it.
    const images = read('scripts/make-images.mjs')
    expect(images).toContain("colouredArtwork('Awning-footer.svg')")
    expect(images).not.toContain('logo-full.svg')
    expect(images).not.toContain('logotype-source.svg')
  })
})

/* -------------------------------------------------------------- placement */

describe('placement', () => {
  /**
   * Clear space is the height of the lowercase n, and SiteNav.css states it as
   * a ratio of the set height. Two places hold that number and only one of them
   * is derived from the drawing, so they are checked against each other — a
   * ratio left pointing at a previous lockup is off by a few percent, which is
   * invisible in review and wrong on every screen.
   *
   * The tolerance is for curve maths: these bounds come from control points,
   * which sit a tenth of a unit outside the arch itself.
   */
  it('sets the navigation clear space from the n', () => {
    const letters = topLevelPaths(read('brand/logo-compact.svg')).slice(-6)
    const nHeight = coarseBounds(letters[1] ?? '').height

    const lockupHeight = Number(
      read('brand/logo-compact.svg').match(/viewBox="0 0 [\d.]+ ([\d.]+)"/)?.[1]
    )

    const inCss = Number(
      read('src/components/SiteNav.css').match(
        /--logo-clear:\s*calc\(var\(--logo-h\) \* ([\d.]+)\)/
      )?.[1]
    )

    expect(inCss, 'SiteNav.css declares no --logo-clear ratio').toBeGreaterThan(0)
    expect(inCss).toBeCloseTo(nHeight / lockupHeight, 2)
  })

  it('compensates the descender when centring the lockup', () => {
    // flex centring aligns the box, and the box is taller than the word by the
    // whole descender — so the word sits high by half of it unless something
    // pushes back.
    const letters = topLevelPaths(read('brand/logo-compact.svg')).slice(-6)
    const baseline = coarseBounds(letters[1] ?? '').bottom
    const height = Number(
      read('brand/logo-compact.svg').match(/viewBox="0 0 [\d.]+ ([\d.]+)"/)?.[1]
    )

    const share = ((height - baseline) / height) * 100
    const shift = Number(
      read('src/components/SiteNav.css').match(
        /\.logo-type[\s\S]*?translateY\(([\d.]+)%\)/
      )?.[1]
    )

    expect(shift, 'SiteNav.css declares no translateY on .logo-type').toBeGreaterThan(0)
    expect(shift).toBeCloseTo(share / 2, 0)
  })
})
