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

  it('renders the same lockup that brand/awning-logotype.svg defines', () => {
    // Every shape, not a count. A letter is several contours — the key alone is
    // a bow, three teeth and a blade — so any expected total would have to be
    // re-guessed on every design change, and a number nobody can derive is a
    // number people update without checking.
    for (const shape of geometry(read('brand/awning-logotype.svg'))) {
      expect(geometry(jsx)).toContain(shape)
    }
  })

  it('holds exactly the artwork and nothing else', () => {
    // Set equality, which subsumes the count: a shape dropped from the component
    // fails above, a stray one left behind after an edit fails here, and neither
    // is visible from reading brand/ alone.
    const inFiles = [
      ...geometry(read('brand/logo.svg')),
      ...geometry(read('brand/awning-logotype.svg')),
    ].sort()
    expect(geometry(jsx)).toEqual(inFiles)
  })

  it('gives the component the same viewBox as the file', () => {
    // Not hardcoded here: the lockup is regenerated whenever the word, weight or
    // spacing changes, and a test that has to be edited on every regeneration is
    // a test people start editing without reading. What must hold is that the
    // two copies agree, and that the box starts at the origin — slack in a
    // viewBox becomes a phantom margin wherever the artwork is aligned.
    for (const file of ['brand/logo.svg', 'brand/awning-logotype.svg']) {
      const box = read(file).match(/viewBox="([^"]+)"/)?.[1]
      expect(box, file).toMatch(/^0 0 /)
      expect(jsx, file).toContain(`viewBox="${box}"`)
    }
  })

  it('inherits colour rather than hardcoding black', () => {
    // the lockup is reversed out of ink in the footer and the OG card's band
    for (const file of [
      'brand/logo.svg',
      'brand/awning-logotype.svg',
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
