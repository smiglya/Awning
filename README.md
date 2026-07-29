# Awning

Motion-led marketing site for a web studio selling turnkey websites to local
businesses in New York City. Flat $200–900, live in one to two days.

**Live preview:** https://smiglya.github.io/Awning/

The preview runs on GitHub Pages on purpose — it is a temporary address while the
production server and domain are being set up. Every page is served with
`noindex` so it never competes with the real domain as duplicate content.

## What is real and what is not

This is a design concept with a production-grade frontend. Being precise about
the difference matters, because some of it is deliberately fake:

|                                                       | Status                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------- |
| Layout, motion, copy, responsive behaviour            | Real, final                                                         |
| Frontend engineering (types, tests, SEO, prerender)   | Real, complete                                                      |
| The twelve clients on the map, their logos and quotes | **Invented placeholders**                                           |
| The testimonial                                       | **Labelled a sample on the page**                                   |
| Backend                                               | **Not built.** The HTTP contract is defined; nothing serves it yet  |
| Chat                                                  | Scripted stub. Wired to real endpoints, answers from a local script |
| `hello@awning.nyc`                                    | Placeholder address                                                 |

Nothing on the site claims a review, a rating or a postal address, and there is
no structured data asserting any of the three — marking up invented clients
would be a search penalty and, in the US, an FTC problem. The placeholders are
listed with warnings in `src/data/clients.ts` and must be replaced before the
site goes live commercially.

## Stack

- React 19 + TypeScript 6, strict, `noUncheckedIndexedAccess`
- Vite 6, prerendered to static HTML per route (`vite build --ssr` + `renderToString`)
- `motion` 12 for all animation, honouring `prefers-reduced-motion`
- Plain CSS, no framework
- `valibot` for runtime validation of every API response
- No router dependency — 80-line History API router, so the whole tree carries
  zero known advisories
- Vitest + Testing Library + msw; ESLint 9, Prettier, husky

## Running it

```bash
npm ci
npm run dev          # http://localhost:5173
```

With no `VITE_API_BASE_URL` set the site runs entirely on `localStorage`: leads,
chat threads and the project list all resolve locally. That is a supported mode,
not a fallback — see `.env.example`.

```bash
npm run typecheck
npm run lint
npm run test
npm run build        # generates images, typechecks, prerenders into dist/
npm run preview      # serve dist/
```

## Backend

The frontend is finished against a contract it does not implement.
`src/api/endpoints.ts` is the single source of truth: seven routes, request and
response shapes, idempotency and error semantics. `src/api/schemas.ts` is the
validation the client applies to every response.

LLM credentials belong on the server. The browser bundle is readable by anyone,
so a provider key shipped to the client is a published key; the client only ever
talks to the studio's own routes, and which model answers — or whether a person
does — is the backend's business. The chat discloses which of the three is
replying based on what the server says, never a guess.

## Deploying

Pushing to `main` builds and publishes the Pages preview
(`.github/workflows/deploy-pages.yml`). It sets `VITE_BASE=/Awning/` so the
subdirectory hosting works, and `VITE_NOINDEX=true` so the preview stays out of
search.

For the real server, `nginx.conf` is written and commented: explicit routes
rather than a catch-all rewrite (which would answer 200 for addresses that do
not exist and produce soft 404s), CSP, HSTS, immutable asset caching.
