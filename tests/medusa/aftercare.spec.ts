import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
const origin = "http://localhost:3014",
  backend = "http://localhost:9000";
async function json(response: any) {
  const data = await response.json();
  expect(response.ok(), JSON.stringify(data)).toBe(true);
  return data;
}
test("guest request, owner review, native receive, partial and full refunds, withdrawal and privacy", async ({
  page,
  browser,
}, info) => {
  const store = JSON.parse(readFileSync(".demo/store.json", "utf8")),
    config = JSON.parse(readFileSync(".demo/config.json", "utf8"));
  const post = (path: string, data: any) =>
    page.request.post(`/api/commerce/${path}`, {
      headers: { Origin: origin },
      data,
    });
  const products = await json(
    await page.request.get(
      `${backend}/store/products?region_id=${store.region}&fields=*variants.calculated_price`,
      { headers: { "x-publishable-api-key": store.key } },
    ),
  );
  const variant = products.products
    .find((p: any) => p.handle === "whole-ceylon-cinnamon")
    .variants.sort(
      (a: any, b: any) =>
        a.calculated_price.calculated_amount -
        b.calculated_price.calculated_amount,
    )[0];
  await json(
    await post("cart", { lines: [{ variant_id: variant.id, quantity: 2 }] }),
  );
  await json(
    await post("checkout", {
      action: "address",
      email: `returns-${info.project.name}-${Date.now()}@example.com`,
      address: {
        first_name: "Return",
        last_name: "Tester",
        address_1: "10 Cinnamon Lane",
        city: "Colombo",
        postal_code: "00100",
        country_code: "lk",
        phone: "+94771234567",
      },
    }),
  );
  let checkout = await json(await page.request.get("/api/commerce/checkout"));
  await json(
    await post("checkout", {
      action: "shipping",
      option_id: checkout.shippingOptions.find(
        (o: any) => o.name === "Standard Shipping",
      ).id,
    }),
  );
  const { orderId } = await json(
    await post("checkout", { action: "complete", acknowledged: true }),
  );
  const login = await json(
      await page.request.post(`${backend}/auth/user/emailpass`, {
        data: { email: "admin@ceylon.local", password: config.adminPassword },
      }),
    ),
    headers = { Authorization: `Bearer ${login.token}` };
  const getOrder = async () =>
    (
      await json(
        await page.request.get(
          `${backend}/admin/orders/${orderId}?fields=*items,*fulfillments,*payment_collections.payments,*shipping_methods`,
          { headers },
        ),
      )
    ).order;
  let order = await getOrder();
  const line = order.items[0],
    payment = order.payment_collections[0].payments[0];
  await json(
    await page.request.post(`${backend}/admin/payments/${payment.id}/capture`, {
      headers,
      data: {},
    }),
  );
  const locations = (
    await json(
      await page.request.get(`${backend}/admin/stock-locations`, { headers }),
    )
  ).stock_locations;
  const location = locations.find((l: any) => l.name === "Ceylon studio"),
    quarantine = locations.find((l: any) => l.name.includes("quarantine"));
  expect(quarantine).toBeTruthy();
  await json(
    await page.request.post(`${backend}/admin/orders/${orderId}/fulfillments`, {
      headers,
      data: {
        items: [{ id: line.id, quantity: 2 }],
        location_id: location.id,
        shipping_option_id: order.shipping_methods[0].shipping_option_id,
        no_notification: true,
      },
    }),
  );
  order = await getOrder();
  const fulfillment = order.fulfillments[0].id;
  await json(
    await page.request.post(
      `${backend}/admin/orders/${orderId}/fulfillments/${fulfillment}/shipments`,
      {
        headers,
        data: { items: [{ id: line.id, quantity: 2 }], no_notification: true },
      },
    ),
  );
  await json(
    await page.request.post(
      `${backend}/admin/orders/${orderId}/fulfillments/${fulfillment}/mark-as-delivered`,
      { headers, data: { no_notification: true } },
    ),
  );
  await page.goto(`/orders/${orderId}`);
  await expect(
    page.getByRole("button", {
      name: "Request a return or report an issue",
      exact: false,
    }),
  ).toBeVisible();
  const outsider = await browser.newContext();
  expect(
    (
      await outsider.request.post(`${origin}/api/commerce/returns/${orderId}`, {
        headers: { Origin: origin },
        data: { action: "request" },
      })
    ).status(),
  ).toBe(401);
  await outsider.close();
  expect(
    (
      await page.request.get(`${backend}/store/aftercare/${orderId}`, {
        headers: { "x-publishable-api-key": store.key },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await post(`returns/${orderId}`, {
        action: "request",
        client_key: randomUUID(),
        reason: "quality",
        note: "A quantity that must not be accepted.",
        unopened: false,
        items: [{ id: line.id, quantity: 99 }],
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await post(`returns/${orderId}`, {
        action: "request",
        client_key: randomUUID(),
        reason: "change_mind",
        note: "These are opened packets and should not qualify.",
        unopened: false,
        items: [{ id: line.id, quantity: 1 }],
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post(`${backend}/store/returns`, {
        headers: { "x-publishable-api-key": store.key },
        data: { order_id: orderId, items: [{ id: line.id, quantity: 1 }] },
      })
    ).ok(),
  ).toBe(false);
  await page
    .getByRole("button", {
      name: "Request a return or report an issue",
      exact: false,
    })
    .click();
  await page
    .getByRole("combobox", {
      name: "Return quantity for The original quill",
      exact: true,
    })
    .selectOption("1");
  await page
    .getByRole("combobox", { name: "Reason", exact: true })
    .selectOption("damaged");
  await page
    .getByRole("textbox", { name: "Tell us what happened", exact: true })
    .fill("The sealed packet arrived damaged during delivery.");
  const [submitted] = await Promise.all([
    page.waitForRequest(
      (r) =>
        r.url().includes(`/api/commerce/returns/${orderId}`) &&
        r.method() === "POST",
    ),
    page.getByRole("button", { name: "Submit request", exact: false }).click(),
  ]);
  await expect(page.locator(".return-request-list")).toContainText("Requested");
  const replay = await json(
    await post(`returns/${orderId}`, submitted.postDataJSON()),
  );
  expect(replay.requests).toHaveLength(1);
  expect(
    (
      await post(`returns/${orderId}`, {
        ...submitted.postDataJSON(),
        note: "A different request must use a new submission key.",
      })
    ).status(),
  ).toBe(400);
  const requestId = replay.requests[0].id;
  const owner = await browser.newContext();
  const ownerPage = await owner.newPage();
  await ownerPage.goto(`${backend}/app/login`);
  await ownerPage.locator("input[name=email]").fill("admin@ceylon.local");
  await ownerPage.locator("input[name=password]").fill(config.adminPassword);
  await ownerPage
    .getByRole("button", { name: "Continue with Email", exact: true })
    .click();
  await ownerPage.waitForURL("**/app/orders");
  await ownerPage.goto(`${backend}/app/aftercare`);
  const card = ownerPage.getByRole("article").filter({
    has: ownerPage.getByRole("heading", {
      name: `Order #${order.display_id}`,
      exact: true,
    }),
  });
  await card
    .getByRole("button", { name: "Review request", exact: true })
    .click();
  await ownerPage
    .getByRole("textbox", {
      name: "Customer response / return instructions",
      exact: true,
    })
    .fill(
      "Approved for this demonstration. Do not post any goods; simulate receipt through Medusa Admin.",
    );
  await ownerPage
    .getByRole("button", { name: "Save decision", exact: true })
    .click();
  await expect(ownerPage.getByRole("status")).toContainText("Decision saved");
  await owner.close();
  await page.reload();
  await expect(page.locator(".return-request-list")).toContainText("Approved");
  let data = await json(
    await page.request.get(`/api/commerce/orders/${orderId}`),
  );
  const nativeId = data.aftercare.requests[0].native_return_id;
  expect(nativeId).toMatch(/^return_/);
  const inventoryBefore = await json(
    await page.request.get(
      `${backend}/store/products?region_id=${store.region}&fields=*variants.calculated_price,+variants.inventory_quantity`,
      { headers: { "x-publishable-api-key": store.key } },
    ),
  );
  const stockBefore = inventoryBefore.products
    .flatMap((p: any) => p.variants)
    .find((v: any) => v.id === variant.id).inventory_quantity;
  await json(
    await page.request.post(`${backend}/admin/returns/${nativeId}/receive`, {
      headers,
      data: {},
    }),
  );
  await json(
    await page.request.post(
      `${backend}/admin/returns/${nativeId}/receive-items`,
      { headers, data: { items: [{ id: line.id, quantity: 1 }] } },
    ),
  );
  await json(
    await page.request.post(
      `${backend}/admin/returns/${nativeId}/receive/confirm`,
      { headers, data: {} },
    ),
  );
  const inventoryAfter = await json(
    await page.request.get(
      `${backend}/store/products?region_id=${store.region}&fields=*variants.calculated_price,+variants.inventory_quantity`,
      { headers: { "x-publishable-api-key": store.key } },
    ),
  );
  expect(
    inventoryAfter.products
      .flatMap((p: any) => p.variants)
      .find((v: any) => v.id === variant.id).inventory_quantity,
  ).toBe(stockBefore);
  const refundKey = randomUUID();
  await json(
    await page.request.post(`${backend}/admin/payments/${payment.id}/refund`, {
      headers,
      data: {
        amount: 18,
        note: "Partial demo refund after inspection",
        idempotency_key: refundKey,
      },
    }),
  );
  await page.reload();
  await expect(page.locator(".return-request-list")).toContainText(
    "Return received",
  );
  await expect(page.locator(".refund-ledger")).toContainText("$18.00");
  // A different delivered unit can be withdrawn and requested again after review.
  const secondBody = {
    action: "request",
    client_key: randomUUID(),
    reason: "quality",
    note: "Please review the other packet for a quality concern.",
    unopened: false,
    items: [{ id: line.id, quantity: 1 }],
  };
  data = await json(await post(`returns/${orderId}`, secondBody));
  const second = data.requests.find((r: any) => r.id !== requestId);
  await json(
    await post(`returns/${orderId}`, {
      action: "withdraw",
      request_id: second.id,
    }),
  );
  data = await json(
    await post(`returns/${orderId}`, {
      ...secondBody,
      client_key: randomUUID(),
    }),
  );
  const decline = data.requests.find((r: any) => r.status === "requested");
  await json(
    await page.request.post(`${backend}/admin/aftercare/${decline.id}`, {
      headers,
      data: {
        action: "decline",
        reply:
          "Please provide more details before we can approve this demo request.",
      },
    }),
  );
  data = await json(
    await post(`returns/${orderId}`, {
      ...secondBody,
      client_key: randomUUID(),
    }),
  );
  const approved = data.requests.find((r: any) => r.status === "requested");
  await json(
    await page.request.post(`${backend}/admin/aftercare/${approved.id}`, {
      headers,
      data: {
        action: "approve",
        resolution: "refund_only",
        reply:
          "No physical return is needed. We will review the remaining demo refund separately.",
      },
    }),
  );
  await json(
    await page.request.post(`${backend}/admin/payments/${payment.id}/refund`, {
      headers,
      data: {
        amount: 23,
        note: "Remaining item and delivery demo refund",
        idempotency_key: randomUUID(),
      },
    }),
  );
  await page.reload();
  await expect(page.locator(".refund-ledger")).toContainText(
    "Total refunded: $41.00",
  );
  await expect(page.locator(".refund-summary")).toContainText(
    "Originally paid$41.00",
  );
  await expect(page.locator(".refund-summary")).toContainText("Net paid$0.00");
  await expect(page.locator(".return-request-list")).toContainText(
    "no return needed",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/aftercare-${info.project.name}.png`,
    fullPage: true,
  });
});

test("aftercare rejects expired and order-mismatched server proofs", async ({
  request,
}, info) => {
  test.skip(
    info.project.name === "mobile",
    "Server proof checks are run once.",
  );
  const config = JSON.parse(readFileSync(".demo/config.json", "utf8")),
    store = JSON.parse(readFileSync(".demo/store.json", "utf8"));
  const { createHmac } = await import("node:crypto");
  const proof = (id: string, time: string) => ({
    "x-publishable-api-key": store.key,
    "x-ceylon-time": time,
    "x-ceylon-signature": createHmac("sha256", config.sessionSecret)
      .update(`aftercare-v1:${time}:GET:${id}:{}`)
      .digest("hex"),
  });
  const id = "order_proofcheck",
    current = String(Date.now());
  expect(
    (
      await request.get(`${backend}/store/aftercare/${id}`, {
        headers: proof(id, String(Date.now() - 120000)),
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.get(`${backend}/store/aftercare/order_different`, {
        headers: proof(id, current),
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.get(`${backend}/store/aftercare/${id}`, {
        headers: proof(id, current),
      })
    ).status(),
  ).toBe(404);
  const blocked = await request.post(`${backend}/store/returns`, {
    headers: { "x-publishable-api-key": store.key },
    data: {
      order_id: id,
      items: [],
      return_shipping: { option_id: "so_proofcheck" },
    },
  });
  expect(blocked.ok()).toBe(false);
  expect((await blocked.json()).message).toContain(
    "Submit a return request from your Ceylon order page",
  );
});
