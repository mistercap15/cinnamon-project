# Ceylon client showcase

## Start

Follow the Medusa setup commands in the README once, then run `npm run demo`. The launcher automatically uses an installed Node 24+ runtime, including Codex’s runtime on this Mac; no `nvm` or PATH prefix is needed. Leave `npm run demo` running. Open http://localhost:3014. The existing landing page is preserved. This showcase creates real local Medusa records with a manual test payment; no money moves and no shipment is booked.

## Buyer journey (about five minutes)

1. Open **Shop**, explore whole/ground filters, open a product, select a size, and add to bag.
2. Continue to checkout. Use a fictitious email such as `client-demo@example.com`, a name, delivery address, and phone number. No account is necessary. Demo destinations are Sri Lanka, India, the UK, and the US; all prices are USD.
3. Select standard or express delivery, review the actual cart total, accept the demonstration notice, and place the order. The receipt displays the native order number and payment status. Reloading preserves access in this browser.
4. Open the profile icon or **Your account** in mobile navigation. Create an account with the same email and a password of at least 10 characters. Guest history is private until verified.
5. Click **Verify checkout email**. Open `/demo/inbox` in another tab, filter by that email, copy its six-digit code, and verify. The guest order now appears in the account. Codes expire after 10 minutes; five wrong attempts require a fresh code. Requests are spaced by at least one minute.
6. Edit **Your details**, add/edit/remove a saved address, inspect an order, and place another order while signed in. It appears in the account automatically.
7. Sign out, choose **Forgot your password?**, and request a reset. The local inbox contains the reset link. Set a new password and sign in again.

Use a new fictitious email for a clean repeat demonstration. Do not show the shared local inbox publicly or enter real customer information. Database records persist across restarts; the demo does not simulate production email delivery.

## Owner journey

Open http://localhost:9000/app and sign in with the machine-generated credentials in `.demo/credentials.md`.

### Products and stock

In **Products**, edit either seeded product or create another product. Give it a title, unique handle, description, images, at least one variant and a USD price. Set status **Published**, assign the **Default Sales Channel** sales channel, and use the default shipping profile. For tracked inventory, attach the variant inventory item to the seeded warehouse and add stock; alternatively disable inventory tracking for an illustrative demo product. Refresh `/shop` to see the result. Edits do not require a frontend rebuild.

Seeded photography is served from the local frontend. Images uploaded through Admin use Medusa’s local upload provider and are not suitable as permanent production storage. Product **type** sets the storefront filter; the seeded products have their cinnamon form in metadata.

### Orders

In **Orders**, find the new order by email or native order number. Its manual payment starts **Authorized**. Open it to capture the demo payment and create a fulfillment using native Medusa controls. These operations update local records only. Refresh the buyer’s order details to see status changes. Real payment capture, tracking, refunds and carrier bookings require production providers and separate validation.

The storefront shows fulfillment progress (**Fulfilled**, **Shipped**, **Delivered**) separately from payment status. Medusa’s administrative order status can remain `pending` after delivery. Once a guest order is linked through email verification, the customer can sign in again and open it without the original guest checkout session.

### Returns and refunds

After marking a demo order delivered, open its storefront details and submit a return request. Review it in **Returns & care** in Medusa Admin, then receive approved physical returns and issue refunds from the native order page. Refresh the customer order to see receipt and refund updates. Follow [RETURNS.md](RETURNS.md) for the policy, quarantine inventory, and full walkthrough.

### Journal

Open **Journal** in the sidebar. Click **New story**, enter a unique lowercase handle, title, category, author, excerpt, image URL, and article HTML (`<p>`, `<h2>`, `<ul>` etc.). Save as a draft to keep it private. Check **Published on storefront** and save to show it in `/blog`; edit to revise or uncheck to unpublish. Refresh the storefront after saving. Unsafe scripts and event handlers are removed when the article is rendered.

## Validation

With the demo running, run `npm run test:medusa` for real desktop/mobile browser journeys, account recovery, order privacy, management and dynamic publication. Tests create fictitious customers and real local demo orders. Trace output and screenshots are written under ignored `test-results/`. The original `npm run test:e2e` covers the landing page and preview shop separately.

## Keep this branch separate

All phase-two development lives on `phase-2-medusa-demo`. The previous landing-page work remains on `master`. No client hosting, paid services, real payment gateway, or production credentials are needed for this local presentation.
