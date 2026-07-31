import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { scrollToId } from '../router'
import { useChat } from './ChatWidget'
import { IconArrow } from './icons'
import { HERO } from '../data/copy'
import { EASE } from './motion-presets'
import './Hero.css'

const VIDEO_SRC =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_215831_c6a8989c-d716-4d8d-8745-e972a2eec711.mp4'

/**
 * The first thing anyone sees, and it is hosted somewhere else. A poster covers
 * both the ordinary case (the seconds before enough of the file has arrived)
 * and the bad one (a network that blocks the CDN, or the link expiring) — in
 * which case an unposterd video is an empty black box with no explanation.
 *
 * Built through BASE_URL because this is a runtime expression: Vite rewrites
 * asset paths it can see in markup, and it cannot see this one.
 */
const VIDEO_POSTER = `${import.meta.env.BASE_URL}hero-poster.png`

/** Each line rides up out of its own clipping box — reads as type being set. */
function Line({ text, delay }: { text: string; delay: number }) {
  return (
    <span className="heading-line">
      <motion.span
        className="heading-line-inner"
        initial={{ y: '110%' }}
        animate={{ y: '0%' }}
        transition={{ duration: 1.05, delay, ease: EASE }}
      >
        {text}
      </motion.span>
    </span>
  )
}

export default function Hero() {
  const { open: openChat } = useChat()
  const heroRef = useRef(null)
  const reduced = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  // the showpiece drifts and settles as the page leaves it behind
  const videoY = useTransform(scrollYProgress, [0, 1], ['0%', '14%'])
  const videoScale = useTransform(scrollYProgress, [0, 1], [1, 1.08])

  return (
    <div className="hero" ref={heroRef}>
      <motion.div
        className="video-layer"
        style={reduced ? undefined : { y: videoY, scale: videoScale }}
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.8, ease: EASE }}
      >
        <div className="video-wrapper">
          <video
            className="video"
            src={VIDEO_SRC}
            poster={VIDEO_POSTER}
            autoPlay
            muted
            loop
            playsInline
          />
        </div>
      </motion.div>

      {/* The headline claims this animation is the portfolio, so label it. */}
      <motion.div
        className="hero-marker"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 1.4, ease: EASE }}
      >
        <span className="hero-marker-dot" />
        Running live. Our own motion, not stock footage.
      </motion.div>

      <motion.div
        className="hero-foot"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1, delay: 0.5, ease: EASE }}
      >
        <div className="hero-foot-left">
          <motion.div
            className="subtitle"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6, ease: EASE }}
          >
            <span className="subtitle-dot" />
            <span>{HERO.subtitle}</span>
          </motion.div>

          <h1 className="heading">
            <Line text={HERO.line1} delay={0.75} />
            <Line text={HERO.line2} delay={0.87} />
          </h1>

          <motion.p
            className="hero-lede"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.02, ease: EASE }}
          >
            {HERO.lede}
          </motion.p>

          <motion.div
            className="cta-row"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.15, ease: EASE }}
          >
            {/* accent stays off: this arrow rides on --cta, where an orange
                cell would vanish into the fill rather than mark anything */}
            <button className="btn btn-primary" type="button" onClick={openChat}>
              {HERO.primaryCta}
              <IconArrow size={16} className="pill-icon" />
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => scrollToId('motion')}
            >
              {HERO.secondaryCta}
            </button>
          </motion.div>
        </div>

        <div className="hero-foot-right">
          {HERO.tags.map((tag, i) => (
            <motion.span
              className="hero-tag"
              key={tag}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.25 + i * 0.08, ease: EASE }}
            >
              {tag}
            </motion.span>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
