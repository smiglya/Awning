import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ADDONS, FAQ, PRICING, SPECS } from '../src/data/copy'
import { ROUTE_META, jsonLdFor, metaFor } from '../src/seo'

/**
 * The acceptance criteria from §11 of the brief, as tests.
 *
 * A checklist in a document is a checklist somebody reads once. Most of these
 * are mechanical — a colour outside the palette, a stroke in a pixel icon, an
 * old price surviving in a meta description — and mechanical rules that are not
 * enforced come back within two changes. The ones that genuinely need eyes
 * (does the star read at 24px, does the orange land where the brief drew it)
 * are not here, and are not pretended to be.
 */

const root = resolve(__dirname, '..')
const read = (path: string) => readFileSync(join(root, path), 'utf8')

/**
 * Eight, and the site may not contain a ninth.
 *
 * The brief specifies seven. --ember #FF3C00 is the eighth, added on request
 * for the pixel flame — it was --cta itself until the conversion colour moved
 * to #E54E20, so the fire burns in the three oranges the brand was drawn from.
 */
const PALETTE = [
  '#0A0A0A',
  '#FAFAF9',
  '#E54E20',
  '#FF3E04',
  '#FF6131',
  '#FF3C00',
  '#514C4C',
  '#666060',
]

/** --ink and --paper thinned. Alpha is not a new colour; a new triplet is. */
const ALPHA_BASES = ['10,10,10', '250,250,249']

function walk(dir: string, match: RegExp): string[] {
  const out: string[] = []
  for (const entry of readdirSync(join(root, dir))) {
    const rel = `${dir}/${entry}`
    if (statSync(join(root, rel)).isDirectory()) out.push(...walk(rel, match))
    else if (match.test(entry)) out.push(rel)
  }
  return out
}

const STYLE_FILES = walk('src', /\.css$/)
const SOURCE_FILES = walk('src', /\.(ts|tsx|css)$/)

/* ==================================================================== colour */

describe('colour', () => {
  it('uses no hex outside the eight tokens', () => {
    /**
     * Brand.tsx is the one exception, and it is an exception because it is not
     * interface — it is a drawing, transcribed from the reference artwork under
     * brand/, fill for fill.
     *
     * The warm grey is the designer's, in two cells of the mark's dissolve. The
     * brief asked for it to be reconciled to --muted and it was, until the
     * reference files arrived carrying the original. A reference file is not
     * corrected, so the value stands and this is where that is written down.
     */
    const ARTWORK_ONLY = ['#6C6C6C']

    for (const file of [...SOURCE_FILES, 'index.html']) {
      const allowed =
        file === 'src/components/Brand.tsx' ? [...PALETTE, ...ARTWORK_ONLY] : PALETTE

      for (const hex of read(file).match(/#[0-9a-fA-F]{3,8}\b/g) ?? []) {
        expect(allowed, `${file} uses ${hex}`).toContain(hex.toUpperCase())
      }
    }
  })

  it('derives every rgba from ink or paper', () => {
    // the alternative is a stray rgb triplet that reads as "nearly the palette"
    // in review and lands as an eighth colour on the page
    for (const file of SOURCE_FILES) {
      for (const value of read(file).match(/rgba?\([^)]*\)/g) ?? []) {
        const triplet = value
          .replace(/rgba?\(|\)/g, '')
          .split(',')
          .slice(0, 3)
          .join(',')
        expect(ALPHA_BASES, `${file} uses ${value}`).toContain(triplet.replace(/\s/g, ''))
      }
    }
  })

  it('keeps the artwork’s stray grey out of the interface', () => {
    /**
     * #6C6C6C belongs to two cells of the mark's dissolve and to nothing else.
     * The brief wanted it gone entirely; the reference artwork keeps it, and a
     * reference file is not corrected. So the rule narrows rather than
     * disappearing: a drawing may carry it, an interface may not — the moment
     * it turns up in a stylesheet it is a ninth colour nobody declared.
     */
    for (const file of [...STYLE_FILES, 'index.html']) {
      expect(read(file).toUpperCase(), file).not.toContain('#6C6C6C')
    }
  })

  it('puts ink on every orange fill, never white', () => {
    // white measures 3.56 against --cta and fails AA; ink measures 5.56
    const rules = [
      ['src/index.css', '.pill-cta'],
      ['src/components/Hero.css', '.btn-primary'],
    ] as const

    for (const [file, selector] of rules) {
      const block = read(file).match(new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`))?.[1]
      expect(block, `${file} ${selector}`).toBeTruthy()
      expect(block, `${file} ${selector}`).toContain('background-color: var(--cta)')
      expect(block, `${file} ${selector}`).toContain('color: var(--ink)')
      expect(block, `${file} ${selector}`).not.toContain('var(--paper)')
    }
  })

  it('makes the dark section --ink rather than the warm grey', () => {
    // --cta on #514C4C is 2.37 and the button vanishes; on --ink it is 5.56
    const block = read('src/components/Body.css').match(
      /\.section-dark\s*\{([^}]*)\}/
    )?.[1]
    expect(block).toContain('background-color: var(--ink)')
    expect(block).not.toContain('var(--text)')
  })

  it('never pairs --muted with type under 14px', () => {
    // 5.90 against paper clears AA for body copy, but the brief draws the line
    // at 14px and small text at that weight is where the contrast stops being
    // comfortable. Anything smaller is --text, which measures 8.08.
    for (const file of STYLE_FILES) {
      for (const [block] of read(file).matchAll(/\{[^}]*\}/g)) {
        if (!block.includes('var(--muted)')) continue
        const size = Number(block.match(/font-size:\s*(\d+)px/)?.[1] ?? 14)
        expect(size, `${file}: ${block.slice(0, 60)}`).toBeGreaterThanOrEqual(14)
      }
    }
  })

  it('keeps --accent to the three places that earn it', () => {
    /**
     * 2.87 against paper: it fails even the 3:1 floor for interface elements,
     * so it may never be ordinary text or a border on the light ground.
     *
     * Checked by rule rather than by property, because the property alone
     * cannot tell the difference between the two `color` declarations that
     * matter here — one paints a hovered character and is fine, one would paint
     * a paragraph and is not.
     */
    const rules: string[] = []
    for (const file of STYLE_FILES) {
      const css = read(file).replace(/\/\*[\s\S]*?\*\//g, '')
      for (const match of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
        if (!match[2]?.includes('var(--accent)')) continue
        rules.push(`${file}: ${match[1]?.trim().replace(/\s+/g, ' ')}`)
      }
    }

    expect(rules).toEqual([
      'src/index.css: .on-ink :focus-visible, .section-dark :focus-visible',
      'src/index.css: ::highlight(awning-grey)',
    ])

    // and in the drawings, only as a fill on a group of cells
    expect(read('src/components/icons.tsx')).toContain('<g fill="var(--accent)">')
  })

  it('gives every button the weight, and no button an outline', () => {
    /**
     * 600 is the third weight on a site that otherwise runs on two, and the
     * buttons are the whole reason it is loaded — so the set is named here
     * rather than inferred, and a button bolded in its own sheet but never
     * added to this list is the drift worth catching.
     *
     * The stroke half of this check is gone with the rule it guarded: an
     * --accent rim on the labels read as an outline around the letterforms.
     */
    const BUTTONS = [
      '.pill',
      '.btn',
      '.nav-cta',
      '.nav-menu-cta',
      '.menu-label',
      '.chat-launcher',
      '.chat-submit',
      '.chat-email-btn',
    ]

    const css = STYLE_FILES.map((file) => read(file))
      .join('\n')
      .replace(/\/\*[\s\S]*?\*\//g, '')

    // Matched on the whole selector list rather than by substring: ".pill"
    // appears inside ".boundary-page .pill", and a loose match finds that
    // rule's margin instead of the button's weight.
    const rules = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].map((m) => ({
      selectors: (m[1] ?? '').split(',').map((s) => s.trim()),
      body: m[2] ?? '',
    }))

    for (const selector of BUTTONS) {
      const own = rules.filter((rule) => rule.selectors.includes(selector))
      expect(own.length, `${selector} has no rule of its own`).toBeGreaterThan(0)
      expect(
        own.some((rule) => rule.body.includes('font-weight: 600')),
        `${selector} is not bold`
      ).toBe(true)
    }

    expect(css).not.toContain('-webkit-text-stroke')
  })

  it('splits the letter hover by how dark the type already is', () => {
    // black to --cta-hover, grey to --accent. One orange for both would flatten
    // the difference exactly where the eye is looking.
    const css = read('src/index.css')
    expect(css).toMatch(/::highlight\(awning-ink\)\s*\{\s*color: var\(--cta-hover\);/)
    expect(css).toMatch(/::highlight\(awning-grey\)\s*\{\s*color: var\(--accent\);/)

    const hook = read('src/components/useLetterHover.ts')
    // the orange fill is exempt: an orange character on it is a hole
    expect(hook).toContain('.pill-cta, .btn-primary')
    // and the effect is enhancement only — no API, no highlight, no error
    expect(hook).toContain("!('highlights' in CSS)")
  })

  it('shows a focus ring on both grounds', () => {
    const css = read('src/index.css')
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--cta\)/)
    expect(css).toMatch(
      /\.section-dark :focus-visible[\s\S]*?outline-color: var\(--accent\)/
    )
  })
})

/* ================================================================ pixel art */

const ICONS = read('src/components/icons.tsx')

/** Every bitmap literal in the icon set, as arrays of 16 strings. */
function bitmaps(): Array<{ name: string; rows: string[] }> {
  const out: Array<{ name: string; rows: string[] }> = []
  for (const match of ICONS.matchAll(
    /export const (Icon\w+) = pixels\(\[([\s\S]*?)\]\)/g
  )) {
    const rows = [...(match[2] ?? '').matchAll(/'([^']*)'/g)].map((m) => m[1] ?? '')
    out.push({ name: match[1] ?? '?', rows })
  }
  return out
}

describe('pixel art', () => {
  const all = bitmaps()

  it('finds the whole set', () => {
    // a rename that silently empties this list would make every check below
    // pass over nothing at all
    expect(all.length).toBeGreaterThanOrEqual(16)
  })

  it('draws every glyph on 16 by 16 modules', () => {
    for (const { name, rows } of all) {
      expect(rows, name).toHaveLength(16)
      for (const row of rows) {
        expect(row.length, `${name}: "${row}"`).toBe(16)
        expect(row, name).toMatch(/^[.#o]{16}$/)
      }
    }
  })

  it('spends at most one connected group of accent cells per glyph', () => {
    for (const { name, rows } of all) {
      const seen = new Set<string>()
      let groups = 0

      for (let y = 0; y < 16; y += 1) {
        for (let x = 0; x < 16; x += 1) {
          if (rows[y]?.[x] !== 'o' || seen.has(`${x},${y}`)) continue
          groups += 1
          // flood fill, four-connected
          const stack = [[x, y]]
          while (stack.length > 0) {
            const [cx, cy] = stack.pop() as [number, number]
            const key = `${cx},${cy}`
            if (seen.has(key)) continue
            if (rows[cy]?.[cx] !== 'o') continue
            seen.add(key)
            stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1])
          }
        }
      }

      expect(groups, `${name} has ${groups} accent groups`).toBeLessThanOrEqual(1)
    }
  })

  it('renders crisp rects on whole coordinates, with no stroke', () => {
    expect(ICONS).toContain('shapeRendering="crispEdges"')
    expect(ICONS).toContain('fill="currentColor"')
    expect(ICONS).toContain('viewBox={`0 0 ${GRID} ${GRID}`}')
    // a rasteriser that ignores stroke drops the outline without saying so
    expect(ICONS).not.toMatch(/\sstroke[=:]/)
    // and no outline geometry survives from the line set
    expect(ICONS).not.toContain('<path')
  })

  it('leaves no line icons anywhere on the site', () => {
    for (const file of walk('src', /\.tsx$/)) {
      expect(read(file), `${file} imports lucide`).not.toContain('lucide-react')
    }
    expect(read('package.json')).not.toContain('"lucide-react"')
  })

  it('never sets a glyph below 16px', () => {
    // at 12px the modules collapse into grit
    for (const file of walk('src', /\.tsx$/)) {
      for (const [, size] of read(file).matchAll(/<Icon\w*[^>]*?\bsize=\{(\d+)\}/g)) {
        expect(Number(size), `${file} renders at ${size}px`).toBeGreaterThanOrEqual(16)
      }
    }
  })

  it('holds the pixel grid still for reduced motion', () => {
    expect(read('src/index.css')).toMatch(
      /prefers-reduced-motion[\s\S]*?\[shape-rendering='crispEdges'\][\s\S]*?animation: none/
    )
  })
})

/* =================================================================== prices */

describe('prices', () => {
  it('publishes three tiers at the agreed numbers', () => {
    expect(PRICING.tiers.map((t) => t.price)).toEqual(['$999', '$1,795', 'from $3,379'])
  })

  it('gives the orange button to Pro alone', () => {
    // the middle sells, and it sells because the dearest one stands to its right
    const featured = PRICING.tiers.filter((t) => t.featured)
    expect(featured).toHaveLength(1)
    expect(featured[0]?.name).toBe('Pro')
  })

  it('says "from" only where it explains itself', () => {
    const from = PRICING.tiers.filter((t) => t.from)
    expect(from).toHaveLength(1)
    expect(from[0]?.name).toBe('Pro+')
    // and the card says why the number is open-ended
    expect(from[0]?.includes.join(' ')).toContain('we scope it and price it')
  })

  it('prices every add-on on the page', () => {
    const items = ADDONS.groups.flatMap((g) => g.items)
    expect(items.length).toBeGreaterThan(25)

    for (const item of items) {
      expect(item.price, item.name).toMatch(/\$|%/)
      expect(item.price.toLowerCase(), item.name).not.toContain('request')
    }
  })

  it('quotes a second number wherever a range starts', () => {
    // "from $X" with nothing beside it is how a price list stops being one
    for (const item of ADDONS.groups.flatMap((g) => g.items)) {
      if (!/\bfrom\b/i.test(item.price)) continue
      expect(item.price.match(/\d/g)?.length, item.name).toBeGreaterThan(1)
    }
  })

  it('leaves no trace of the old $200–900 offer', () => {
    // including the places nobody re-reads: meta description, OG tags, alt text
    const stale = [/\$200\b/, /\$500\b/, /\$900\b/, /200[–-]900/, /\$450\b/, /\$700\b/]
    for (const file of [...SOURCE_FILES, 'index.html']) {
      // the design brief's own hour counts are not prices
      if (file.endsWith('design-system.test.ts')) continue
      for (const pattern of stale) {
        expect(read(file), `${file} matches ${pattern}`).not.toMatch(pattern)
      }
    }
  })
})

/* ==================================================== claims we do not make */

describe('claims', () => {
  it('marks up no reviews or ratings', () => {
    // The emitted graph, not the source text — a file may name AggregateRating
    // in a comment explaining why it is absent, and a test that cannot tell the
    // difference teaches people to delete the explanation.
    const emitted = JSON.stringify(ROUTE_META.flatMap((route) => jsonLdFor(route)))
    for (const type of ['AggregateRating', 'Review', 'reviewRating', 'ratingValue']) {
      expect(emitted, `structured data emits ${type}`).not.toContain(type)
    }
  })

  it('prices the structured data off the tiers', () => {
    // the old range survived here longest precisely because nobody renders it
    const blocks = jsonLdFor(metaFor('/')) as Array<Record<string, unknown>>
    const offer = blocks.map((block) => block.offers).find(Boolean) as
      { lowPrice?: string; highPrice?: string } | undefined

    expect(offer?.lowPrice).toBe(PRICING.tiers[0]?.amount)
    expect(offer?.highPrice).toBe(PRICING.tiers[PRICING.tiers.length - 1]?.amount)
  })

  it('claims no address in New York', () => {
    const forbidden = [
      /we (are|'re) (in|based in) new york/i,
      /we build in new york only/i,
      /our (office|studio) in new york/i,
    ]
    for (const file of SOURCE_FILES) {
      for (const pattern of forbidden) {
        expect(read(file), `${file} matches ${pattern}`).not.toMatch(pattern)
      }
    }
  })

  it('answers the remote question outright', () => {
    const answer = FAQ.items.find((item) => /are you in new york/i.test(item.q))
    expect(answer).toBeTruthy()
    expect(answer?.a).toMatch(/^No\./)
    expect(answer?.a).toMatch(/remote team/i)
  })

  it('promises no search ranking', () => {
    const row = SPECS.rows.find((r) => r.label === 'Search rankings')
    expect(row?.value).toBe('Not something we promise')

    const ranking = FAQ.items.find((item) => /number one on google/i.test(item.q))
    expect(ranking?.a).toMatch(/nobody can promise that/i)
  })

  it('keeps the agency lexicon out of the copy', () => {
    const banned = [
      'solutions',
      'empower',
      'elevate',
      'cutting-edge',
      'seamless',
      'growth engine',
      'digital presence',
      'stunning',
    ]
    const copy = read('src/data/copy.ts').toLowerCase()
    for (const word of banned) {
      expect(copy, `copy.ts uses "${word}"`).not.toContain(word)
    }
  })
})
