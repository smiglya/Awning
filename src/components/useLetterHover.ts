import { useEffect } from 'react'

/**
 * Every letter on the site answers the cursor, one at a time.
 *
 * Black type goes to --cta-hover, grey type to --accent. The split is the
 * point: the two greys are already quieter than the ink, and sending both to
 * the same orange would flatten that difference exactly where the eye is
 * looking.
 *
 * No DOM is touched. The obvious implementation — wrap every character in a
 * span and give it :hover — costs one element per character, and this page runs
 * to roughly fifteen thousand of them once the price tables and the FAQ are
 * counted. That is a quarter of a megabyte of extra prerendered HTML and a DOM
 * an order of magnitude larger than the document it renders, for an effect that
 * needs exactly one character lit at a time.
 *
 * So instead: ask the document which character is under the pointer, and paint
 * that one range through the CSS Custom Highlight API. One Range object, no
 * elements, and it works on text this code has never seen — table cells,
 * captions, copy that arrives from the API later.
 *
 * Where the API is missing the effect simply does not appear. Nothing else
 * depends on it, and a hover flourish is the right thing to lose first.
 */

const INK = 'awning-ink'
const GREY = 'awning-grey'

/**
 * Below this the colour is ink rather than one of the greys.
 *
 * Measured, not guessed: --ink lands at 0.003, --text at 0.074 and --muted at
 * 0.130. Anything lighter than the threshold is a grey, or is paper type on the
 * dark band — which also wants --accent, the one orange that clears AA there.
 */
const INK_LUMINANCE = 0.02

/** Elements whose text must not be repainted, and why each one is here. */
const EXEMPT =
  // orange on orange is a hole rather than a highlight
  '.pill-cta, .btn-primary,' +
  // a caret moving through a field should not leave a trail of colour
  ' input, textarea, select, [contenteditable]'

function channel(value: number): number {
  const v = value / 255
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

function luminance(colour: string): number | null {
  const [r, g, b] = colour.match(/\d+(\.\d+)?/g)?.map(Number) ?? []
  if (r === undefined || g === undefined || b === undefined) return null
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/**
 * Safari only grew caretPositionFromPoint in 17. Before that the same job was
 * done by a WebKit-only method that lib.dom does not declare, hence the cast
 * rather than an interface — widening Document to make one legacy method
 * optional would make the standard one optional too.
 */
type LegacyCaret = {
  caretRangeFromPoint?: (x: number, y: number) => Range | null
}

/**
 * The single character under the pointer, or null.
 *
 * Both caret APIs snap to the nearest character rather than returning nothing,
 * so a pointer in a paragraph's margin or past the end of a line still comes
 * back with a position. The rect check at the end is what turns that into an
 * honest hit test — without it, letters light up while the cursor is nowhere
 * near them.
 */
function characterAt(x: number, y: number): Range | null {
  const legacy = document as unknown as LegacyCaret
  let node: Node | null = null
  let offset = 0

  if (typeof document.caretPositionFromPoint === 'function') {
    const position = document.caretPositionFromPoint(x, y)
    if (!position) return null
    node = position.offsetNode
    offset = position.offset
  } else if (typeof legacy.caretRangeFromPoint === 'function') {
    const range = legacy.caretRangeFromPoint(x, y)
    if (!range) return null
    node = range.startContainer
    offset = range.startOffset
  }

  if (!node || node.nodeType !== Node.TEXT_NODE) return null

  const text = node.textContent ?? ''
  // the caret sits between characters, so the last position has none after it
  if (offset >= text.length) offset = text.length - 1
  if (offset < 0) return null
  // whitespace has no glyph to colour, and lighting it looks like a bug
  if (/\s/.test(text.charAt(offset))) return null

  const parent = node.parentElement
  if (!parent || parent.closest(EXEMPT)) return null

  const range = document.createRange()
  range.setStart(node, offset)
  range.setEnd(node, offset + 1)

  const rect = range.getBoundingClientRect()
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    return null
  }

  return range
}

export function useLetterHover(): void {
  useEffect(() => {
    if (typeof CSS === 'undefined' || !('highlights' in CSS)) return
    if (!window.matchMedia('(hover: hover)').matches) return

    const highlights = CSS.highlights as unknown as Map<string, Highlight>
    const ink = new Highlight()
    const grey = new Highlight()
    highlights.set(INK, ink)
    highlights.set(GREY, grey)

    let frame = 0
    let lastX = -1
    let lastY = -1

    const clear = () => {
      ink.clear()
      grey.clear()
    }

    const paint = () => {
      frame = 0
      const range = characterAt(lastX, lastY)
      clear()
      if (!range) return

      const colour = getComputedStyle(range.startContainer.parentElement as Element).color
      const level = luminance(colour)
      if (level === null) return
      ;(level < INK_LUMINANCE ? ink : grey).add(range)
    }

    // caretPositionFromPoint forces layout, so it runs once a frame at most
    // rather than once per pointer event
    const onMove = (event: PointerEvent) => {
      lastX = event.clientX
      lastY = event.clientY
      if (frame === 0) frame = requestAnimationFrame(paint)
    }

    const onLeave = () => {
      if (frame !== 0) cancelAnimationFrame(frame)
      frame = 0
      clear()
    }

    document.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    window.addEventListener('blur', onLeave)

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame)
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('blur', onLeave)
      highlights.delete(INK)
      highlights.delete(GREY)
    }
  }, [])
}
