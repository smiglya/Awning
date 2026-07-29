import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react'
import './MotionDemos.css'

/**
 * Four live demos, running in the browser rather than recorded. They are the
 * proof behind the claim that the motion is written here, so they have to be
 * real — a video of an animation would undercut the whole section.
 *
 * Every one degrades to a still, readable state under prefers-reduced-motion.
 */

/* ------------------------------------------------------- magnetic button */

export function MagneticButton({ label = 'Call the shop' }) {
  const reduced = useReducedMotion()
  const areaRef = useRef<HTMLDivElement>(null)

  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 150, damping: 15, mass: 0.4 })
  const sy = useSpring(y, { stiffness: 150, damping: 15, mass: 0.4 })

  // the label trails the pill slightly, which is what sells the weight
  const lx = useTransform(sx, (v) => v * 0.35)
  const ly = useTransform(sy, (v) => v * 0.35)

  const handleMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (reduced || !areaRef.current) return
    const rect = areaRef.current.getBoundingClientRect()
    const dx = event.clientX - (rect.left + rect.width / 2)
    const dy = event.clientY - (rect.top + rect.height / 2)
    const max = 14
    x.set(Math.max(-max, Math.min(max, dx * 0.35)))
    y.set(Math.max(-max, Math.min(max, dy * 0.35)))
  }

  const handleLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <div
      className="demo-area"
      ref={areaRef}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      <motion.div className="demo-magnet" style={{ x: sx, y: sy }}>
        <motion.span style={{ x: lx, y: ly }}>{label}</motion.span>
      </motion.div>
    </div>
  )
}

/* -------------------------------------------------------- scrambled text */

const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789/\\<>*+='

export function ScrambleText({ text = 'Fifth Ave Nails' }) {
  const reduced = useReducedMotion()
  const ref = useRef(null)
  const inView = useInView(ref, { amount: 0.6 })
  const [scrambled, setScrambled] = useState('')

  // reduced motion shows the final string outright; no effect needed
  const shown = reduced ? text : scrambled

  useEffect(() => {
    if (reduced || !inView) return

    let frame = 0
    const total = text.length
    const id = setInterval(() => {
      frame += 1
      // characters lock in left to right, the rest keep churning
      const locked = Math.floor(frame / 2)
      const next = text
        .split('')
        .map((char, i) => {
          if (char === ' ') return ' '
          if (i < locked) return char
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
        })
        .join('')
      setScrambled(next)
      if (locked >= total) clearInterval(id)
    }, 40)

    return () => clearInterval(id)
  }, [inView, reduced, text])

  return (
    <div className="demo-area" ref={ref}>
      <span className="demo-scramble">{shown || ' '}</span>
    </div>
  )
}

/* --------------------------------------------------------- rolling digits */

const SLOT = 46

function DigitColumn({
  digit,
  index,
  active,
}: {
  digit: number
  index: number
  active: boolean
}) {
  return (
    <span className="demo-digit">
      <motion.span
        className="demo-digit-col"
        initial={{ y: 0 }}
        animate={{ y: active ? -digit * SLOT : 0 }}
        transition={{
          type: 'spring',
          stiffness: 120,
          damping: 18,
          delay: index * 0.06,
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <span className="demo-digit-cell" key={n}>
            {n}
          </span>
        ))}
      </motion.span>
    </span>
  )
}

export function RollingNumber({ value = '200', prefix = '$' }) {
  const reduced = useReducedMotion()
  const ref = useRef(null)
  const inView = useInView(ref, { amount: 0.6 })
  const [replay, setReplay] = useState(0)

  const digits = String(value).split('').map(Number)
  const active = reduced || inView

  return (
    <div
      className="demo-area demo-area-click"
      ref={ref}
      onClick={() => setReplay((n) => n + 1)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setReplay((n) => n + 1)
        }
      }}
      aria-label={`${prefix}${value}, replay animation`}
    >
      <span className="demo-roller" key={replay}>
        <span className="demo-roller-prefix">{prefix}</span>
        {digits.map((digit, i) => (
          <DigitColumn key={`${i}-${replay}`} digit={digit} index={i} active={active} />
        ))}
      </span>
    </div>
  )
}

/* ------------------------------------------------------- self-drawing line */

export function DrawnLine() {
  const reduced = useReducedMotion()
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.9', 'end 0.35'],
  })
  const length = useTransform(scrollYProgress, [0, 1], [0, 1])
  const smooth = useSpring(length, { stiffness: 80, damping: 20 })

  return (
    <div className="demo-area" ref={ref}>
      <svg viewBox="0 0 200 90" className="demo-line-svg" fill="none" aria-hidden="true">
        <path
          d="M6 74 C 52 74, 58 18, 100 18 S 150 62, 194 20"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.16"
        />
        <motion.path
          d="M6 74 C 52 74, 58 18, 100 18 S 150 62, 194 20"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          style={{ pathLength: reduced ? 1 : smooth }}
        />
      </svg>
    </div>
  )
}

export type DemoKey = 'magnet' | 'scramble' | 'roller' | 'line'

export const DEMO_COMPONENTS = {
  magnet: MagneticButton,
  scramble: ScrambleText,
  roller: RollingNumber,
  line: DrawnLine,
}
