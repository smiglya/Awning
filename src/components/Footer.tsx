import { useState, type FormEvent } from 'react'
import { motion } from 'motion/react'
import { subscribe } from '../api/index'
import { reveal, rise, stagger } from './motion-presets'
import { IconArrow, SOCIAL_ICONS } from './icons'
import { Logotype } from './Brand'
import { FOOTER } from '../data/copy'
import './Footer.css'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState('idle') // idle | sending | done | error

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = email.trim()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
      setState('error')
      return
    }
    setState('sending')
    try {
      await subscribe(value)
      setState('done')
      setEmail('')
    } catch {
      setState('error')
    }
  }

  return (
    <footer className="footer">
      <div className="container">
        <motion.div className="foot-signup" {...reveal(0, 18)}>
          <p className="foot-signup-copy">{FOOTER.newsletterLine}</p>

          {state === 'done' ? (
            <p className="foot-done">On the list. One a month, nothing else.</p>
          ) : (
            <form className="foot-form" onSubmit={handleSubmit} noValidate>
              <input
                className="foot-input"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (state === 'error') setState('idle')
                }}
                placeholder={FOOTER.emailPlaceholder}
                aria-label={FOOTER.emailPlaceholder}
                aria-invalid={state === 'error'}
              />
              <button
                className="foot-arrow"
                type="submit"
                disabled={state === 'sending'}
                aria-label="Subscribe"
              >
                <IconArrow size={14} />
              </button>
            </form>
          )}
        </motion.div>

        {state === 'error' && (
          <p className="foot-error" role="alert">
            That email does not look right.
          </p>
        )}

        <div className="foot-rule" />

        <motion.nav className="foot-cols" {...stagger(0.06)}>
          {FOOTER.columns.map((col) => (
            <motion.div className="foot-col" key={col.head} {...rise(16)}>
              <h3 className="foot-col-head">{col.head}</h3>
              <ul className="foot-col-list">
                {col.links.map((link) => (
                  <li key={link}>
                    {/* real destinations do not exist yet; a button is honest,
                        an href="#" is a dead link in the crawl graph */}
                    <button className="foot-link" type="button">
                      {link}
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.nav>

        <div className="foot-rule" />

        <div className="foot-legal">
          <p className="foot-legal-copy">{FOOTER.legal}</p>
          <div className="foot-social">
            {SOCIAL_ICONS.map((Icon, i) => (
              <button
                className="foot-social-btn"
                type="button"
                key={i}
                aria-label={`Profile ${i + 1}`}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Oversized lockup, clipped by the bottom edge of the page. Previously
          the name set in the body typeface at a size derived from its character
          count — a guess that had to be re-tuned whenever the name changed. The
          artwork scales exactly, so the guess is gone. */}
      <div className="foot-wordmark-clip">
        <div className="container">
          <Logotype className="foot-wordmark" />
        </div>
      </div>
    </footer>
  )
}
