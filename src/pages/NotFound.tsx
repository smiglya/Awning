import SiteNav from '../components/SiteNav'
import Footer from '../components/Footer'
import Letters from '../components/Letters'
import { Link } from '../router'
import './NotFound.css'

const TITLE = 'That page is not here.'

/**
 * A real 404 rather than the landing page.
 *
 * Rendering the homepage for any unknown path is what produces soft 404s in
 * Search Console: the crawler is told "200, here is content" for an address
 * that does not exist.
 */
export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main className="notfound">
        <div className="container notfound-inner">
          <p className="notfound-code">404</p>
          <h1 className="notfound-title" aria-label={TITLE}>
            <Letters text={TITLE} />
          </h1>
          <p className="notfound-text">
            The link may be old, or the address may have a typo in it. Both routes below
            definitely work.
          </p>
          <div className="notfound-links">
            {/* outline, not the conversion fill: getting out of a dead end is
                recovery, and orange on this site means "pay or ask for a price" */}
            <Link className="pill pill-outline" to="/">
              Back to home
            </Link>
            <Link className="pill pill-outline" to="/work-map">
              See the client map
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
