import { MotionConfig } from 'motion/react'
import { ChatProvider } from './components/ChatWidget'
import { ErrorBoundary } from './components/ErrorBoundary'
import { RouterProvider, useRouter } from './router'
import Landing from './pages/Landing'
import MapPage from './pages/MapPage'
import NotFound from './pages/NotFound'

/** Every path the site answers. Anything else is a genuine 404. */
export const ROUTES = {
  home: '/',
  map: '/work-map',
} as const

function Routes() {
  const { path } = useRouter()

  if (path === ROUTES.map) return <MapPage />
  if (path === ROUTES.home) return <Landing />
  return <NotFound />
}

export default function App() {
  return (
    // reducedMotion="user" strips transforms for visitors who ask for less
    // movement, so no individual animation needs its own guard
    <MotionConfig reducedMotion="user">
      <ErrorBoundary>
        <RouterProvider>
          {/* The chat's own boundary sits inside ChatProvider, around the
              launcher and panel only. Wrapping the provider would put the
              routes inside the boundary too, so a widget crash would blank
              the page it floats over. */}
          <ChatProvider>
            <Routes />
          </ChatProvider>
        </RouterProvider>
      </ErrorBoundary>
    </MotionConfig>
  )
}
