/**
 * A heading, split so each letter can answer the cursor on its own.
 *
 * This bends the palette rule rather than breaking it, and the distinction is
 * worth writing down. Orange means "press this", and §5.3 of the brief spends
 * it on six places, none of which is a heading — colour a headline and the eye
 * stops finding the button. What happens here is narrower: one letter, the one
 * the pointer is physically on, for as long as it is there. It reads the way a
 * focus ring reads, as a cursor rather than an advertisement, and at most one
 * letter is lit at any instant, so a screen never gains a second orange spot
 * that competes for attention from across the page.
 *
 * The accessible name is the reason for the aria plumbing. Splitting a string
 * into per-letter elements is the classic way to make a screen reader spell a
 * headline out — VoiceOver in particular will read "P. R. I. C. E." given
 * enough structure. So the letters are hidden from the accessibility tree and
 * the heading carries the whole string as its label instead. That is exact, and
 * it does not depend on any reader's heuristics for joining inline runs.
 *
 * Search engines read the rendered text, which is unchanged: the characters are
 * all still there, in order, as text nodes.
 */

export interface LettersProps {
  text: string
}

/**
 * Whitespace is kept as its own run rather than folded into the words. Line
 * breaking happens at spaces, and a space swallowed into a nowrap word is a
 * heading that stops wrapping where it should.
 */
export default function Letters({ text }: LettersProps) {
  return (
    <span aria-hidden="true">
      {text.split(/(\s+)/).map((run, i) =>
        /^\s+$/.test(run) ? (
          <span key={`s${i}`}>{run}</span>
        ) : (
          <span className="hl-word" key={`w${i}`}>
            {[...run].map((glyph, j) => (
              <span className="hl-letter" key={`${j}${glyph}`}>
                {glyph}
              </span>
            ))}
          </span>
        )
      )}
    </span>
  )
}
