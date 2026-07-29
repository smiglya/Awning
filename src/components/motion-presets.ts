import type { Variants } from 'motion/react'

/**
 * Shared motion presets.
 *
 * Reduced-motion is handled globally by <MotionConfig reducedMotion="user"> in
 * App.tsx — it strips transforms for users who ask for less movement, so these
 * presets do not each need their own guard.
 *
 * Usage, with no extra DOM nodes:
 *   <motion.div className="card-grid" {...stagger()}>
 *     <motion.article className="card" {...rise()} />
 */

/** Tuple, not number[] — motion's Easing type requires exactly four control points. */
export const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

interface StaggerProps {
  initial: string
  whileInView: string
  viewport: { once: boolean; amount: number }
  variants: Variants
}

/** Container: children animate in sequence as the container enters view. */
export const stagger = (each = 0.08, amount = 0.2): StaggerProps => ({
  initial: 'hidden',
  whileInView: 'show',
  viewport: { once: true, amount },
  variants: {
    hidden: {},
    show: { transition: { staggerChildren: each } },
  },
})

/** Child of a stagger container. */
export const rise = (y = 24, duration = 0.8): { variants: Variants } => ({
  variants: {
    hidden: { opacity: 0, y },
    show: { opacity: 1, y: 0, transition: { duration, ease: EASE } },
  },
})

/** Standalone element, no container needed. */
export const reveal = (delay = 0, y = 24, duration = 0.8) => ({
  initial: { opacity: 0, y },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration, delay, ease: EASE },
})

/** Hairline that draws itself across as the section arrives. */
export const drawLine = (duration = 1.1) => ({
  initial: { scaleX: 0 },
  whileInView: { scaleX: 1 },
  viewport: { once: true, amount: 0.5 },
  transition: { duration, ease: EASE },
  style: { transformOrigin: 'left center' },
})
