import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The artwork lives twice: as SVG files under brand/, which designers edit and
 * the image generator reads, and as inline JSX in Brand.tsx, which the site
 * renders. Both copies are justified — see the note in Brand.tsx — but two
 * copies of anything drift, and a half-updated logo is the kind of defect that
 * ships because it looks fine on whichever page you happened to open.
 *
 * So: compare them. Not pixels, just the numbers that define the shapes.
 */

const read = (path: string) => readFileSync(resolve(__dirname, '..', path), 'utf8')

/** §5. Seven, and the brand may not contain an eighth. */
const PALETTE = [
  '#0A0A0A',
  '#FAFAF9',
  '#E54E20',
  '#FF3E04',
  '#FF6131',
  '#514C4C',
  '#666060',
]

/**
 * The two values that live only inside the lockup's masked gradient composite:
 * the ray's hot stop, and the carrier fill under it.
 *
 * Restored exactly as supplied. Neither is a token — nothing can reference
 * them, they exist inside one drawing, and the carrier is only ever seen at ten
 * percent through a gradient laid over it. Reconciling them to --cta changed
 * how the ray reads, which is the one thing the supplied artwork settles.
 */
const RAY_ONLY = ['#FF3B00', '#D9D9D9']

const BRAND_FILES = [
  'logo.svg',
  'logotype-source.svg',
  'logo-flat.svg',
  'logo-full.svg',
  'logo-invert.svg',
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
  const shapes: string[] = []

  for (const match of markup.matchAll(/<path[\s\S]*?\sd="([^"]+)"/g)) {
    const d = match[1] ?? ''
    shapes.push(`path ${(d.match(/-?\d*\.?\d+/g) ?? []).join(' ')}`)
  }

  return shapes.sort()
}

/**
 * The <path> elements that are direct children of <svg>.
 *
 * The same depth walk the generator does, and for the same reason: the source
 * nests a group inside a group, so a non-greedy match for a closing tag stops
 * at the wrong one and lets the gradient scaffolding through.
 */
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
  // M L C all take coordinate pairs; H and V take a single ordinate. Splitting
  // on the commands is what keeps the x/y alternation honest — read the numbers
  // straight through and every H shifts the parity of everything after it.
  for (const match of d.matchAll(/([MLHVCZ])([^MLHVCZ]*)/g)) {
    const cmd = match[1]
    const values = (match[2] ?? '').match(/-?\d*\.?\d+/g)?.map(Number) ?? []
    if (cmd === 'H') continue
    if (cmd === 'V') ys.push(...values)
    else values.forEach((v, i) => i % 2 === 1 && ys.push(v))
  }
  return { height: Math.max(...ys) - Math.min(...ys) }
}

describe('brand artwork', () => {
  const jsx = read('src/components/Brand.tsx')

  it('renders the same mark that brand/logo.svg defines', () => {
    for (const shape of geometry(body(read('brand/logo.svg')))) {
      expect(geometry(jsx)).toContain(shape)
    }
  })

  it('renders the same lockup that the supplied source defines', () => {
    // Every shape, not a count. The dissolve alone is fifteen cells and the ray
    // is eight more, so any expected total would have to be re-guessed on every
    // design change, and a number nobody can derive is a number people update
    // without checking.
    for (const shape of geometry(body(read('brand/logotype-source.svg')))) {
      expect(geometry(jsx)).toContain(shape)
    }
  })

  it('holds exactly the artwork and nothing else', () => {
    // Set equality, which subsumes the count: a shape dropped from the component
    // fails above, a stray one left behind after an edit fails here, and neither
    // is visible from reading brand/ alone.
    //
    // Against the source rather than logo-flat.svg, because the component now
    // carries the whole drawing — the mask shapes and the ray paths included,
    // which the flat file exists precisely to strip.
    const inFiles = [
      ...geometry(body(read('brand/logo.svg'))),
      ...geometry(body(read('brand/logotype-source.svg'))),
    ].sort()
    expect(geometry(jsx)).toEqual(inFiles)
  })

  it('gives the component the same viewBox as the file', () => {
    // Not hardcoded here: the lockup is regenerated whenever the artwork
    // changes, and a test that has to be edited on every regeneration is a test
    // people start editing without reading. What must hold is that the two
    // copies agree, and that the box starts at the origin — slack in a viewBox
    // becomes a phantom margin wherever the artwork is aligned.
    for (const file of ['brand/logo.svg', 'brand/logo-flat.svg']) {
      const box = read(file).match(/viewBox="([^"]+)"/)?.[1]
      expect(box, file).toMatch(/^0 0 /)
      expect(jsx, file).toContain(`viewBox="${box}"`)
    }
  })

  it('ships the artwork in the supplied colours', () => {
    // Against the brief, and deliberately: §6.2 keeps the mark to ink or paper
    // and criterion 9 says the logo is never orange. Overruled — the drawing
    // ships as drawn, orange cells and gradient ray included.
    expect(jsx).toContain('#E54E20')
    expect(jsx).toContain('#FF6131')
    expect(jsx).toContain('<radialGradient')
  })

  /**
   * The lockup renders twice on every page — the navigation and the foot — and
   * it declares twelve ids between its two masks and ten gradients. Two inline
   * SVGs sharing an id do not warn: one mask wins for both elements and the
   * other drawing loses its ray, or gains one it should not have.
   *
   * useId rather than a counter or a random suffix, because the same markup is
   * produced by the prerender and again during hydration, and those two have to
   * agree character for character.
   */
  it('makes every id unique per instance', () => {
    expect(jsx).toContain('useId()')

    // no literal id survives — each one is an interpolated template
    expect(jsx).not.toMatch(/\sid="[^"]+"/)
    for (const [, ref] of jsx.matchAll(/url\(#([^)]*)\)/g)) {
      expect(ref, `url(#${ref}) is not namespaced`).toContain('${')
    }

    // and every declared id is actually referenced, so a rename cannot leave a
    // mask pointing at nothing and quietly blank the word
    const declared = [...jsx.matchAll(/const (\w+) = `awning-/g)].map((m) => m[1])
    expect(declared.length).toBeGreaterThan(0)
    for (const name of declared) {
      expect(jsx, `${name} is declared but never used`).toContain(`\${${name}}`)
    }
  })
})

/* ------------------------------------------------------------ the variants */

describe('logo variants', () => {
  it('derives all three from the supplied source', () => {
    const source = topLevelPaths(read('brand/logotype-source.svg'))
    // 15 dissolve cells, the mark, and the six visible letters
    expect(source).toHaveLength(22)

    for (const file of ['logo-flat.svg', 'logo-full.svg', 'logo-invert.svg']) {
      expect(() => read(`brand/${file}`), file).not.toThrow()
    }
    // the flat file is the source's drawn geometry and nothing else
    expect(topLevelPaths(read('brand/logo-flat.svg'))).toEqual(source)
  })

  /**
   * The constraint list from the brief, checked rather than trusted.
   *
   * Every one of these has the same failure mode: it looks right in a browser
   * and disappears somewhere else. scripts/lib/svg-raster.mjs is ours and
   * supports none of the heavy nodes, so a gradient or a mask in this file
   * silently drops out of the Open Graph card; a stroke does the same; a
   * relative command sends the path parser somewhere else entirely.
   */
  it('keeps logo-flat.svg to what every renderer here can draw', () => {
    const flat = body(read('brand/logo-flat.svg'))

    for (const node of [
      '<defs',
      '<mask',
      '<radialGradient',
      '<linearGradient',
      '<filter',
    ]) {
      expect(flat, node).not.toContain(node)
    }
    expect(flat).not.toMatch(/\sstroke=/)
    expect(flat).not.toContain('transform=')

    // fill on the root and nowhere else, so `color` alone drives the drawing
    expect(flat.match(/fill="/g) ?? []).toHaveLength(1)
    expect(flat).toContain('fill="currentColor"')

    // absolute commands only: M L H V C Z, and no lowercase twins
    for (const d of topLevelPaths(read('brand/logo-flat.svg'))) {
      expect(d, d.slice(0, 40)).toMatch(/^[MLHVCZ0-9.,\s-]+$/)
    }

    expect(flat).toMatch(/viewBox="0 0 /)
  })

  it('keeps the ray and the orange in logo-full.svg alone', () => {
    const full = body(read('brand/logo-full.svg'))
    // this is the browser-only marketing variant, so the scaffolding stays
    expect(full).toContain('<radialGradient')
    expect(full).toContain('#FF6131')

    // and nowhere else: the flat and reversed files are what the site uses
    for (const file of ['logo-flat.svg', 'logo-invert.svg']) {
      const svg = body(read(`brand/${file}`))
      for (const orange of ['#E54E20', '#FF3E04', '#FF6131']) {
        expect(svg, `${file} paints the logo ${orange}`).not.toContain(orange)
      }
    }
  })

  it('makes logo-invert.svg self-contained, in palette colours', () => {
    const invert = body(read('brand/logo-invert.svg'))

    expect(invert).toContain('fill="#0A0A0A"')
    expect(invert).toContain('fill="#FAFAF9"')
    expect(invert).not.toContain('currentColor')
  })

  it('uses no colour outside the palette, and never the export’s stray grey', () => {
    for (const file of BRAND_FILES) {
      const svg = body(read(`brand/${file}`))
      for (const hex of svg.match(/#[0-9a-fA-F]{6}\b/g) ?? []) {
        expect([...PALETTE, ...RAY_ONLY], `${file} uses ${hex}`).toContain(
          hex.toUpperCase()
        )
      }
      expect(svg.toUpperCase(), file).not.toContain('#6C6C6C')
    }
  })

  /**
   * Clear space is the height of the lowercase n, and SiteNav.css states it as
   * a ratio of the set height. Two places hold that number and only one of them
   * is derived from the drawing, so they are checked against each other — the
   * previous artwork's 0.392 would sail through any test that only asked
   * whether the CSS parsed.
   *
   * The tolerance is for curve maths: these bounds come from control points,
   * which sit a tenth of a unit outside the arch itself. A stale ratio is off
   * by forty times that.
   */
  it('sets the navigation clear space from the n', () => {
    const paths = topLevelPaths(read('brand/logo-flat.svg'))
    const letters = paths.slice(-6)
    const nHeight = coarseBounds(letters[1] ?? '').height

    const lockupHeight = Number(
      read('brand/logo-flat.svg').match(/viewBox="0 0 [\d.]+ ([\d.]+)"/)?.[1]
    )
    const fromArtwork = nHeight / lockupHeight

    const inCss = Number(
      read('src/components/SiteNav.css').match(
        /--logo-clear:\s*calc\(var\(--logo-h\) \* ([\d.]+)\)/
      )?.[1]
    )

    expect(inCss, 'SiteNav.css declares no --logo-clear ratio').toBeGreaterThan(0)
    expect(inCss).toBeCloseTo(fromArtwork, 2)
  })
})
