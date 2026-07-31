import { motion } from 'motion/react'
import { Link } from '../router'
import { useChat } from './ChatWidget'
import Marquee from './Marquee'
import PixelFire from './PixelFire'
import { DEMO_COMPONENTS, type DemoKey } from './MotionDemos'
import { reveal, rise, stagger } from './motion-presets'
import { EmptyState, ErrorState, WorkCardSkeleton } from './Skeleton'
import { useProjects } from '../data/useProjects'
import {
  IconBolt,
  IconGear,
  IconGlass,
  IconKey,
  IconNib,
  IconNoCalendar,
  IconPin,
  IconStar,
  IconTwoTongues,
  IconWrench,
  IconWriting,
  type IconProps,
} from './icons'
import {
  ADDONS,
  COSTS,
  FAQ,
  FINAL_CTA,
  MARQUEE,
  OWNER_SECTION,
  PORTFOLIO,
  PRICING,
  PROCESS,
  PROOF,
  RISK,
  SHOWCASE,
  SPECS,
  TRUST_STRIP,
  WHY_US,
} from '../data/copy'
import './Body.css'

const WHY_ICONS = [IconPin, IconNoCalendar, IconWriting, IconTwoTongues]

/** Keyed by group, so reordering the price list cannot silently reshuffle icons. */
const ADDON_ICONS: Record<string, (props: IconProps) => React.ReactElement> = {
  design: IconNib,
  features: IconGear,
  found: IconGlass,
  after: IconWrench,
  speed: IconBolt,
}

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

/* ---------------------------------------------------------------- 2. why us */

function WhyUs() {
  return (
    <section className="section">
      <div className="container">
        <motion.div className="card-grid" {...stagger(0.09)}>
          {WHY_US.map((card, i) => {
            const Icon = WHY_ICONS[i] ?? IconPin
            return (
              <motion.article className="card" key={card.title} {...rise(26)}>
                <span className="card-icon">
                  <Icon size={32} />
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

/* ---------------------------------------------------------------- 4. pricing */

/**
 * Pro carries the only filled button on the page's middle, and the only orange
 * one among the three. The middle tier is what sells, and it sells because the
 * dearest option is standing to the right of it — so Default and Pro+ get
 * outline buttons and stay out of the way.
 */
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
              {tier.flag && (
                <span className="tier-flag">
                  <IconStar size={16} accent />
                  {tier.flag}
                </span>
              )}

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

              {tier.addLine && <p className="tier-add">{tier.addLine}</p>}

              <button
                className={`pill tier-cta ${tier.featured ? 'pill-cta' : 'pill-outline'}`}
                type="button"
                onClick={openChat}
              >
                {tier.cta}
                {/* only the featured tier: the flame marks the conversion
                    button, and lighting all three would mark nothing */}
                {tier.featured && <PixelFire />}
              </button>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------- 5. add-ons */

/**
 * The differentiator. A real table because it is tabular data — the owner is
 * meant to add up their own quote from it before speaking to anybody, and a
 * screen reader has to be able to say which number belongs to which line.
 */
function AddOns() {
  return (
    <section className="section" id="addons">
      <div className="container">
        <motion.h2 className="h2" {...reveal(0, 26)}>
          {ADDONS.h2}
        </motion.h2>
        <motion.p className="lede" {...reveal(0.1, 20)}>
          {ADDONS.sub}
        </motion.p>

        <div className="addon-groups">
          {ADDONS.groups.map((group) => {
            const Icon = ADDON_ICONS[group.key] ?? IconGear
            return (
              <motion.div className="addon-group" key={group.key} {...reveal(0, 22)}>
                <div className="addon-head">
                  <span className="addon-icon">
                    <Icon size={32} />
                  </span>
                  <h3 className="addon-title">{group.head}</h3>
                </div>

                <table className="addon-table">
                  <caption className="sr-only">{group.head}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Service</th>
                      <th scope="col" className="addon-num">
                        {ADDONS.hoursLabel}
                      </th>
                      <th scope="col" className="addon-num">
                        {ADDONS.priceLabel}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item) => (
                      <tr key={item.name}>
                        <th scope="row" className="addon-name">
                          {item.name}
                        </th>
                        <td className="addon-num addon-hours">{item.hours ?? '—'}</td>
                        <td className="addon-num addon-price">{item.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            )
          })}
        </div>

        <motion.p className="addon-note" {...reveal(0.06, 16)}>
          {ADDONS.note}
        </motion.p>
      </div>
    </section>
  )
}

/* ------------------------------------------------- 6. what it costs (dark) */

function Costs() {
  return (
    <section className="section section-dark" id="why-this-price">
      <div className="container">
        <div className="grid">
          <div className="col-9">
            <motion.h2 className="h2 h2-dark" {...reveal(0, 26)}>
              {COSTS.h2}
            </motion.h2>
            <motion.div className="cost-body" {...stagger(0.08)}>
              {COSTS.paras.map((para) => (
                <motion.p className="cost-para" key={para.slice(0, 32)} {...rise(18)}>
                  {para}
                </motion.p>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------- 7. risk */

function Risk() {
  return (
    <section className="section">
      <div className="container">
        <div className="grid">
          <div className="col-9">
            <motion.h2 className="h2" {...reveal(0, 26)}>
              {RISK.h2}
            </motion.h2>
            <motion.p className="lede" {...reveal(0.12, 20)}>
              {RISK.body}
            </motion.p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------- 8. process */

/**
 * The last step is the one the logo is about, so it gets the pixel key whose
 * bit is the logotype's bit. That rhyme is the reason the icon set exists.
 */
function Process() {
  const last = PROCESS.steps.length - 1

  return (
    <section className="section" id="process">
      <div className="container">
        <motion.h2 className="h2" {...reveal(0, 26)}>
          {PROCESS.h2}
        </motion.h2>

        <motion.ol className="steps" {...stagger(0.09)}>
          {PROCESS.steps.map((step, i) => (
            <motion.li className="step" key={step.title} {...rise(22)}>
              <div className="step-top">
                <span className="step-n">{`0${i + 1}`}</span>
                {i === last && (
                  <span className="step-icon">
                    <IconKey size={32} accent />
                  </span>
                )}
              </div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-body">{step.body}</p>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- 9. portfolio */

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
                    <IconPin size={16} className="work-pin" />
                    {item.neighbourhood}, {item.borough} · {item.category} · {item.days}
                  </p>
                  <p className="work-blurb">{item.blurb}</p>
                </div>
              </motion.article>
            ))}
          </motion.div>
        )}

        <motion.div className="work-cta" {...reveal(0.08, 16)}>
          <button className="pill pill-outline" type="button" onClick={openChat}>
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

/* ----------------------------------------------------------------- 10. proof */

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

/* ------------------------------------------------------------------- 12. faq */

function Faq() {
  return (
    <section className="section" id="faq">
      <div className="container">
        <motion.h2 className="h2 specs-heading" {...reveal(0, 26)}>
          {FAQ.h2}
        </motion.h2>
        <motion.div className="faq" {...stagger(0.05)}>
          {FAQ.items.map((item) => (
            <motion.div className="faq-row" key={item.q} {...rise(16, 0.6)}>
              <h3 className="faq-q">{item.q}</h3>
              <p className="faq-a">{item.a}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

/* --------------------------------------------------------------- 13. owner */

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

/* ------------------------------------------------------------ 14. final cta */

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
          <button className="pill pill-cta" type="button" onClick={openChat}>
            {FINAL_CTA.primary}
            <PixelFire />
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
      <WhyUs />
      <MotionShowcase />
      <Pricing />
      <AddOns />
      <Costs />
      <Risk />
      <Process />
      <Portfolio />
      <Proof />
      <Specs />
      <Faq />
      <OwnerSection />
      <FinalCta />
    </main>
  )
}
