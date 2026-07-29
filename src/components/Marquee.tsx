import './Marquee.css'

/**
 * Ink ticker strip. Sits directly under the hero as hard punctuation between
 * the animation and the quiet body, and gives the page one moment of constant
 * movement without asking the visitor to do anything.
 *
 * The track is rendered twice and translated by exactly -50%, which is what
 * makes the loop seamless. Under prefers-reduced-motion it simply stops.
 */
export interface MarqueeProps {
  items: string[]
  speed?: number
}

export default function Marquee({ items, speed = 42 }: MarqueeProps) {
  const track = [...items, ...items]

  return (
    <div className="marquee" aria-label={items.join(', ')}>
      <div
        className="marquee-track"
        style={{ animationDuration: `${speed}s` }}
        aria-hidden="true"
      >
        {track.map((item, i) => (
          <span className="marquee-item" key={`${item}-${i}`}>
            {item}
            <span className="marquee-sep" />
          </span>
        ))}
      </div>
    </div>
  )
}
