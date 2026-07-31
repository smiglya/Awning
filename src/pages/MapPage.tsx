import SiteNav from '../components/SiteNav'
import Footer from '../components/Footer'
import ClientMap from '../components/ClientMap'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { useChat } from '../components/ChatWidget'
import { Link } from '../router'
import { MAP_PAGE } from '../data/copy'
import './MapPage.css'

export default function MapPage() {
  const { open: openChat } = useChat()

  return (
    <>
      <SiteNav />

      <main className="map-page">
        <div className="container">
          <div className="map-head">
            <Link className="map-back" to="/">
              ← {MAP_PAGE.backLabel}
            </Link>
            <h1 className="map-h1">{MAP_PAGE.h1}</h1>
            <p className="map-sub">{MAP_PAGE.sub}</p>
            <button
              className="pill pill-cta map-head-cta"
              type="button"
              onClick={openChat}
            >
              {MAP_PAGE.cta}
            </button>
          </div>

          {/* the map is the most failure-prone thing on the page; a crash
              here must not take the header, footer and CTA with it */}
          <ErrorBoundary label="map" variant="inline">
            <ClientMap />
          </ErrorBoundary>
        </div>
      </main>

      <Footer />
    </>
  )
}
