/**
 * Every word on the site, in one file.
 *
 * Prices are the single source of truth: §9 of the brief, and nothing may quote
 * a number that is not here. Each add-on carries the hours it actually takes,
 * because the price is those hours at one blended rate — $48/h — and publishing
 * the hours beside the price is the thing no competitor in this range does.
 *
 * Three rules this file exists to keep, and they outrank any selling trick:
 *
 *   1. No invented reviews, clients or counts. The sample quote below is
 *      labelled a sample and the portfolio says its photos are placeholders.
 *      Marking up fabricated reviews is a manual-action risk at Google and an
 *      FTC problem in the US, which is why seo.ts emits no Review or
 *      AggregateRating either.
 *   2. No claim of being physically in New York. The team is remote; the market
 *      is New York. The FAQ answers it outright rather than hoping nobody asks.
 *   3. No promise of search rankings. The specs table still says so in as many
 *      words.
 */

export const BRAND = 'Awning'

/** What every price on this page is derived from. Hours × rate, no rounding up. */
export const HOURLY_RATE = 48

/* ------------------------------------------------------------------- hero */

export const HERO = {
  line1: 'The price is on the page.',
  line2: 'It starts at $999.',
  subtitle: 'Motion-led websites for New York local business',
  lede: 'Live 48 hours after we take the brief. One payment, no monthly fee, every login in your name.',
  primaryCta: 'Start my site',
  secondaryCta: 'See the motion work',
  tags: ['Live in 48 hours', '$999 flat', 'Every login yours'],
  navCta: 'Get a price',
}

/** Ticker strip. Every item is literally true of the offer as priced. */
export const MARQUEE = [
  'Motion written in house',
  'Live in 48 hours',
  '$999 flat',
  'Human copy, not a language model',
  'All five boroughs',
  'You own every login',
  'Nothing monthly',
]

export const TRUST_STRIP = [
  { value: '$999', label: 'flat, one-time' },
  { value: '48 hours', label: 'brief to live' },
  { value: '$0', label: 'monthly fees' },
  { value: '5', label: 'boroughs covered' },
]

/* ------------------------------------------- what it costs, and why (dark) */

/**
 * The one dark section on the page, and the argument the $1,795 rests on until
 * there are paid cases with measured calls to rest on instead.
 */
export const COSTS = {
  h2: 'What this costs, and why it costs that.',
  paras: [
    'Most New York agencies quote three to fifteen thousand dollars and six weeks. Six weeks is forty-two days of calls going to the shop down the block.',
    'We are six people: two senior engineers and four designers, all working remotely. No office on Lexington. No account manager sitting between you and the person building your site. That is the entire reason a seven-page build is $1,795 here and $4,500 at an agency with a lobby.',
    'Four designers out of six is also why the animation on this page is ours, and why every icon on this site was drawn a square at a time. Nobody else in this price range makes their own.',
  ],
}

/* --------------------------------------------------------------- why us */

export const WHY_US = [
  {
    title: 'Built to be found',
    body: 'Real pages, real text, your address and hours where Google and Yelp can read them.',
  },
  {
    title: 'Nothing monthly',
    body: 'You pay once. No subscription, no license, no fee next year to keep your own site online.',
  },
  {
    title: 'We do the writing',
    body: 'You do not have to write anything. Tell us what you do and we draft the text. You read it and correct what is wrong.',
  },
  {
    title: 'Two languages',
    body: 'Your pages can run in English, Spanish or both. Same site, two sets of customers.',
  },
]

/* ------------------------------------------------------------- showcase */

export const SHOWCASE = {
  h2: 'Motion we wrote, not motion we bought.',
  sub: 'Four tiles running live in your browser, not screen recordings. Hover any of them. How far this goes on your own site depends on the build.',
  cta: 'Talk about custom work',
  demos: [
    {
      key: 'magnet',
      name: 'Magnetic button',
      caption:
        'The call button leans toward the cursor. It feels like it wants to be pressed.',
    },
    {
      key: 'scramble',
      name: 'Text that resolves',
      caption:
        'Your business name lands in scrambled letters, then settles into the real thing.',
    },
    {
      key: 'roller',
      name: 'Rolling number',
      caption:
        'Numbers roll up digit by digit. Same move works on a price list or an order total.',
    },
    {
      key: 'line',
      name: 'Line that draws',
      caption:
        'A hairline draws itself as you scroll past. It is how we move the eye down a page.',
    },
  ],
}

/* -------------------------------------------------------------- pricing */

export interface Tier {
  name: string
  price: string
  /** Digits only, for structured data. Pro+ is a floor, hence `from`. */
  amount: string
  from: boolean
  flag?: string
  forWho: string
  includes: string[]
  /** Add-ons quoted in the card, so the number sits in the same block as the promise. */
  addLine?: string
  cta: string
  /** Exactly one tier may be featured — it carries the page's orange button. */
  featured: boolean
}

export const PRICING = {
  h2: 'Three prices. Pick one.',
  sub: 'One payment. No monthly fee, no license, no renewal.',
  tiers: [
    {
      name: 'Default',
      price: '$999',
      amount: '999',
      from: false,
      forWho: 'For a shop that needs to be findable this week.',
      includes: [
        'Up to 3 pages, written for you',
        'Live 48 hours after we take the brief',
        'Hours, address, tap to call, map pin on the front door',
        'Google Business Profile set up',
        'LocalBusiness schema, so Google and Yelp can read your address and hours',
        'One round of fixes',
        'Every login in your name',
      ],
      addLine: 'Add forms and card payments for $164. Add English and Spanish for $389.',
      cta: 'Start the $999 site',
      featured: false,
    },
    {
      name: 'Pro',
      price: '$1,795',
      amount: '1795',
      from: false,
      flag: 'Most taken',
      forWho:
        'For restaurants, salons and trades that need the site to sell, not just exist.',
      includes: [
        'Up to 7 pages',
        'Motion drawn for your business, not pulled from a library',
        'Built around one action: call, book or order',
        'Four people on it. One week, brief to live',
        'Your brief read within 3 hours, medium priority in the queue',
        'Two rounds of fixes',
        'Everything in Default',
      ],
      addLine: 'Add a page with copy for $184. Add local SEO for $511.50 a month.',
      cta: 'Start the $1,795 build',
      featured: true,
    },
    {
      name: 'Pro+',
      price: 'from $3,379',
      amount: '3379',
      from: true,
      forWho:
        'For anything with moving parts. Bookings, two locations, ordering, a menu that changes daily, a feature nobody else has built yet.',
      includes: [
        'No page limit, because there is no list. You describe it, we scope it and price it before we start',
        'One month, worked in sprints. Calls through the week, so you see it being built and not at the end',
        'Up to six people, dedicated',
        'An LLM auto-responder that answers in your voice, $250–550',
      ],
      cta: 'Book the scoping call',
      featured: false,
    },
  ] satisfies Tier[] as Tier[],
}

/* -------------------------------------------------------------- add-ons */

export interface AddOn {
  name: string
  /** Hours we actually spend. Null where the line is a subscription or a multiplier. */
  hours: string | null
  price: string
}

export interface AddOnGroup {
  key: string
  head: string
  items: AddOn[]
}

/**
 * Published in full, with hours, because nobody else publishes them at all.
 * A line without a number would undo the point of the section, so there is no
 * "price on request" here and there must never be one.
 */
export const ADDONS = {
  h2: 'Everything else, with a number next to it.',
  sub: 'Nobody in this business publishes add-on prices. You call, you describe what you want, and a number comes back a week later. We put ours on the page so you can add up your own quote before you talk to anybody.',
  note: 'Hours next to each line are the hours we actually spend. The price is those hours at our rate. If a line takes us longer than we said, that is our problem, not your invoice.',
  hoursLabel: 'Hours',
  priceLabel: 'Price',
  groups: [
    {
      key: 'design',
      head: 'Design and brand',
      items: [
        {
          name: 'Logo and mini brand kit: mark, palette, typography',
          hours: '12',
          price: '$576',
        },
        {
          name: 'Full brand guide, plus mockups of the awning, the menu and window stickers',
          hours: '20',
          price: '$959',
        },
        {
          name: 'Photo editing and retouching, up to 25 shots',
          hours: '8',
          price: '$389',
        },
        { name: 'Custom icon or illustration set, 8 pieces', hours: '10', price: '$479' },
        {
          name: 'Pixel-art set drawn for your brand, 8 icons',
          hours: '10',
          price: '$479',
        },
        { name: 'Hero animation drawn for your business', hours: '8', price: '$389' },
        { name: 'Extended motion: one scene per page', hours: '16', price: '$767' },
        { name: 'An extra page, written for you', hours: '3.8', price: '$184' },
      ],
    },
    {
      key: 'features',
      head: 'Features',
      items: [
        {
          name: 'Online table booking or appointments, with the integration',
          hours: '12',
          price: '$576',
        },
        { name: 'A menu or catalogue you edit yourself', hours: '14', price: '$671' },
        { name: 'Taking deposits and prepayments', hours: '8', price: '$389' },
        {
          name: 'POS or delivery integration: Square, Toast, Clover',
          hours: '16',
          price: '$767',
        },
        {
          name: 'Email and SMS automation: welcome, review request, win-back',
          hours: '10',
          price: '$479',
        },
        { name: 'A second location on the same site', hours: '10', price: '$479' },
        { name: 'Map and lead intake wired up', hours: '3.4', price: '$164' },
        { name: 'English and Spanish', hours: '8.1', price: '$389' },
        {
          name: 'A third language beyond English and Spanish',
          hours: '8',
          price: '$389',
        },
        {
          name: 'Auto-responder: an LLM answering in your business voice',
          hours: '5–11.5',
          price: '$250–550',
        },
      ],
    },
    {
      key: 'found',
      head: 'Getting found',
      items: [
        {
          name: 'Google Business Profile: set up, or cleaned up',
          hours: '5',
          price: '$239',
        },
        {
          name: 'Neighbourhood pages and LocalBusiness schema, 3 areas',
          hours: '10',
          price: '$479',
        },
        {
          name: 'Speed package: Core Web Vitals into the green',
          hours: '8',
          price: '$389',
        },
        { name: 'Local SEO retainer', hours: '10.7 a month', price: '$511.50 a month' },
        {
          name: 'Analytics, and a monthly report on calls and leads',
          hours: '4 a month',
          price: '$199 a month',
        },
      ],
    },
    {
      key: 'after',
      head: 'After launch',
      items: [
        /**
         * One care plan per build tier, and the hours are what you are buying.
         *
         * They replaced a two-plan scheme at $99 and $199. Keeping both would
         * have put five overlapping subscriptions on the page and quoted $199
         * twice for different work, which is the fastest way to make a price
         * list stop being believed.
         *
         * The hours divide by the same $48 as everything else — 4.1, 7.9 and 15
         * — so a client can check the arithmetic on a retainer the same way
         * they check it on a one-off. Nobody else in this range publishes that.
         */
        {
          name: 'Care Plan Default: hosting, backups, security updates, small edits',
          hours: '4.1 a month',
          price: '$199 a month',
        },
        {
          name: 'Care Plan Pro: everything in Default, priority queue, content and photo updates',
          hours: '7.9 a month',
          price: '$379 a month',
        },
        {
          name: 'Care Plan Pro+: everything in Pro, same-day edits, motion and feature work',
          hours: '15 a month',
          price: '$720 a month',
        },
        {
          name: 'Moving and redesigning the site you already have',
          hours: '12',
          price: '$576',
        },
        {
          name: 'Accessibility to WCAG 2.2 AA: audit and fixes',
          hours: '12',
          price: '$576',
        },
        { name: 'Legal pages: privacy, terms, ADA statement', hours: '4', price: '$199' },
        {
          name: 'Training you on it, plus a video walkthrough',
          hours: '3',
          price: '$149',
        },
      ],
    },
    {
      key: 'speed',
      head: 'Speed',
      items: [
        {
          name: 'Live in 24 hours instead of 48, brief read within the hour',
          hours: null,
          price: '+35% on the tier',
        },
      ],
    },
  ] satisfies AddOnGroup[] as AddOnGroup[],
}

/* ------------------------------------------------------------ risk, process */

export const RISK = {
  h2: 'You approve the design before you pay the rest.',
  body: 'Half to start, half at launch, and the second half only after you have clicked through the real site and told us what to fix. No proposal, no deposit for a meeting, no invoice for the discovery phase.',
}

export const PROCESS = {
  h2: 'Five steps, and you hold the keys at the end.',
  /** Step 5 is the one that gets the pixel key — see IconKey. */
  steps: [
    {
      title: 'You send the basics.',
      body: 'Hours, address, services, prices, a few photos of the shop. Ten minutes on the phone.',
    },
    {
      title: 'We read the brief within three hours.',
      body: 'You get the scope and the start date. Nothing is billed yet.',
    },
    {
      title: 'We build it.',
      body: 'Default: 48 hours. Pro: one week, four people. Pro+: a month in sprints, with calls through the week.',
    },
    {
      title: 'You get a link to the real site.',
      body: 'Not a picture of one. Tell us what is wrong, we fix it.',
    },
    {
      title: 'You get the keys.',
      body: 'Domain, logins, files, the server. All in your name. No monthly bill unless you ask for one.',
    },
  ],
}

/* ------------------------------------------------------------------- faq */

export const FAQ = {
  h2: 'The questions people actually ask.',
  items: [
    {
      q: 'Is this a template?',
      a: 'No. The layout, the type and the animation are drawn for your business. We do not sell industry templates with your logo dropped in.',
    },
    {
      q: 'Who writes the text?',
      a: 'A person does. You have seen the sites where every sentence has three adjectives and no facts — that is a language model with no brief. You tell us what you do, we draft it, you correct what is wrong.',
    },
    {
      q: 'Are you in New York?',
      a: 'No. We are a remote team, and we only build for New York — the boroughs, the trades, the neighbourhood search that decides who gets the call. That is why the price is what it is. If you want somebody to shake your hand in person, we are the wrong shop and we will say so on the first call.',
    },
    {
      q: 'Do I own it?',
      a: 'Yes. Code, domain, logins, server. Everything in your name, on day one, whether or not you keep working with us.',
    },
    {
      q: 'Will there be a monthly bill?',
      a: 'Only if you choose one. Hosting runs roughly $0–15 a month, paid to the host, not to us. Care Plans start at $199 a month and every one of them is optional — plenty of clients host it themselves and pay us nothing after launch.',
    },
    {
      q: 'Will I be number one on Google?',
      a: 'Nobody can promise that, and anybody who does is selling you something else. What we do is put your address, hours and services where Google and Yelp can read them, set up your Business Profile, and build the pages that local searches actually land on.',
    },
    {
      q: 'What if I need it faster than 48 hours?',
      a: '24 hours, brief read within one hour, plus 35% on the tier. We will tell you on the call whether your project actually fits in a day — some do not, and taking your money for a deadline we will miss is not worth $350 to us.',
    },
    {
      q: 'What if I already have a site?',
      a: '$576 to move and redesign it. If the old one is fine and just needs speed, that is the $389 Core Web Vitals package and we will say so instead of selling you a rebuild.',
    },
  ],
}

/* -------------------------------------------------------- proof, portfolio */

export const PROOF = {
  quote:
    '“He sent the price in a text. No meeting, no proposal. The site was up Thursday.”',
  attribution: 'Sample quote. Barbershop owner, Bushwick',
}

export const PORTFOLIO = {
  h2: 'Sample builds.',
  sub: 'One per neighborhood. Photos are placeholders until the real ones land.',
  cta: 'Start one like these',
  mapCta: 'See all five boroughs',
}

/* ----------------------------------------------------------------- specs */

export const SPECS = {
  h2: 'The details, unrounded.',
  rows: [
    { label: 'Price', value: '$999 to $3,379, paid once' },
    {
      label: 'Turnaround',
      value: '48 hours on Default, one week on Pro, a month on Pro+',
    },
    { label: 'Payment', value: 'Half to start, half at launch' },
    { label: 'Revisions', value: 'One round on Default, two on Pro, by sprint on Pro+' },
    { label: 'Copy', value: 'A person drafts it, you correct it' },
    { label: 'Languages', value: 'English, Spanish, or both' },
    { label: 'Google profile', value: 'Set up or cleaned up' },
    { label: 'Hosting', value: 'Roughly $0–15 a month, paid to the host' },
    { label: 'Who owns the site', value: 'You do' },
    { label: 'Search rankings', value: 'Not something we promise' },
  ],
}

/* ----------------------------------------------------------------- owner */

export const OWNER_SECTION = {
  h2: 'What we need from you.',
  body: 'Three things, and none of them take an afternoon: your hours, about ten photos, and what you charge. Send a logo if you have one. If you do not, that is the $576 brand kit, and we will say so rather than quietly using your name in a typeface.',
  links: ['Photo checklist', 'What to send us', 'Start a text thread'],
}

/* ------------------------------------------------------------- final cta */

export const FINAL_CTA = {
  h2: 'Pick a price. Go live.',
  sub: 'Tell us the trade and the block. You get a price and a start date before you commit to anything.',
  primary: 'Start my site',
  secondary: 'See sample sites',
}

export const MAP_PAGE = {
  h1: 'Every borough, same price.',
  sub: 'Sample builds, one pin each. Tottenville or Tribeca, it is the same number.',
  backLabel: 'Back to home',
  cta: 'Get a price for my block',
}

export const STICKY_CTA = {
  line: '$999 flat. Live in 48 hours.',
  button: 'Start my site',
}

export const FOOTER = {
  newsletterLine: 'One email a month. New work, real prices.',
  emailPlaceholder: 'Email address',
  columns: [
    {
      head: 'Sites',
      links: ['What you get', 'Price list', 'Sample sites', 'Fix an old site'],
    },
    {
      head: 'Trades',
      links: ['Restaurants', 'Barbershops', 'Contractors', 'Salons and spas'],
    },
    {
      head: 'Boroughs',
      links: ['Brooklyn', 'Queens', 'Manhattan', 'Coverage map'],
    },
    {
      head: 'Studio',
      links: ['About', 'Contact', 'Plain terms', 'Privacy'],
    },
  ],
  legal: '© 2026 Awning · Privacy · Terms · Built for New York City',
}
