# CEYLON — the cinnamon storefront

An original editorial Next.js website for whole Ceylon cinnamon and ground cinnamon. Built with TypeScript, custom CSS, Lenis, and Lucide icons. The original homepage is preserved and extended with a dynamic shop and journal.

## Run locally

Use **Node.js 22.12 or newer**; Node 24 LTS is recommended (`.nvmrc` is included). The maintained HTML sanitizer requires the newer runtime.

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

## Why Shopify

Keep this custom storefront, with Shopify handling the catalog, variant availability, pricing, hosted checkout, payments, orders, and editorial publishing. The Shopify blog is the initial CMS; this avoids a second paid CMS and gives the store owner one place to manage both products and articles.

The integration calls the versioned Storefront GraphQL API on the server. Tokens are never exposed to browser bundles. Catalog and article reads refresh after a 60-second cache window; requests after expiry trigger revalidation, so updates may take another request to appear. Checkout requests bypass the cache. Live API failures surface an error rather than substituting fictional inventory. Both listing queries follow pagination, so newly published items are not limited to the first API page.

References: [headless storefront architecture](https://shopify.dev/docs/storefronts/headless/overview), [Storefront API](https://shopify.dev/docs/api/storefront/latest), [hosted checkout](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage).

## Connect a real store

1. Create or use the brand’s Shopify store. A Shopify account and applicable subscription are external prerequisites; this code does not create an account or purchase a plan.
2. Add the **Headless** sales channel in Shopify and create a storefront. Enable product-listing and content-read permissions (`unauthenticated_read_product_listings`, `unauthenticated_read_content`), plus the cart/checkout permissions exposed for the channel. Use a **public Storefront API token**, never an Admin API token.
3. Copy `.env.example` to `.env.local`. Set `SHOPIFY_STORE_DOMAIN` to the exact `your-store.myshopify.com` hostname (no protocol or path), and set `SHOPIFY_STOREFRONT_ACCESS_TOKEN`. Tokenless access is supported by Shopify for the fields used here, but an explicit channel token makes storefront publication and permissions easier to manage.
4. Add the real whole and ground cinnamon products. Set titles, descriptions, product types (`Whole cinnamon` / `Ground cinnamon`), images, prices, size variants, inventory, and currency. Publish the products to the Headless storefront. Product types become shop filters automatically. Product detail pages show the variant prices and availability returned by Shopify. The intended catalog is a small cinnamon range; the variant picker reads up to 100 variants per product.
5. Create a blog with handle `journal`, or set `SHOPIFY_BLOG_HANDLE` to an existing blog handle. Publish articles with a title, body, excerpt, author, featured image, and topic tags. Tags automatically become journal filters; reading times are calculated from the article body. Shopify’s normal `/blogs/<blog>/<article>` links redirect to this site’s `/blog/<article>` routes.
6. Set `SITE_URL` to the final HTTPS storefront URL. This enables public indexing, social-image URL resolution, and the catalog/article sitemap. Preview mode is marked `noindex` and excluded from the sitemap. Configure these variables in your host **before building/deploying**, then restart local development after changing them.
7. In Shopify, configure payments, shipping zones/rates, taxes, contact information, and shipping/return/privacy policies. Review actual copy and owned photography. Complete a Shopify test-mode order through the real connected store before accepting payments.

No Shopify store or credentials were provided during implementation, so the live store connection and real checkout have not been verified. Preview mode is intentional, not a silently simulated live shop.

## Pages and behavior

- `/`: original island story, dynamic collection, daily rituals, FAQs, sample newsletter feedback, and latest journal stories.
- `/shop`: live product listing with automatic product-type filters, text search, price/name sorting, empty states, and progressive display of larger catalogs.
- `/products/[handle]`: dynamic product details, image gallery, size variants, quantity controls, availability, and related products.
- `/blog`: live published journal content with topic filters, search, a featured story, and additional-story loading.
- `/blog/[handle]`: article metadata, safely sanitized rich text, reading time, and related stories. Missing articles and products return a 404.
- `/api/checkout`: validates variant IDs and quantities, then creates a Shopify cart and returns its freshly generated hosted checkout URL. All real prices, inventory, taxes, and shipping are authoritative in Shopify. The endpoint never accepts client-supplied prices. Inventory warnings stop the redirect and ask the buyer to review their bag.
- `/robots.txt`, `/sitemap.xml`: public discovery when both a real store and `SITE_URL` are configured.

The bag persists in browser local storage across pages, reloads, and tabs. It contains only selected products and quantities, not payment or customer data. Preview lines are excluded when switching to a live store. Final prices and availability are rechecked by Shopify at checkout. Browser storage may be cleared by the buyer; no customer account or order-history feature is implemented.

## Scrolling and accessibility

A shared persistent header and one Lenis controller handle section links on every page. Section content lands 28px below the measured header. Navigation waits for mobile-menu scroll locks to release; cross-page section links preserve the same alignment. The bag scrolls independently, while the background is inert and locked. Dialogs support Escape, a keyboard focus loop, and focus restoration without an extra scroll. Reduced-motion preferences use immediate navigation.

## Validation

```bash
npm test          # Shopify transport/checkout contract tests and rich-text sanitization
npm run build
npm run test:e2e  # local production server + desktop/mobile Chrome
```

Browser tests use an installed Google Chrome. If it is unavailable, install Chrome, or install a Playwright browser and update `channel` in `playwright.config.ts`. Run browser tests with Shopify variables unset; the tests intentionally use the deterministic preview catalog. Test output and traces are ignored by Git.

The automated checks cover product filters/search/sorting, variant prices and quantities, persistent bag state, preview checkout, full articles, topic filters and search, missing content, hydration errors, mobile navigation, cross-page section alignment, reduced motion, dialog keyboard behavior, FAQs, rituals, signup feedback, and horizontal overflow. Shopify contract tests use mocked API responses; they do not make real purchases.

Physical-device, screen-reader, and connected Shopify test-order checks remain before launch. The email form is still a browser-only preview; connect a mailing provider separately.

## Asset provenance

- `public/images/hero.jpg`, `powder.jpg`, `craft.jpg`: original AI-generated concept imagery, split from a three-panel generated asset. Illustrative, not proof of actual production practices.
- `public/images/heritage.jpg`, `cinnamon.jpg`: temporary reference-site photography from finestceyloncinnamon.com / its Shopify CDN. Replace with owned or licensed photography before publication.
- Typeface: Google Fonts DM Sans and Playfair Display, loaded via CSS; system fonts are fallbacks when offline.

Generation brief: luxury photorealistic cinnamon still life on dark olive, ground cinnamon in a ceramic bowl on ivory, and illustrative hands peeling bark; warm editorial lighting, no labels or packaging. Generated using the built-in image generation tool.

## Launch checklist

Replace reference and concept images with owned or licensed brand photography; confirm product facts and origin claims; replace illustrative pricing/sizes; connect and test Shopify; publish actual legal/contact policies; connect the mailing list; and review mobile, accessibility, and performance on the deployed domain.
