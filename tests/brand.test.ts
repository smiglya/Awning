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

/** The seven, plus nothing. Cased both ways because SVG files are not CSS. */
const PALETTE = [
  '#0A0A0A',
  '#FAFAF9',
  '#FF3C00',
  '#FF3E04',
  '#FF6131',
  '#514C4C',
  '#666060',
]

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

  for (const [tag] of markup.matchAll(/<(rect|ellipse)\b[\s\S]*?\/>/g)) {
    const kind = tag.startsWith('<rect') ? 'rect' : 'ellipse'
    shapes.push(`${kind} ${(tag.match(/-?\d*\.?\d+/g) ?? []).join(' ')}`)
  }

  return shapes.sort()
}

describe('brand artwork', () => {
  const jsx = read('src/components/Brand.tsx')

  it('renders the same mark that brand/logo.svg defines', () => {
    const shapes = geometry(read('brand/logo.svg'))
    expect(shapes).toHaveLength(1)
    // the component holds both drawings, so the mark's shape has to be among them
    for (const shape of shapes) expect(geometry(jsx)).toContain(shape)
  })

  it('renders the same lockup that brand/logo-flat.svg defines', () => {
    // Every shape, not a count. A letter is several contours — the key alone is
    // a bow, three teeth and a blade — so any expected total would have to be
    // re-guessed on every design change, and a number nobody can derive is a
    // number people update without checking.
    for (const shape of geometry(read('brand/logo-flat.svg'))) {
      expect(geometry(jsx)).toContain(shape)
    }
  })

  it('holds exactly the artwork and nothing else', () => {
    // Set equality, which subsumes the count: a shape dropped from the component
    // fails above, a stray one left behind after an edit fails here, and neither
    // is visible from reading brand/ alone.
    const inFiles = [
      ...geometry(read('brand/logo.svg')),
      ...geometry(read('brand/logo-flat.svg')),
    ].sort()
    expect(geometry(jsx)).toEqual(inFiles)
  })

  it('gives the component the same viewBox as the file', () => {
    // Not hardcoded here: the lockup is regenerated whenever the word, weight or
    // spacing changes, and a test that has to be edited on every regeneration is
    // a test people start editing without reading. What must hold is that the
    // two copies agree, and that the box starts at the origin — slack in a
    // viewBox becomes a phantom margin wherever the artwork is aligned.
    for (const file of ['brand/logo.svg', 'brand/logo-flat.svg']) {
      const box = read(file).match(/viewBox="([^"]+)"/)?.[1]
      expect(box, file).toMatch(/^0 0 /)
      expect(jsx, file).toContain(`viewBox="${box}"`)
    }
  })

  it('inherits colour rather than hardcoding black', () => {
    // the lockup is reversed out of ink in the footer and the OG card's band
    for (const file of [
      'brand/logo.svg',
      'brand/logo-flat.svg',
      'brand/logo-full.svg',
      'brand/letter-i-key.svg',
    ]) {
      expect(read(file), file).toContain('fill="currentColor"')
      expect(read(file), file).not.toContain('fill="black"')
    }
  })

  it('agrees with the generator about where the key sits', () => {
    /**
     * The key's baseline and x-height cannot be recovered from its outline — the
     * tittle is above the x-height and nothing marks the baseline — so both are
     * written down twice: in the SVG's comment and as constants the generator
     * scales by. If the drawing moves and only one copy is updated, the key gets
     * placed on the wrong line, and it fails quietly: still a plausible logo,
     * just a letter sitting slightly off the baseline.
     */
    const svg = read('brand/letter-i-key.svg')
    const generator = read('scripts/make-logotype.mjs')

    const documented = {
      baseline: Number(svg.match(/baseline\s+y = ([\d.]+)/)?.[1]),
      xHeightTop: Number(svg.match(/x-height top\s+y = ([\d.]+)/)?.[1]),
    }
    const used = {
      baseline: Number(generator.match(/baseline: ([\d.]+)/)?.[1]),
      xHeightTop: Number(generator.match(/xHeightTop: ([\d.]+)/)?.[1]),
    }

    expect(documented.baseline).toBeGreaterThan(0)
    expect(documented.xHeightTop).toBeGreaterThan(0)
    expect(used).toEqual(documented)
  })
})

/* ------------------------------------------------------------ the variants */

describe('logo variants', () => {
  it('ships all three', () => {
    for (const file of ['logo-flat.svg', 'logo-full.svg', 'logo-invert.svg']) {
      expect(() => read(`brand/${file}`), file).not.toThrow()
    }
  })

  /**
   * The constraint list from the brief, checked rather than trusted.
   *
   * Every one of these has the same failure mode: it looks right in a browser
   * and disappears somewhere else. scripts/lib/svg-raster.mjs is ours and
   * supports none of the heavy nodes, so a gradient or a mask in this file
   * silently drops out of the Open Graph card; a stroke does the same; a
   * relative command sends the prerenderer's path parser somewhere else
   * entirely.
   */
  it('keeps logo-flat.svg to what every renderer here can draw', () => {
    const flat = read('brand/logo-flat.svg')

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

    // fill on the root and nowhere else, so `color` alone drives the drawing
    expect(flat.match(/fill="/g) ?? []).toHaveLength(1)
    expect(flat).toContain('fill="currentColor"')

    // absolute commands only: M L H V C Z, and no lowercase twins
    for (const match of flat.matchAll(/\sd="([^"]+)"/g)) {
      const d = match[1] ?? ''
      expect(d, d.slice(0, 40)).toMatch(/^[MLHVCZ0-9.,\s-]+$/)
    }

    expect(flat).toMatch(/viewBox="0 0 /)
  })

  /**
   * Clear space is one lowercase n on all four sides. The generator derives it
   * from the x-height it already sets the lowercase from, so this checks the
   * artwork actually grew by twice that in each direction rather than trusting
   * that the transform was applied.
   */
  it('builds the clear space into logo-full.svg', () => {
    const box = (file: string) =>
      (read(`brand/${file}`).match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/) ?? [])
        .slice(1)
        .map(Number)

    const [flatW = 0, flatH = 0] = box('logo-flat.svg')
    const [fullW = 0, fullH = 0] = box('logo-full.svg')

    // equal on all four sides, so the two dimensions grow by the same amount
    expect(fullW - flatW).toBeCloseTo(fullH - flatH, 1)

    const clear = Number(((fullW - flatW) / 2).toFixed(2))
    // and the artwork is actually shifted into the middle of that box
    expect(read('brand/logo-full.svg')).toContain(`translate(${clear} ${clear})`)

    // one lowercase n: the x-height, which the generator sets at 52% of the
    // 292.69 cap height. A margin of a few units would pass the checks above
    // and still leave the lockup crowded.
    expect(clear).toBeCloseTo(292.69 * 0.52, 1)
  })

  it('makes logo-invert.svg self-contained, in palette colours', () => {
    const invert = read('brand/logo-invert.svg')

    // an ink plate and paper artwork, because this is the variant for places
    // CSS never reaches — an <img>, an email signature, a PDF
    expect(invert).toContain('fill="#0A0A0A"')
    expect(invert).toContain('fill="#FAFAF9"')
    expect(invert).not.toContain('currentColor')
  })

  it('never paints the mark orange, and never uses the stray grey', () => {
    for (const file of [
      'logo.svg',
      'logo-flat.svg',
      'logo-full.svg',
      'logo-invert.svg',
      'letter-i-key.svg',
    ]) {
      const svg = read(`brand/${file}`)
      const hexes = svg.match(/#[0-9a-fA-F]{3,8}/g) ?? []

      for (const hex of hexes) {
        expect(PALETTE, `${file} uses ${hex}`).toContain(hex.toUpperCase())
      }
      // orange on this site means "press this", and the logo is not a button
      for (const orange of ['#FF3C00', '#FF3E04', '#FF6131']) {
        expect(
          hexes.map((h) => h.toUpperCase()),
          file
        ).not.toContain(orange)
      }
      // the colour that travelled in with the supplied artwork
      expect(svg.toUpperCase(), file).not.toContain('#6C6C6C')
    }
  })
})
