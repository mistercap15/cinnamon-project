# Stripe test checkout

This branch uses Medusa’s official Stripe provider and Stripe’s Payment Element. Card details go directly from Stripe’s hosted fields to Stripe. The application never builds card-number inputs or stores card data.

## Run with your test account

Add these to the root `.env.local` file (ignored by Git):

```dotenv
DEMO_PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_test_replace_me
STRIPE_PUBLISHABLE_KEY=pk_test_replace_me
```

Use a matching pair from the same Stripe sandbox. Keep secrets out of chat, source control, and `NEXT_PUBLIC_` variables. Stop any running demo, then run:

```bash
npm ci
npm run demo
```

The launcher loads `.env.local`, starts PostgreSQL, configures the demo region for Stripe only, starts local Stripe CLI webhook forwarding, then starts Medusa and Next.js. It obtains the listener signing secret privately and passes it to Medusa. No separate CLI login or manual signing-secret copy is required when using test API keys. Network access to Stripe is required. Ctrl+C stops the webhook listener, application servers, and database.

The demo rejects live secret and publishable keys. It also rejects incomplete credential pairs rather than mixing keys with the temporary sandbox. If Stripe is selected but unavailable, checkout reports an error; it does not fall back to the manual payment provider.

## Temporary sandbox on this machine

For implementation testing, a claimable Stripe sandbox was created with placeholder demo details. Its credentials, claim URL, account ID and expiry are stored only in ignored `.demo/stripe-sandbox.json`. This file is not part of the repository and should not be shared. The initial sandbox expires **6 November 2026** unless claimed. Your own `.env.local` test credentials take precedence over this temporary sandbox. Past Stripe test orders remain associated with the sandbox that processed them; keep that sandbox’s credentials if you need to refund those test payments later.

A fresh clone does not include temporary credentials. Supply your own test keys. When no Stripe keys exist, the existing explicitly labeled manual demo remains available.

## Test the buyer journey

1. Add a product to the bag, enter delivery details and choose delivery.
2. Review the authoritative Medusa total. Stripe’s secure test payment form loads inside checkout.
3. Use only Stripe test details:
   - Successful card: `4242 4242 4242 4242`
   - Declined card: `4000 0000 0000 0002`
   - 3D Secure challenge: `4000 0025 0000 3155`
   - Any valid future expiry and any three-digit CVC.
4. Accept the test-payment notice and pay. Failed payments leave checkout open for correction. The order is completed only after server-side payment verification; a client-supplied success flag is never trusted.
5. Inspect the order in Medusa Admin. Automatic capture is enabled for this test integration, so successful purchases show Captured. The Stripe Dashboard should show the corresponding test PaymentIntent.
6. Use Medusa Admin’s native refund controls for partial or full refunds. These call Stripe’s test refund API and appear on the customer receipt and demo inbox. No real funds move. Manage refunds through Medusa, not directly in Stripe Dashboard, so the commerce records stay synchronized.

If a payment requires a redirect, `/checkout/return` verifies and finalizes the order using the existing browser’s cart proof. Stripe’s return parameters are removed from the address bar and are not used as proof of success. A lost confirmation response can be retried without charging the customer again or creating another order. Inventory failures continue to use Medusa’s native checkout compensation/refund behavior.

## Webhooks

The standard Medusa endpoint is `/hooks/payment/stripe_stripe`. The local launcher forwards relevant `payment_intent.*` events with signature verification enabled. Listener logs are written to ignored `.demo/stripe-cli/webhooks.log`, with signing secrets redacted. If the listener exits, the demo shuts down rather than continuing to accept payments without webhook recovery.

For a separately configured external test webhook, use `STRIPE_WEBHOOK_MODE=external` and set its `STRIPE_WEBHOOK_SECRET` in `.env.local`. The endpoint must be reachable from Stripe. Do not use a Dashboard webhook secret for CLI-forwarded events; they have different signing secrets.

## Regression checks

With Stripe mode running:

```bash
npm test
npm run test:stripe
```

The Stripe browser tests perform real sandbox transactions, not mocked gateway responses. They verify payment capture, matching totals, rejected manual-provider bypass, repeated completion, native refunds, declined-card retry, and authentication challenges. Use a sandbox only.

The existing `npm run test:medusa` suite exercises manual demo payments. To run it, stop Stripe mode and start `DEMO_PAYMENT_PROVIDER=manual npm run demo`. Restart normal `npm run demo` afterward to return to Stripe mode. Manual mode does not remove the installed Stripe provider, allowing historical Stripe test payments to be managed when the same credentials are retained.

References: [Medusa Stripe provider](https://docs.medusajs.com/resources/commerce-modules/payment/payment-provider/stripe), [Stripe testing](https://docs.stripe.com/testing), [Stripe CLI sandbox](https://docs.stripe.com/cli/sandbox).
