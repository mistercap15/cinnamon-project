import { test, expect, Page, Frame } from "@playwright/test";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
const origin = "http://localhost:3014",
  backend = "http://localhost:9000";
async function json(response: any) {
  const data = await response.json();
  expect(
    response.ok(),
    JSON.stringify({ message: data.error || data.message }),
  ).toBe(true);
  return data;
}
async function startCheckout(page: Page, email: string) {
  await page.goto("/shop");
  await page
    .getByRole("button", { name: "Add The original quill to bag", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Continue to checkout", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Email address", exact: true })
    .fill(email);
  for (const [label, value] of Object.entries({
    "First name": "Stripe",
    "Last name": "Tester",
    "Street address": "10 Cinnamon Lane",
    City: "Colombo",
    "Postal code": "00100",
    "Phone number": "+94771234567",
  }))
    await page.getByRole("textbox", { name: label, exact: true }).fill(value);
  await page
    .getByRole("combobox", { name: "Country", exact: true })
    .selectOption("lk");
  await page
    .getByRole("button", { name: "Continue to delivery", exact: true })
    .click();
  await page.getByRole("radio", { name: /Standard Shipping/ }).check();
  await page
    .getByRole("button", { name: "Review your order", exact: true })
    .click();
  await expect(page.locator(".stripe-pay-button")).toBeEnabled({
    timeout: 60000,
  });
  let card: Frame | undefined;
  await expect
    .poll(
      async () => {
        card = undefined;
        for (const frame of page.frames()) {
          if (await frame.locator('input[name="number"]').count()) {
            card = frame;
            break;
          }
        }
        return Boolean(card);
      },
      { timeout: 60000 },
    )
    .toBe(true);
  return card!;
}
async function fillCard(frame: Frame, number: string) {
  await frame
    .getByRole("textbox", { name: "Card number", exact: true })
    .fill(number);
  await frame.getByRole("textbox", { name: /^Expiration/ }).fill("1234");
  await frame
    .getByRole("textbox", { name: "Security code", exact: true })
    .fill("123");
}
async function adminHeaders(page: Page) {
  const config = JSON.parse(readFileSync(".demo/config.json", "utf8"));
  const auth = await json(
    await page.request.post(`${backend}/auth/user/emailpass`, {
      data: { email: "admin@ceylon.local", password: config.adminPassword },
    }),
  );
  return { Authorization: `Bearer ${auth.token}` };
}
test("real Stripe test purchase, authoritative totals, idempotent completion, and native partial/full refunds", async ({
  page,
}, info) => {
  const email = `stripe-success-${info.project.name}-${Date.now()}@example.com`;
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const card = await startCheckout(page, email);
  const checkout = await json(await page.request.get("/api/commerce/checkout"));
  expect(checkout.payment.provider).toBe("stripe");
  const collection = checkout.cart.payment_collection;
  const session = collection.payment_sessions.find(
    (s: any) => s.provider_id === "pp_stripe_stripe",
  );
  expect(session.data.livemode).toBe(false);
  const total = Number(checkout.cart.total);
  // A browser cannot claim success or select the old manual provider to skip Stripe.
  const premature = await page.request.post("/api/commerce/checkout", {
    headers: { Origin: origin },
    data: {
      action: "complete",
      acknowledged: true,
      payment_status: "succeeded",
    },
  });
  expect(premature.ok()).toBe(false);
  const store = JSON.parse(readFileSync(".demo/store.json", "utf8"));
  const bypass = await page.request.post(
    `${backend}/store/payment-collections/${collection.id}/payment-sessions`,
    {
      headers: { "x-publishable-api-key": store.key },
      data: { provider_id: "pp_system_default" },
    },
  );
  expect(bypass.ok()).toBe(false);
  await fillCard(card, "4242424242424242");
  await page.getByRole("checkbox", { name: /Stripe test payment/ }).check();
  await page
    .getByRole("button", { name: "Pay & place test order", exact: false })
    .click();
  await page.waitForURL("**/orders/order_*", { timeout: 60000 });
  await expect(page.locator(".order-overview")).toContainText("Captured");
  const orderId = page.url().split("/").pop()!;
  for (let i = 0; i < 2; i++) {
    const repeat = await json(
      await page.request.post("/api/commerce/checkout", {
        headers: { Origin: origin },
        data: { action: "complete", acknowledged: true },
      }),
    );
    expect(repeat.orderId).toBe(orderId);
  }
  const headers = await adminHeaders(page);
  const order = (
    await json(
      await page.request.get(
        `${backend}/admin/orders/${orderId}?fields=*payment_collections.payments`,
        { headers },
      ),
    )
  ).order;
  const payment = order.payment_collections[0].payments[0];
  expect(payment.provider_id).toBe("pp_stripe_stripe");
  expect(Number(payment.amount)).toBe(total);
  const { stripeConfig } = await import("../../scripts/demo-config.mjs");
  const key = stripeConfig().secretKey;
  const stripeGet = async (path: string) => {
    const response = await fetch(`https://api.stripe.com/v1/${path}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const data = await response.json();
    expect(response.ok).toBe(true);
    return data;
  };
  const intent = await stripeGet(`payment_intents/${session.data.id}`);
  expect(intent.livemode).toBe(false);
  expect(intent.status).toBe("succeeded");
  expect(intent.amount_received).toBe(Math.round(total * 100));
  await json(
    await page.request.post(`${backend}/admin/payments/${payment.id}/refund`, {
      headers,
      data: {
        amount: 5,
        idempotency_key: randomUUID(),
        note: "Stripe sandbox partial refund",
      },
    }),
  );
  await page.reload();
  await expect(page.locator(".refund-ledger")).toContainText("$5.00");
  let refunds = await stripeGet(`refunds?payment_intent=${intent.id}`);
  expect(
    refunds.data.some((r: any) => r.amount === 500 && r.status === "succeeded"),
  ).toBe(true);
  await json(
    await page.request.post(`${backend}/admin/payments/${payment.id}/refund`, {
      headers,
      data: {
        amount: total - 5,
        idempotency_key: randomUUID(),
        note: "Stripe sandbox remaining refund",
      },
    }),
  );
  await page.reload();
  await expect(page.locator(".order-overview")).toContainText("Refunded");
  refunds = await stripeGet(`refunds?payment_intent=${intent.id}`);
  expect(refunds.data.reduce((sum: number, r: any) => sum + r.amount, 0)).toBe(
    Math.round(total * 100),
  );
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: `test-results/stripe/receipt-${info.project.name}.png`,
    fullPage: true,
  });
});
test("declined Stripe card can be corrected and retried on the same payment intent", async ({
  page,
}, info) => {
  const card = await startCheckout(
    page,
    `stripe-decline-${info.project.name}-${Date.now()}@example.com`,
  );
  const before = await json(await page.request.get("/api/commerce/checkout"));
  const intentId = before.cart.payment_collection.payment_sessions[0].data.id;
  await fillCard(card, "4000000000000002");
  await page.getByRole("checkbox", { name: /Stripe test payment/ }).check();
  await page
    .getByRole("button", { name: "Pay & place test order", exact: false })
    .click();
  await expect(page.locator(".stripe-payment .form-error")).toContainText(
    /declined/i,
  );
  expect(page.url()).toContain("/checkout");
  await expect(page.locator(".stripe-pay-button")).toBeEnabled();
  const after = await json(await page.request.get("/api/commerce/checkout"));
  expect(after.cart.payment_collection.payment_sessions[0].data.id).toBe(
    intentId,
  );
  await fillCard(card, "4242424242424242");
  await page
    .getByRole("button", { name: "Pay & place test order", exact: false })
    .click();
  await page.waitForURL("**/orders/order_*", { timeout: 60000 });
  await expect(page.locator(".order-overview")).toContainText("Captured");
});

test("Stripe 3D Secure challenge completes before the order is placed", async ({
  page,
}, info) => {
  const card = await startCheckout(
    page,
    `stripe-3ds-${info.project.name}-${Date.now()}@example.com`,
  );
  await fillCard(card, "4000002500003155");
  await page.getByRole("checkbox", { name: /Stripe test payment/ }).check();
  await page
    .getByRole("button", { name: "Pay & place test order", exact: false })
    .click();
  let challenge: Frame | undefined;
  await expect
    .poll(
      async () => {
        challenge = undefined;
        for (const frame of page.frames()) {
          if (
            await frame
              .getByRole("button", { name: /^Complete(?: authentication)?$/i })
              .count()
          ) {
            challenge = frame;
            break;
          }
        }
        return Boolean(challenge);
      },
      { timeout: 60000 },
    )
    .toBe(true);
  await challenge!.waitForLoadState("load");
  // Stripe's test ACS exposes this control for automated bank authentication.
  // It triggers the same test-bank authorization as its Complete button.
  await challenge!.evaluate(() =>
    window.postMessage({ test_source: { authorize: true } }, location.origin),
  );
  await page.waitForURL("**/orders/order_*", { timeout: 60000 });
  await expect(page.locator(".order-overview")).toContainText("Captured");
  await page.reload();
  await expect(page.locator(".order-thank-you")).toBeVisible();
});
