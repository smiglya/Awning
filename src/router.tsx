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

/**
 * Two-route History API router. Deliberately dependency-free — react-router
 * carries open high-severity advisories across the whole 7.x line and this
 * site needs exactly two paths.
 *
 * Note for deployment: clean URLs mean a static host must rewrite unknown
 * paths to index.html, or /work-map will 404 on a hard refresh.
 */

export interface RouterValue {
  path: string
  navigate: (to: string) => void
}

const RouterContext = createContext<RouterValue>({
  path: '/',
  navigate: () => {},
})

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState<string>(() => window.location.pathname || '/')

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname || '/')
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback((to: string) => {
    if (to !== window.location.pathname) {
      window.history.pushState({}, '', to)
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
    <a href={to} className={className} onClick={handleClick}>
      {children}
    </a>
  )
}

/** Smooth-scroll to an in-page section, for the on-page CTAs. */
export function scrollToId(id: string): void {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
