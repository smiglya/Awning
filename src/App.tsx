import { MotionConfig } from 'motion/react'
import { ChatProvider } from './components/ChatWidget'
import { RouterProvider, useRouter } from './router'
import Landing from './pages/Landing'
import MapPage from './pages/MapPage'

function Routes() {
  const { path } = useRouter()

  if (path === '/work-map') return <MapPage />
  return <Landing />
}

export default function App() {
  return (
    // reducedMotion="user" strips transforms for visitors who ask for less
    // movement, so no individual animation needs its own guard
    <MotionConfig reducedMotion="user">
      <RouterProvider>
        <ChatProvider>
          <Routes />
        </ChatProvider>
      </RouterProvider>
    </MotionConfig>
  )
}
