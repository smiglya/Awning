import { motion } from 'motion/react'
import { Link } from '../router'
import { useChat } from './ChatWidget'
import Marquee from './Marquee'
import { DEMO_COMPONENTS, type DemoKey } from './MotionDemos'
import { reveal, rise, stagger } from './motion-presets'
import { EmptyState, ErrorState, WorkCardSkeleton } from './Skeleton'
import { useProjects } from '../data/useProjects'
import {
  IconBrief,
  IconBuild,
  IconContent,
  IconDraft,
  IconGlobe,
  IconLayout,
  IconMotion,
  IconNoLoop,
  IconPin,
  IconRadar,
  IconServer,
  IconTwoTongues,
} from './icons'
import {
  FINAL_CTA,
  FULL_CYCLE,
  HOW_IT_WORKS,
  MARQUEE,
  OWNER_SECTION,
  PORTFOLIO,
  POSITIONING,
  PRICING,
  PROOF,
  SERVERS,
  SHOWCASE,
  SPECS,
  TRUST_STRIP,
  WHY_US,
} from '../data/copy'
import './Body.css'

const WHY_ICONS = [IconRadar, IconNoLoop, IconDraft, IconTwoTongues]
const STAGE_ICONS = [
  IconBrief,
  IconLayout,
  IconMotion,
  IconBuild,
  IconContent,
  IconServer,
]

/* ------------------------------------------------------------ 1. trust strip */

function TrustStrip() {
  return (
    <section className="stat-strip">
      <div className="container">
        <motion.div className="stat-row" {...stagger(0.07)}>
          {TRUST_STRIP.map((item) => (
            <motion.div className="stat" key={item.label} {...rise(14)}>
              <div className="stat-value">{item.value}</div>
              <div className="stat-label">{item.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------ 2. positioning */

function Positioning() {
  return (
    <section className="section">
      <div className="container">
        <div className="grid">
          <div className="col-9">
            <motion.h2 className="h2" {...reveal(0, 26)}>
              {POSITIONING.h2}
            </motion.h2>
            <motion.p className="lede" {...reveal(0.12, 20)}>
              {POSITIONING.body}
            </motion.p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------- 3. motion showcase */

function MotionShowcase() {
  const { open: openChat } = useChat()

  return (
    <section className="section section-showcase" id="motion">
      <div className="container">
        <motion.h2 className="h2" {...reveal(0, 26)}>
          {SHOWCASE.h2}
        </motion.h2>
        <motion.p className="lede" {...reveal(0.1, 20)}>
          {SHOWCASE.sub}
        </motion.p>

        <motion.div className="demo-grid" {...stagger(0.1)}>
          {SHOWCASE.demos.map((demo) => {
            const Demo = DEMO_COMPONENTS[demo.key as DemoKey]
            return (
              <motion.article className="demo-card" key={demo.key} {...rise(28)}>
                <Demo />
                <h3 className="demo-name">{demo.name}</h3>
                <p className="demo-caption">{demo.caption}</p>
              </motion.article>
            )
          })}
        </motion.div>

        <motion.div className="work-cta" {...reveal(0.1, 16)}>
          <button className="pill pill-outline" type="button" onClick={openChat}>
            {SHOWCASE.cta}
          </button>
        </motion.div>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------- 4. why us */

function WhyUs() {
  return (
    <section className="section">
      <div className="container">
        <motion.div className="card-grid" {...stagger(0.09)}>
          {WHY_US.map((card, i) => {
            const Icon = WHY_ICONS[i] ?? IconRadar
            return (
              <motion.article className="card" key={card.title} {...rise(26)}>
                <span className="card-icon">
                  <Icon size={22} />
                </span>
                <h3 className="card-title">{card.title}</h3>
                <p className="card-body">{card.body}</p>
              </motion.article>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------- 5. how it works */

function HowItWorks() {
  return (
    <section className="section">
      <div className="container">
        <motion.div className="steps" {...stagger(0.12)}>
          {HOW_IT_WORKS.map((step, i) => (
            <motion.div className="step" key={step.title} {...rise(22)}>
              <div className="step-n">{`0${i + 1}`}</div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-body">{step.body}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ 6. proof */

function Proof() {
  return (
    <section className="section">
      {/* No logo wall here on purpose: with no real client marks, five grey
          placeholders in a hairline layout just read as broken images. */}
      <div className="container">
        <motion.figure className="quote quote-solo" {...reveal(0, 24)}>
          <blockquote className="quote-text">{PROOF.quote}</blockquote>
          <figcaption className="quote-by">{PROOF.attribution}</figcaption>
        </motion.figure>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- 7. portfolio */

const PORTFOLIO_COUNT = 6

function Portfolio() {
  const { open: openChat } = useChat()
  const { state, retry } = useProjects()

  return (
    <section className="section" id="work">
      <div className="container">
        <motion.h2 className="h2" {...reveal(0, 26)}>
          {PORTFOLIO.h2}
        </motion.h2>
        <motion.p className="lede" {...reveal(0.1, 20)}>
          {PORTFOLIO.sub}
        </motion.p>

        {state.status === 'loading' && (
          <div className="work-grid">
            {Array.from({ length: PORTFOLIO_COUNT }, (_, i) => (
              <WorkCardSkeleton key={i} />
            ))}
          </div>
        )}

        {state.status === 'error' && (
          <ErrorState message={state.message} onRetry={retry} />
        )}

        {state.status === 'ready' && state.projects.length === 0 && (
          <EmptyState message="No builds to show yet. The first ones go up here." />
        )}

        {state.status === 'ready' && state.projects.length > 0 && (
          <motion.div className="work-grid" {...stagger(0.08)}>
            {state.projects.slice(0, PORTFOLIO_COUNT).map((item) => (
              <motion.article className="work-card" key={item.id} {...rise(28)}>
                <div className="ph work-shot">
                  <span className="ph-label">Photo — {item.client}</span>
                </div>

                <div className="work-body">
                  <div className="work-head">
                    <h3 className="work-title">{item.client}</h3>
                    <span className="work-price">{item.price}</span>
                  </div>
                  <p className="work-meta">
                    <IconPin size={13} className="work-pin" />
                    {item.neighbourhood}, {item.borough} · {item.category} · {item.days}
                  </p>
                  <p className="work-blurb">{item.blurb}</p>
                </div>
              </motion.article>
            ))}
          </motion.div>
        )}

        <motion.div className="work-cta" {...reveal(0.08, 16)}>
          <button className="pill pill-fill" type="button" onClick={openChat}>
            {PORTFOLIO.cta}
          </button>
          <Link className="pill pill-outline" to="/work-map">
            {PORTFOLIO.mapCta}
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------- 8. pricing */

function Pricing() {
  const { open: openChat } = useChat()

  return (
    <section className="section" id="pricing">
      <div className="container">
        <motion.h2 className="h2" {...reveal(0, 26)}>
          {PRICING.h2}
        </motion.h2>
        <motion.p className="lede" {...reveal(0.1, 20)}>
          {PRICING.sub}
        </motion.p>

        <motion.div className="tier-grid" {...stagger(0.1)}>
          {PRICING.tiers.map((tier) => (
            <motion.article
              className={`tier${tier.featured ? ' tier-featured' : ''}`}
              key={tier.name}
              {...rise(30)}
            >
              {tier.featured && <span className="tier-flag">Most taken</span>}

              <h3 className="tier-name">{tier.name}</h3>
              <div className="tier-price">{tier.price}</div>
              <p className="tier-for">{tier.forWho}</p>

              <ul className="tier-list">
                {tier.includes.map((line) => (
                  <li className="tier-item" key={line}>
                    {line}
                  </li>
                ))}
              </ul>

              <button
                className={`pill tier-cta ${
                  tier.featured ? 'pill-fill' : 'pill-outline'
                }`}
                type="button"
                onClick={openChat}
              >
                {tier.cta}
              </button>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------- 9. full cycle */

function FullCycle() {
  const { open: openChat } = useChat()

  return (
    <section className="section" id="cycle">
      <div className="container">
        <motion.h2 className="h2" {...reveal(0, 26)}>
          {FULL_CYCLE.h2}
        </motion.h2>
        <motion.p className="lede" {...reveal(0.1, 20)}>
          {FULL_CYCLE.sub}
        </motion.p>

        <motion.ol className="cycle" {...stagger(0.09)}>
          {FULL_CYCLE.stages.map((stage, i) => {
            const Icon = STAGE_ICONS[i] ?? IconBrief
            return (
              <motion.li className="cycle-row" key={stage.title} {...rise(22)}>
                <span className="cycle-index">{`0${i + 1}`}</span>
                <span className="cycle-icon">
                  <Icon size={20} />
                </span>
                <div className="cycle-text">
                  <h3 className="cycle-title">{stage.title}</h3>
                  <p className="cycle-body">{stage.body}</p>
                </div>
                <span className="cycle-owned">{stage.owned}</span>
              </motion.li>
            )
          })}
        </motion.ol>

        <motion.div className="cycle-foot" {...reveal(0.06, 16)}>
          <button className="pill pill-outline" type="button" onClick={openChat}>
            {FULL_CYCLE.cta}
          </button>
          <p className="cycle-note">{FULL_CYCLE.note}</p>
        </motion.div>
      </div>
    </section>
  )
}

/* ------------------------------------------------- 10. servers (dark band) */

function Servers() {
  const { open: openChat } = useChat()

  return (
    <section className="section section-dark" id="servers">
      <div className="container">
        <div className="grid servers-grid">
          <div className="col-6">
            <motion.h2 className="h2 h2-dark" {...reveal(0, 26)}>
              {SERVERS.h2}
            </motion.h2>
            <motion.p className="lede lede-dark" {...reveal(0.1, 20)}>
              {SERVERS.sub}
            </motion.p>

            <motion.div className="server-facts" {...stagger(0.07)}>
              {SERVERS.facts.map((fact) => (
                <motion.div className="server-fact" key={fact.label} {...rise(14)}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </motion.div>
              ))}
            </motion.div>

            <motion.div {...reveal(0.1, 16)}>
              <button
                className="pill pill-invert servers-cta"
                type="button"
                onClick={openChat}
              >
                {SERVERS.cta}
              </button>
            </motion.div>
          </div>

          <motion.div className="col-5 col-start-8" {...stagger(0.12)}>
            {SERVERS.locations.map((loc, i) => (
              <motion.article className="server-card" key={loc.label} {...rise(26)}>
                <span className="server-card-mark">
                  {i === 0 ? <IconPin size={20} /> : <IconGlobe size={20} />}
                </span>
                <div className="server-card-head">
                  <h3 className="server-card-title">{loc.label}</h3>
                  <span className="server-card-region">{loc.region}</span>
                </div>
                <p className="server-card-blurb">{loc.blurb}</p>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ----------------------------------------------------------------- 11. specs */

function Specs() {
  return (
    <section className="section" id="details">
      <div className="container">
        <motion.h2 className="h2 specs-heading" {...reveal(0, 26)}>
          {SPECS.h2}
        </motion.h2>
        <motion.dl className="specs" {...stagger(0.04)}>
          {SPECS.rows.map((row) => (
            <motion.div className="spec-row" key={row.label} {...rise(12, 0.6)}>
              <dt className="spec-label">{row.label}</dt>
              <dd className="spec-value">{row.value}</dd>
            </motion.div>
          ))}
        </motion.dl>
      </div>
    </section>
  )
}

/* --------------------------------------------------------------- 12. owner */

function OwnerSection() {
  const { open: openChat } = useChat()

  return (
    <section className="section">
      <div className="container">
        <div className="grid owner-grid">
          <div className="col-5">
            <motion.h2 className="h2" {...reveal(0, 26)}>
              {OWNER_SECTION.h2}
            </motion.h2>
            <motion.p className="lede" {...reveal(0.1, 20)}>
              {OWNER_SECTION.body}
            </motion.p>
            <motion.ul className="owner-links" {...stagger(0.08)}>
              {OWNER_SECTION.links.map((link) => (
                <motion.li key={link} {...rise(14)}>
                  <button className="owner-link" type="button" onClick={openChat}>
                    {link}
                  </button>
                </motion.li>
              ))}
            </motion.ul>
          </div>
          <motion.div className="col-6 col-start-7" {...reveal(0.12, 28)}>
            <div className="ph owner-shot">
              <span className="ph-label">Screenshot — what we send back</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------ 13. final cta */

function FinalCta() {
  const { open: openChat } = useChat()

  return (
    <section className="section section-cta">
      <div className="cta-ghost" aria-hidden="true">
        <span className="cta-ghost-label">Photo — recent build</span>
      </div>
      <div className="container cta-inner">
        <motion.h2 className="h2-xl" {...reveal(0, 28)}>
          {FINAL_CTA.h2}
        </motion.h2>
        <motion.p className="cta-sub" {...reveal(0.1, 20)}>
          {FINAL_CTA.sub}
        </motion.p>
        <motion.div className="cta-pills" {...reveal(0.18, 16)}>
          <button className="pill pill-fill" type="button" onClick={openChat}>
            {FINAL_CTA.primary}
          </button>
          <Link className="pill pill-outline" to="/work-map">
            {FINAL_CTA.secondary}
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------- body */

export default function Body() {
  return (
    <main className="body">
      <Marquee items={MARQUEE} />
      <TrustStrip />
      <Positioning />
      <MotionShowcase />
      <WhyUs />
      <HowItWorks />
      <Proof />
      <Portfolio />
      <Pricing />
      <FullCycle />
      <Servers />
      <Specs />
      <OwnerSection />
      <FinalCta />
    </main>
  )
}
