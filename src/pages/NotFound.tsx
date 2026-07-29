import SiteNav from '../components/SiteNav'
import Footer from '../components/Footer'
import { Link } from '../router'
import './NotFound.css'

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
          <h1 className="notfound-title">That page is not here.</h1>
          <p className="notfound-text">
            The link may be old, or the address may have a typo in it. Both routes below
            definitely work.
          </p>
          <div className="notfound-links">
            <Link className="pill pill-fill" to="/">
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
