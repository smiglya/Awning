/**
 * Вся текстовая копия сайта в одном месте.
 *
 * ВНИМАНИЕ: цитата в PROOF и все примеры работ — вымышленные заглушки.
 * Заменить на реальные до публикации.
 */

export const BRAND = 'Awning'

/**
 * The hero line is self-referential on purpose: the animation playing behind it
 * IS the work being sold, so the headline points at it instead of describing it.
 */
export const HERO = {
  line1: 'This is the portfolio.',
  line2: 'It starts at $200.',
  subtitle: 'Motion-led websites for New York business',
  primaryCta: 'Start my site',
  secondaryCta: 'See the motion work',
  tags: ['Motion, not templates', 'From $200 flat', 'Design to servers'],
  navCta: 'Get a price',
}

/** Ticker strip. Kept to facts that are literally true of the offer. */
export const MARQUEE = [
  'Motion written in house',
  'Live in 1–2 days',
  'Flat $200–900',
  'Servers in the USA and Spain',
  'All five boroughs',
  'You own every login',
  'No monthly fee',
  'One team, no handoffs',
]

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

export const FULL_CYCLE = {
  h2: 'One team from brief to server.',
  sub: 'Design, motion, build, content, deployment and the server it runs on. Nothing is handed to a third party.',
  cta: 'Talk about scope',
  note: 'Full-cycle work is scoped and priced separately from the $200–900 site tiers.',
  stages: [
    {
      title: 'The first call',
      owned: 'We take the brief',
      body: 'You tell us what the business does and what the site has to do. We come back with scope and a price for it.',
    },
    {
      title: 'Design in the open',
      owned: 'We design it',
      body: 'Layouts and type first, in a link you can click through. You see the real thing early and say what is wrong.',
    },
    {
      title: 'Motion, made here',
      owned: 'We animate it',
      body: 'Animation drawn for your site, not pulled from a library. The hero on this page is our own work.',
    },
    {
      title: 'The build',
      owned: 'We build it',
      body: 'Front end, forms, admin panel, whatever the site needs to run. Written by the same people who designed it.',
    },
    {
      title: 'Content and setup',
      owned: 'We load the content',
      body: 'We write and load the copy, size the photos, wire up the forms, then check it on real phones.',
    },
    {
      title: 'Live on your server',
      owned: 'We provision it',
      body: 'We deploy it and provision a dedicated server in the USA or Spain. Every login comes to you, the server included.',
    },
  ],
}

export const SERVERS = {
  h2: 'Your own server, in the US or Spain.',
  sub: 'Separate from the $200–900 sites. We spec the machine around the project and price it once the scope is clear.',
  cta: 'Talk about scope',
  locations: [
    {
      label: 'United States',
      region: 'North America',
      blurb:
        'Right when your customers and your data both stay in the US. Shortest hop from New York.',
    },
    {
      label: 'Spain',
      region: 'Europe, EU',
      blurb: 'For a business serving Europe, or when the data has to stay inside the EU.',
    },
  ],
  facts: [
    { label: 'Hardware', value: 'Dedicated, not shared' },
    { label: 'Access', value: 'Root, not a dashboard' },
    { label: 'Setup and deploy', value: 'We handle both' },
    { label: 'Platform lock-in', value: 'None' },
  ],
}

export const TRUST_STRIP = [
  { value: '$200–900', label: 'flat, one-time' },
  { value: '1–2 days', label: 'start to live' },
  { value: '$0', label: 'monthly fees' },
  { value: '5', label: 'boroughs covered' },
]

export const POSITIONING = {
  h2: 'The price is on the page.',
  body: 'No meeting needed to hear a number. You send hours, photos and prices; we send back a finished site, usually the next day. We build in New York only, so we know what a Saturday line looks like.',
}

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
    body: 'Your pages can run in English, Spanish or both, at no extra charge. Same site, same price, two sets of customers.',
  },
]

export const HOW_IT_WORKS = [
  {
    title: 'Send us the basics',
    body: 'Hours, address, services, a few photos of the shop. Ten minutes on the phone.',
  },
  {
    title: 'We build it',
    body: 'Next day you get a link to the real site, not a picture of one. Tell us what to fix, we fix it.',
  },
  {
    title: 'You get the keys',
    body: 'Domain, logins, files, all in your name. No monthly bill after.',
  },
]

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

export const PRICING = {
  h2: 'Three prices. Pick one.',
  sub: 'One payment. No monthly fee, no license, no renewal.',
  tiers: [
    {
      name: 'One page',
      price: '$200',
      forWho: 'For a shop that just needs to be findable',
      includes: [
        'Everything on one page',
        'Hours, address, tap to call',
        'Google profile set up',
        'Live in one day',
      ],
      cta: 'Start the $200 page',
      featured: false,
    },
    {
      name: 'Five pages',
      price: '$500',
      forWho: 'For most restaurants, salons and trades',
      includes: [
        'Up to five pages',
        'Menu or service list with prices',
        'Photo gallery and contact form',
        'Live in two days',
      ],
      cta: 'Start the $500 build',
      featured: true,
    },
    {
      name: 'Everything',
      price: '$900',
      forWho: 'For booking, long menus or two locations',
      includes: [
        'Up to ten pages',
        'Booking or ordering links',
        'Live in two days',
        'Two weeks of small fixes',
      ],
      cta: 'Start the $900 build',
      featured: false,
    },
  ],
}

export const SPECS = {
  h2: 'The details, unrounded.',
  rows: [
    { label: 'Price', value: '$200–900, paid once' },
    { label: 'Turnaround', value: '1–2 days once we have your content' },
    { label: 'Payment', value: 'Half to start, half at launch' },
    { label: 'Revisions', value: 'Two rounds, included' },
    { label: 'Copy', value: 'We draft it, you correct it' },
    { label: 'Languages', value: 'English, Spanish, or both' },
    { label: 'Google profile', value: 'Set up or cleaned up' },
    { label: 'Hosting', value: 'Roughly $0–15 a month, paid to the host' },
    { label: 'Who owns the site', value: 'You do' },
    { label: 'Search rankings', value: 'Not something we promise' },
  ],
}

export const OWNER_SECTION = {
  h2: 'What we need from you.',
  body: 'Three things, and none of them take an afternoon: your hours, about ten photos, and what you charge. Send a logo if you have one. If you do not, we use your name as the logo.',
  links: ['Photo checklist', 'What to send us', 'Start a text thread'],
}

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
  line: 'Flat $200–900. Live in two days.',
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
  legal: '© 2026 Awning · Privacy · Terms · New York City',
}
