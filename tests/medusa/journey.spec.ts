import { test, expect, Page } from "@playwright/test";
import { readFileSync } from "node:fs";
const origin = "http://localhost:3014";
async function post(page: Page, path: string, data: any) {
  return page.request.post(`/api/commerce/${path}`, {
    headers: { Origin: origin },
    data,
  });
}
async function fillAddress(page: Page) {
  for (const [label, value] of Object.entries({
    "First name": "Island",
    "Last name": "Guest",
    "Street address": "10 Cinnamon Lane",
    City: "Colombo",
    "Postal code": "00100",
    "Phone number": "+94771234567",
  }))
    await page.getByRole("textbox", { name: label, exact: true }).fill(value);
  await page
    .getByRole("combobox", { name: "Country", exact: true })
    .selectOption("lk");
}
async function order(page: Page, email: string, saved = false) {
  await page.goto("/shop");
  await page
    .getByRole("button", { name: "Add The original quill to bag", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Continue to checkout", exact: true })
    .click();
  await page.waitForURL("**/checkout");
  await page
    .getByRole("textbox", { name: "Email address", exact: true })
    .fill(email);
  if (saved) {
    const select = page.getByRole("combobox", {
      name: "Saved delivery address",
      exact: true,
    });
    await select.selectOption(
      await select.locator("option").nth(1).getAttribute("value"),
    );
    await expect(
      page.getByRole("textbox", { name: "Street address", exact: true }),
    ).toHaveValue("22 Cinnamon Lane");
  } else await fillAddress(page);
  await page
    .getByRole("button", { name: "Continue to delivery", exact: true })
    .click();
  await page.getByRole("radio", { name: /Standard Shipping/ }).check();
  await page
    .getByRole("button", { name: "Review your order", exact: true })
    .click();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Place demo order", exact: true })
    .click();
  await page.waitForURL("**/orders/order_*");
  await expect(page.locator(".order-thank-you")).toBeVisible();
  return page.url().split("/").pop()!;
}
async function inbox(page: Page, email: string, subject: string) {
  let message: any;
  await expect
    .poll(
      async () => {
        const data = await (
          await page.request.get("/api/commerce/inbox")
        ).json();
        message = data.messages?.find(
          (m: any) => m.to === email && m.subject.includes(subject),
        );
        return Boolean(message);
      },
      { timeout: 20000 },
    )
    .toBe(true);
  return message;
}
test("guest order, verified history, account details, addresses, password reset and signed-in checkout", async ({
  page,
  browser,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const email = `journey-${info.project.name}-${Date.now()}@example.com`,
    password = "Cinnamon-demo-2026!";
  const id = await order(page, email);
  await page.reload();
  await expect(page.locator(".order-thank-you")).toBeVisible();
  if (info.project.name === "desktop") {
    const config = JSON.parse(readFileSync(".demo/config.json", "utf8")),
      backend = "http://localhost:9000";
    const login = await page.request.post(`${backend}/auth/user/emailpass`, {
      data: { email: "admin@ceylon.local", password: config.adminPassword },
    });
    const { token } = await login.json(),
      headers = { Authorization: `Bearer ${token}` };
    const detail = await (
      await page.request.get(
        `${backend}/admin/orders/${id}?fields=*items,*payment_collections.payments,*shipping_methods`,
        { headers },
      )
    ).json();
    const payment = detail.order.payment_collections[0].payments[0];
    let result = await page.request.post(
      `${backend}/admin/payments/${payment.id}/capture`,
      { headers, data: {} },
    );
    expect(result.ok(), await result.text()).toBe(true);
    const locations = await (
      await page.request.get(`${backend}/admin/stock-locations`, { headers })
    ).json();
    result = await page.request.post(
      `${backend}/admin/orders/${id}/fulfillments`,
      {
        headers,
        data: {
          location_id: locations.stock_locations[0].id,
          shipping_option_id:
            detail.order.shipping_methods[0].shipping_option_id,
          items: detail.order.items.map((item: any) => ({
            id: item.id,
            quantity: item.quantity,
          })),
          no_notification: true,
        },
      },
    );
    expect(result.ok(), await result.text()).toBe(true);
    await page.reload();
    await expect(page.locator(".order-overview")).toContainText("Captured");
    await expect(page.locator(".order-overview")).toContainText("Fulfilled");
  }
  const outsider = await browser.newContext();
  const response = await outsider.request.get(
    `${origin}/api/commerce/orders/${id}`,
  );
  expect(response.status()).toBe(401);
  const other = await outsider.request.post(`${origin}/api/commerce/account`, {
    headers: { Origin: origin },
    data: {
      action: "register",
      email: "other-" + email,
      password,
      first_name: "Other",
      last_name: "Buyer",
    },
  });
  expect(other.ok()).toBe(true);
  expect(
    (
      await outsider.request.get(`${origin}/api/commerce/orders/${id}`)
    ).status(),
  ).toBe(404);
  const session = (await outsider.cookies()).find(
    (c) => c.name === "ceylon_customer",
  );
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Lax");
  await outsider.close();
  await page.goto("/account");
  await page
    .getByRole("button", { name: "Create an account", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "First name", exact: true })
    .fill("Island");
  await page
    .getByRole("textbox", { name: "Last name", exact: true })
    .fill("Guest");
  await page
    .getByRole("textbox", { name: "Email address", exact: true })
    .fill(email);
  await page.locator("input[name=password]").fill(password);
  await page.locator("input[name=confirm]").fill(password);
  await page
    .getByRole("button", { name: "Create your account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Hello, Island." }),
  ).toBeVisible();
  await expect(page.locator(".order-history-card")).toHaveCount(0);
  await page.getByRole("button", { name: /Verify checkout email/ }).click();
  const mail = await inbox(page, email, "Verify");
  const code = mail.text.match(/\b\d{6}\b/)[0];
  await page
    .getByRole("textbox", { name: "Verification code", exact: true })
    .fill(code === "000000" ? "111111" : "000000");
  await page
    .getByRole("button", { name: "Verify & find orders", exact: true })
    .click();
  await expect(page.locator(".form-error")).toContainText("does not match");
  await page
    .getByRole("textbox", { name: "Verification code", exact: true })
    .fill(code);
  await page
    .getByRole("button", { name: "Verify & find orders", exact: true })
    .click();
  await expect(page.locator(".order-history-card")).toHaveCount(1);
  await page.getByRole("link", { name: "View order", exact: true }).click();
  await expect(page.locator(".order-thank-you")).toBeVisible();
  await page.goto("/account");
  await page
    .getByRole("button", { name: "Your details", exact: false })
    .click();
  await page
    .getByRole("textbox", { name: "First name", exact: true })
    .fill("Khilan");
  await page
    .getByRole("textbox", { name: "Phone number", exact: true })
    .fill("+919876543210");
  await page
    .getByRole("button", { name: "Save your details", exact: false })
    .click();
  await expect(
    page.getByRole("heading", { name: "Hello, Khilan." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Saved addresses", exact: false })
    .click();
  await page
    .getByRole("button", { name: "Add a delivery address", exact: false })
    .click();
  await fillAddress(page);
  await page
    .getByRole("button", { name: "Save address", exact: false })
    .click();
  await expect(page.locator(".saved-addresses article")).toHaveCount(1);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Street address", exact: true })
    .fill("22 Cinnamon Lane");
  await page
    .getByRole("button", { name: "Save address", exact: false })
    .click();
  await expect(page.locator(".saved-addresses")).toContainText(
    "22 Cinnamon Lane",
  );
  const signedInId = await order(page, email, true);
  expect(signedInId).not.toBe(id);
  await page.goto("/account");
  await expect(page.locator(".order-history-card")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Saved addresses", exact: false })
    .click();
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.locator(".saved-addresses article")).toHaveCount(0);
  await page.getByRole("button", { name: "Sign out", exact: false }).click();
  await page
    .getByRole("button", { name: "Forgot your password?", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Email address", exact: true })
    .fill(email);
  await page
    .getByRole("button", { name: "Send reset link", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("If an account exists");
  const reset = await inbox(page, email, "password");
  const url = reset.text.match(
    /http:\/\/localhost:3014\/account\/reset-password\?[^\s]+/,
  )[0];
  await page.goto(url);
  await page.locator("input[name=password]").fill(password + "New");
  await page.locator("input[name=confirm]").fill(password + "New");
  await page
    .getByRole("button", { name: "Save your new password", exact: false })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "password has been updated",
  );
  await page
    .getByRole("link", { name: "Back to sign in", exact: false })
    .click();
  await page
    .getByRole("textbox", { name: "Email address", exact: true })
    .fill(email);
  await page.locator("input[name=password]").fill(password + "New");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator(".order-history-card")).toHaveCount(2);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(200);
  await page.screenshot({
    path: `test-results/medusa-${info.project.name}-account.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("requests enforce origin, quantity validation and session privacy", async ({
  page,
}) => {
  await page.goto("/shop");
  const blocked = await page.request.post("/api/commerce/cart", {
    headers: { Origin: "https://untrusted.example" },
    data: { lines: [] },
  });
  expect(blocked.status()).toBe(403);
  const invalid = await post(page, "cart", {
    lines: [{ variant_id: "variant_fake", quantity: 0 }],
  });
  expect(invalid.status()).toBe(400);
  const profile = await post(page, "account", {
    action: "profile",
    profile: { first_name: "Other" },
  });
  expect(profile.status()).toBe(401);
  const data = await page.request.get("/api/commerce/account");
  expect(data.headers()["cache-control"]).toContain("no-store");
  expect((await data.json()).customer).toBeNull();
});

test("checkout ignores injected prices and enforces real stock", async ({
  page,
}) => {
  const store = JSON.parse(readFileSync(".demo/store.json", "utf8"));
  const catalog = await (
    await page.request.get(
      `http://localhost:9000/store/products?region_id=${store.region}&fields=*variants.calculated_price,+variants.inventory_quantity`,
      { headers: { "x-publishable-api-key": store.key } },
    )
  ).json();
  const product = catalog.products.find(
    (p: any) => p.handle === "whole-ceylon-cinnamon",
  );
  const variant = product.variants.sort(
    (a: any, b: any) =>
      a.calculated_price.calculated_amount -
      b.calculated_price.calculated_amount,
  )[0];
  const invalid = await post(page, "cart", {
    lines: [{ variant_id: variant.id, quantity: 99 }],
  });
  expect([400, 409]).toContain(invalid.status());
  const valid = await post(page, "cart", {
    lines: [{ variant_id: variant.id, quantity: 1, unit_price: 0, price: 0 }],
  });
  expect(valid.ok()).toBe(true);
  const data = await (await page.request.get("/api/commerce/checkout")).json();
  expect(Number(data.cart.total)).toBe(
    Number(variant.calculated_price.calculated_amount),
  );
});
