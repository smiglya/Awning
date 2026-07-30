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
    const shapes = geometry(read('brand/awning-logotype.svg'))
    // 5 paths, 5 rects, 1 rotated rect, 1 ellipse, 1 mark: if the artwork gains
    // a shape this fails, rather than the site quietly losing a letter
    expect(shapes).toHaveLength(13)
    for (const shape of shapes) expect(geometry(jsx)).toContain(shape)
  })

  it('holds nothing the artwork does not', () => {
    // catches the other direction: a stray shape left in the component after an
    // edit, which no amount of looking at brand/ would reveal
    const inFiles = new Set([
      ...geometry(read('brand/logo.svg')),
      ...geometry(read('brand/awning-logotype.svg')),
    ])
    for (const shape of geometry(jsx)) expect([...inFiles]).toContain(shape)
  })

  it('keeps the viewBox tight to the ink in both files', () => {
    // a Figma frame is usually larger than the drawing; slack in the viewBox
    // becomes a phantom margin wherever the lockup is aligned or centred
    expect(read('brand/logo.svg')).toContain('viewBox="0 0 12 13"')
    expect(read('brand/awning-logotype.svg')).toContain('viewBox="0 0 1021.39 353.03"')
    expect(jsx).toContain('viewBox="0 0 12 13"')
    expect(jsx).toContain('viewBox="0 0 1021.39 353.03"')
  })

  it('inherits colour rather than hardcoding black', () => {
    // the lockup is reversed out of ink in the footer and the OG card's band
    for (const file of ['brand/logo.svg', 'brand/awning-logotype.svg']) {
      expect(read(file), file).toContain('fill="currentColor"')
      expect(read(file), file).not.toContain('fill="black"')
    }
  })
})
