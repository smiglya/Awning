import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Plus } from 'lucide-react'
import { Link, scrollToId, useRouter } from '../router'
import { useChat } from './ChatWidget'
import { LogoMark, Logotype } from './Brand'
import { BRAND, HERO } from '../data/copy'
import { EASE } from './motion-presets'
import './SiteNav.css'

interface MenuItem {
  label: string
  to: string
  id?: string
}

const MENU_ITEMS: MenuItem[] = [
  { label: 'Motion demos', to: '/', id: 'motion' },
  { label: 'Sample builds', to: '/', id: 'work' },
  { label: 'Prices', to: '/', id: 'pricing' },
  { label: 'Full cycle', to: '/', id: 'cycle' },
  { label: 'Servers', to: '/', id: 'servers' },
  { label: 'Client map', to: '/work-map' },
]

export default function SiteNav() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { open: openChat } = useChat()
  const { path, navigate } = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)

  // a menu that only closes by pressing its own button is a trap
  useEffect(() => {
    if (!menuOpen) return

    const onPointerDown = (event: globalThis.PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const goTo = (item: MenuItem) => {
    setMenuOpen(false)
    // bind the id up front: the setTimeout closure loses the narrowing
    const { id } = item
    if (id) {
      if (path !== '/') {
        navigate('/')
        window.setTimeout(() => scrollToId(id), 60)
      } else {
        scrollToId(id)
      }
      return
    }
    navigate(item.to)
  }

  return (
    <motion.nav
      className={`navbar${scrolled ? ' navbar-scrolled' : ''}`}
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: EASE }}
    >
      <div className="nav-left" ref={menuRef}>
        {/* The lockup already contains the name, so narrow screens get the mark
            alone and wide ones get the whole thing — the same swap the text
            version did, without setting the name in a different typeface than
            the logo it sits beside. The name stays in the accessible tree as
            text either way: an aria-hidden drawing is not a link label. */}
        <Link className="logo" to="/">
          <LogoMark className="logo-mark" />
          <Logotype className="logo-type" />
          <span className="sr-only">{BRAND}</span>
        </Link>

        <button
          className="menu-button"
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
        >
          <motion.span
            className="menu-icon"
            animate={{ rotate: menuOpen ? 135 : 0 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <Plus size={12} strokeWidth={3} />
          </motion.span>
          <span className="menu-label">Menu</span>
        </button>

        <div className="tags-pill">
          <span className="tags-pill-item">Motion in house</span>
          <span className="tags-pill-item">From $200</span>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              className="nav-menu"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: EASE }}
            >
              {MENU_ITEMS.map((item) => (
                <button
                  className="nav-menu-item"
                  type="button"
                  key={item.label}
                  onClick={() => goTo(item)}
                >
                  {item.label}
                </button>
              ))}
              <button
                className="nav-menu-item nav-menu-cta"
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  openChat()
                }}
              >
                Start my site
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="nav-right">
        <Link className="nav-map-link" to="/work-map">
          Client map
        </Link>
        <button className="nav-cta" type="button" onClick={openChat}>
          {HERO.navCta}
        </button>
      </div>
    </motion.nav>
  )
}
