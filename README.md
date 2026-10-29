# CEYLON — the cinnamon storefront

An original editorial Next.js website for whole Ceylon cinnamon and ground cinnamon. Built with TypeScript, custom CSS, Lenis, and Lucide icons. The original homepage is preserved and extended with a dynamic shop and journal.

## Run locally

Use **Node.js 22.22 or newer**; Node 24 LTS is recommended (`.nvmrc` is included). The maintained HTML sanitizer requires the newer runtime.

```bash
nvm use
npm ci
npm run dev
```

Open http://localhost:3000. With no Shopify configuration, the site runs with two preview products, selectable sample sizes, and four original sample articles. All prices and pack sizes are illustrative. Preview checkout is disabled on both the client and the server.

```bash
npm run typecheck
npm test
npm run build
npm run start
```

**Hosting changed:** this is now a server-backed Next.js application, rather than a static export. Deploy to a host with Next.js server support, such as Vercel, or run `npm run build` followed by `npm run start` on a Node server. The old `out/` folder belongs to the earlier prototype and does not contain the new shop or journal. Do not publish it.

## Phase 2 — Medusa showcase

The `phase-2-medusa-demo` branch adds a real **Medusa 2.22.1** backend and PostgreSQL database while preserving the existing landing page. Medusa is self-hosted open-source software; the local demo needs no Shopify subscription, Medusa Cloud account, Docker, card processor, or email account. Public hosting and production services are separate decisions.

Use **Node 24 LTS** for the embedded database demo. From this repository:

```bash
nvm use
npm ci
npm run backend:install
npm run demo:setup
npm run demo
```

- Storefront: [localhost:3014](http://localhost:3014)
- Medusa Admin: [localhost:9000/app](http://localhost:9000/app)
- Generated admin login: `.demo/credentials.md` (local only, ignored by Git)
- Demo inbox: [localhost:3014/demo/inbox](http://localhost:3014/demo/inbox)

`demo:setup` migrates and seeds the real database. Setup is repeatable and preserves existing demo products, articles, customers, and orders. Stop `npm run demo` before rerunning setup. The `.demo/` directory contains the persistent PostgreSQL data, generated secrets, and captured emails; never commit or publish it. The database listens on loopback port 5439. The frontend and backend use ports 3014 and 9000. If a port is occupied, stop the previous demo before restarting. Close the process with Ctrl+C to stop its servers and database.

### What works

Guest checkout collects **email and phone** without requiring login. Sign-in uses native Medusa email/password accounts. Checkout uses real catalog prices, stock, shipping methods, payment collections, and native Medusa cart completion. Standard delivery is $5; express is $12. The USD prices, zero-tax demo region, sizes, and destinations are illustrative. The manual test provider authorizes a demo order without charging a card or arranging delivery. This is visibly labeled throughout checkout and receipts; live checkout is blocked when demo mode is off.

Accounts support registration, login/logout, profile updates, saved address creation/editing/removal, password resets, order history, and order details. Earlier guest orders are linked **only after email ownership verification** using a hashed, expiring, attempt-limited code. Merely registering an email never reveals its past guest orders. Future guest orders can be linked on the next login after a successful verification. Guest receipts require an encrypted browser receipt cookie; account receipts require order ownership. Customer tokens and cart/receipt proofs are encrypted in HttpOnly cookies. The local inbox catches verification, reset, and order-confirmation emails; use fictitious addresses when presenting.

Native Medusa Admin manages products, variants, prices, inventory, order payments, and fulfillment. A custom **Journal** tab provides database-backed article drafts, editing, and publication. The storefront reads products and published stories dynamically without a rebuild. Product types become shop filters; article categories become journal filters. Rich article HTML is sanitized before rendering. See [docs/DEMO.md](docs/DEMO.md) for a client walkthrough and management instructions.

### Architecture and deployment boundary

`backend/` is a separate Medusa application with its own lockfile. `app/lib/medusa.ts` adapts its Store API to the existing storefront. `/api/commerce/*` is a same-origin Next.js backend-for-frontend with validated requests and private, uncached account responses. `scripts/demo*.mjs` orchestrate the local persistent PostgreSQL instance, backend, and storefront with generated machine-local secrets. The custom journal and email-verification records have committed migrations.

The original preview mode remains available with `npm run dev`; its checkout stays disabled. The previous Shopify integration is preserved as an alternative when configured, but this branch’s account and ordering implementation uses Medusa. Run the showcase using `npm run demo`, which supplies its environment automatically. `.env.example` and `backend/.env.example` document the separate configuration for manual hosting; they contain no credentials.

This local demo is not a production deployment. Before launch, select and test a real payment provider, tax/shipping rules, refund and fulfillment operations, SMTP delivery, managed PostgreSQL backups, Redis-backed event/workflow/locking infrastructure, HTTPS/cookie settings, rate limiting and abuse controls, file storage, policies, and deployment monitoring. Medusa Admin’s local upload storage and in-memory infrastructure are suitable for this single-process showcase. The local shared inbox is restricted to demo mode and loopback hosts and must remain disabled on a public deployment. Showcase pages are marked `noindex` and excluded from the sitemap. Review Medusa dependency advisories before deployment; no incompatible automatic audit fixes should be applied blindly.

References: [Medusa documentation](https://docs.medusajs.com/), [customer account integration](https://docs.medusajs.com/storefront-development/customers), [Medusa repository and license](https://github.com/medusajs/medusa). The seed structure follows Medusa’s official starter; the catalog, journal, storefront, and account experience are project-specific.

## Pages and behavior

- `/`: original island story, dynamic collection, daily rituals, FAQs, sample newsletter feedback, and latest journal stories.
- `/shop`: dynamic product listing with automatic product-type filters, text search, price/name sorting, empty states, and progressive display of larger catalogs.
- `/products/[handle]`: dynamic product details, image gallery, size variants, quantity controls, availability, and related products.
- `/blog`: published journal content with topic filters, search, a featured story, and additional-story loading.
- `/blog/[handle]`: article metadata, safely sanitized rich text, reading time, and related stories. Missing articles and products return a 404.
- `/api/checkout`: validates variant IDs and quantities, then creates a Shopify cart and returns its freshly generated hosted checkout URL. All real prices, inventory, taxes, and shipping are authoritative in Shopify. The endpoint never accepts client-supplied prices. Inventory warnings stop the redirect and ask the buyer to review their bag.
- `/robots.txt`, `/sitemap.xml`: public discovery when both a real store and `SITE_URL` are configured.

The bag persists in browser local storage across pages, reloads, and tabs. It contains only selected products and quantities, not payment or customer data. Preview lines are excluded when switching to a live store. Final prices and availability are rechecked by the configured commerce backend at checkout. Browser storage may be cleared by the buyer. In Medusa mode, account and order-history features use the backend database and private session cookies.

## Scrolling and accessibility

A shared persistent header and one Lenis controller handle section links on every page. Section content lands 28px below the measured header. Navigation waits for mobile-menu scroll locks to release; cross-page section links preserve the same alignment. The bag scrolls independently, while the background is inert and locked. Dialogs support Escape, a keyboard focus loop, and focus restoration without an extra scroll. Reduced-motion preferences use immediate navigation.

## Presentation polish and motion

The homepage uses the existing hero photograph as a lightweight cinematic background: a continuous camera-style pan/zoom, slowly shifting warm light, subtle drifting particles, scroll depth, and fine-pointer parallax. It is animated still photography, not a video file. The photograph loads eagerly with high priority; no extra video download is required.

A visible pause/play control stops the repeating banner effects. Animation pauses automatically when the banner is offscreen or the tab is hidden. Reduced-motion settings remove the repeating effects, pointer motion, and entrance animations. The headline enters in a staggered sequence, and narrow-phone/short-laptop layouts keep the copy and controls separated.

Additional refinements include crossfading ritual images, expanding FAQ answers, keyboard-visible product quick-add controls, animated mobile menu entrances, hover/focus feedback, email autocomplete and signup status styling, a subtle scrolled-header shadow, and a back-to-top link that returns focus to the main content. Motion styles live in `app/motion.css`.

## Validation

```bash
npm test          # Shopify transport/checkout contract tests and rich-text sanitization
npm run build
npm run test:e2e  # original preview: production server + desktop/mobile Chrome
npm run test:medusa # real Medusa desktop/mobile journeys; start npm run demo first
npm run backend:typecheck
npm run backend:build # compiles backend and native Admin using local demo configuration
```

Browser tests use an installed Google Chrome. If it is unavailable, install Chrome, or install a Playwright browser and update `channel` in `playwright.config.ts`. Run browser tests with Shopify variables unset; the tests intentionally use the deterministic preview catalog. Test output and traces are ignored by Git.

The automated checks cover product filters/search/sorting, variant prices and quantities, persistent bag state, preview checkout, full articles, topic filters and search, missing content, hydration errors, mobile navigation, cross-page section alignment, reduced motion, dialog keyboard behavior, FAQs, rituals, signup feedback, cinematic motion pause/resume and reduced-motion behavior, offscreen pausing, back-to-top focus, narrow-phone/short-laptop banner fit, and horizontal overflow. Shopify contract tests use mocked API responses; they do not make real purchases.

Physical-device, screen-reader, and connected Shopify test-order checks remain before launch. The email form is still a browser-only preview; connect a mailing provider separately.

## Asset provenance

- `public/images/hero.jpg`, `powder.jpg`, `craft.jpg`: original AI-generated concept imagery, split from a three-panel generated asset. Illustrative, not proof of actual production practices.
- `public/images/heritage.jpg`, `cinnamon.jpg`: temporary reference-site photography from finestceyloncinnamon.com / its Shopify CDN. Replace with owned or licensed photography before publication.
- Typeface: Google Fonts DM Sans and Playfair Display, loaded via CSS; system fonts are fallbacks when offline.

Generation brief: luxury photorealistic cinnamon still life on dark olive, ground cinnamon in a ceramic bowl on ivory, and illustrative hands peeling bark; warm editorial lighting, no labels or packaging. Generated using the built-in image generation tool.

## Launch checklist

Replace reference and concept images with owned or licensed brand photography; confirm product facts and origin claims; replace illustrative pricing/sizes; configure and test the selected commerce provider; publish actual legal/contact policies; connect the mailing list; and review mobile, accessibility, and performance on the deployed domain.
