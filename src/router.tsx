import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { isBrowser } from './lib/dom'

/**
 * Two-route History API router. Deliberately dependency-free — react-router
 * carries open high-severity advisories across the whole 7.x line and this
 * site needs exactly two paths.
 *
 * Paths inside the app are always base-relative ('/', '/work-map'). The base
 * prefix only appears in real hrefs, which is what lets the same build serve
 * from a domain root and from a GitHub Pages project subdirectory.
 */

/** '/' on a domain root, '/Awning/' on a Pages project site. */
const BASE = import.meta.env.BASE_URL || '/'
const BASE_NO_SLASH = BASE.replace(/\/$/, '')

/** Browser location -> app path. */
export function toAppPath(pathname: string): string {
  let path = pathname
  if (BASE_NO_SLASH && path.startsWith(BASE_NO_SLASH)) {
    path = path.slice(BASE_NO_SLASH.length)
  }
  // GitHub Pages serves directory indexes with a trailing slash
  if (path.length > 1) path = path.replace(/\/+$/, '')
  return path || '/'
}

/** App path -> href the browser can use. */
export function toHref(appPath: string): string {
  if (appPath === '/') return BASE
  return `${BASE_NO_SLASH}${appPath}`
}

export interface RouterValue {
  path: string
  navigate: (to: string) => void
}

const RouterContext = createContext<RouterValue>({
  path: '/',
  navigate: () => {},
})

export interface RouterProviderProps {
  children: ReactNode
  /** Supplied by the prerender, where there is no location to read. */
  initialPath?: string
}

export function RouterProvider({ children, initialPath }: RouterProviderProps) {
  const [path, setPath] = useState<string>(
    () => initialPath ?? (isBrowser ? toAppPath(window.location.pathname) : '/')
  )

  useEffect(() => {
    if (!isBrowser) return
    const onPop = () => setPath(toAppPath(window.location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback((to: string) => {
    const href = toHref(to)
    if (href !== window.location.pathname) {
      window.history.pushState({}, '', href)
      setPath(to)
    }
    window.scrollTo({ top: 0 })
  }, [])

  const value = useMemo<RouterValue>(() => ({ path, navigate }), [path, navigate])

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

export function useRouter(): RouterValue {
  return useContext(RouterContext)
}

export interface LinkProps {
  to: string
  className?: string
  children: ReactNode
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void
}

export function Link({ to, className, children, onClick }: LinkProps) {
  const { navigate } = useRouter()

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // let the browser handle new-tab / new-window intents
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return
    }
    event.preventDefault()
    if (onClick) onClick(event)
    navigate(to)
  }

  return (
    <a href={toHref(to)} className={className} onClick={handleClick}>
      {children}
    </a>
  )
}

/** Smooth-scroll to an in-page section, for the on-page CTAs. */
export function scrollToId(id: string): void {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
