import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
test("native Medusa Admin, product publication, and journal draft/edit/publish", async ({
  page,
  request,
}, info) => {
  test.skip(
    info.project.name === "mobile",
    "The native desktop owner console is tested once.",
  );
  const backend = "http://localhost:9000",
    config = JSON.parse(readFileSync(".demo/config.json", "utf8")),
    store = JSON.parse(readFileSync(".demo/store.json", "utf8"));
  const auth = await request.post(`${backend}/auth/user/emailpass`, {
    data: { email: "admin@ceylon.local", password: config.adminPassword },
  });
  expect(auth.ok()).toBe(true);
  const { token } = await auth.json(),
    headers = { Authorization: `Bearer ${token}` };
  expect(
    (
      await request.post(`${backend}/admin/journal`, {
        data: { title: "Unauthenticated" },
      })
    ).status(),
  ).toBe(401);
  await page.goto(`${backend}/app/login`);
  await page.locator("input[name=email]").fill("admin@ceylon.local");
  await page.locator("input[name=password]").fill(config.adminPassword);
  await page
    .getByRole("button", { name: "Continue with Email", exact: true })
    .click();
  await page.waitForURL("**/app/orders");
  await expect(
    page.getByRole("heading", { name: "Orders", exact: true }),
  ).toBeVisible();
  await page.goto(`${backend}/app/products`);
  await expect(
    page.getByText("The original quill", { exact: true }),
  ).toBeVisible();
  const stamp = Date.now(),
    handle = `showcase-product-${stamp}`,
    title = `Showcase cinnamon ${stamp}`;
  let productId = "",
    postId = "";
  try {
    const [channels, profiles] = await Promise.all([
      request
        .get(`${backend}/admin/sales-channels`, { headers })
        .then((r) => r.json()),
      request
        .get(`${backend}/admin/shipping-profiles`, { headers })
        .then((r) => r.json()),
    ]);
    const created = await request.post(`${backend}/admin/products`, {
      headers,
      data: {
        title,
        handle,
        status: "published",
        description: "A dynamically published showcase product.",
        thumbnail: "http://localhost:3014/images/cinnamon.jpg",
        shipping_profile_id: profiles.shipping_profiles[0].id,
        sales_channels: [{ id: channels.sales_channels[0].id }],
        options: [{ title: "Size", values: ["50g"] }],
        variants: [
          {
            title: "50g",
            sku: handle,
            manage_inventory: false,
            options: { Size: "50g" },
            prices: [{ currency_code: "usd", amount: 19 }],
          },
        ],
      },
    });
    expect(created.ok(), await created.text()).toBe(true);
    productId = (await created.json()).product.id;
    await page.goto("/shop");
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await page.goto(`/products/${handle}`);
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(page.locator(".detail-price")).toContainText("19");
    await request.post(`${backend}/admin/products/${productId}`, {
      headers,
      data: { title: title + " revised" },
    });
    await page.reload();
    await expect(
      page.getByRole("heading", { name: title + " revised", exact: true }),
    ).toBeVisible();
    await page.goto(`${backend}/app/journal`);
    await page.getByRole("button", { name: "New story", exact: true }).click();
    const blogTitle = `A fresh chapter ${stamp}`,
      blogHandle = `fresh-chapter-${stamp}`;
    for (const [label, value] of Object.entries({
      title: blogTitle,
      handle: blogHandle,
      category: "Demo stories",
      author: "Khilan Patel",
      "Image URL": "http://localhost:3014/images/powder.jpg",
      Excerpt: "A freshly written story for this showcase.",
      "Article body (HTML)":
        "<h2>A fresh chapter.</h2><p>Made in our dynamic journal.</p><script>window.unsafeBlog=true</script>",
    }))
      await page.getByLabel(label, { exact: true }).fill(value);
    await page.getByRole("button", { name: "Save story", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Story saved");
    const posts = await (
      await request.get(`${backend}/admin/journal`, { headers })
    ).json();
    postId = posts.posts.find((p: any) => p.handle === blogHandle).id;
    const unpublished = await request.get(
      `${backend}/store/journal/${blogHandle}`,
      { headers: { "x-publishable-api-key": store.key } },
    );
    expect(unpublished.status()).toBe(404);
    const row = page
      .locator("div")
      .filter({
        has: page.getByRole("heading", { name: blogTitle, exact: true }),
      })
      .filter({
        has: page.getByRole("button", { name: "Edit story", exact: true }),
      })
      .last();
    await row.getByRole("button", { name: "Edit story", exact: true }).click();
    await page.getByLabel("Published on storefront", { exact: true }).check();
    await page.getByRole("button", { name: "Save story", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Story saved");
    await page.goto(`/blog/${blogHandle}`);
    await expect(
      page.getByRole("heading", { name: blogTitle, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Made in our dynamic journal.", { exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => Boolean((window as any).unsafeBlog))).toBe(
      false,
    );
    expect(await page.locator("article script").count()).toBe(0);
    await request.post(`${backend}/admin/journal/${postId}`, {
      headers,
      data: {
        title: blogTitle + " edited",
        handle: blogHandle,
        category: "Demo stories",
        author: "Khilan Patel",
        excerpt: "Changed live.",
        image: null,
        content_html: "<p>Edited from the owner console.</p>",
        published: true,
        published_at: new Date().toISOString(),
      },
    });
    await page.reload();
    await expect(
      page.getByRole("heading", { name: blogTitle + " edited", exact: true }),
    ).toBeVisible();
  } finally {
    if (productId)
      await request.delete(`${backend}/admin/products/${productId}`, {
        headers,
      });
    if (postId)
      await request.delete(`${backend}/admin/journal/${postId}`, { headers });
  }
});

test("customer-editable metadata cannot forge guest-order verification", async ({
  request,
}, info) => {
  test.skip(
    info.project.name === "mobile",
    "Backend authorization is checked once.",
  );
  const store = JSON.parse(readFileSync(".demo/store.json", "utf8"));
  const base = "http://localhost:9000",
    email = `privacy-${Date.now()}@example.com`,
    credentials = { email, password: "Cinnamon-privacy-2026!" },
    publicHeaders = { "x-publishable-api-key": store.key };
  let result = await request.post(`${base}/auth/customer/emailpass/register`, {
    headers: publicHeaders,
    data: credentials,
  });
  expect(result.ok()).toBe(true);
  let { token } = await result.json();
  result = await request.post(`${base}/store/customers`, {
    headers: { ...publicHeaders, Authorization: `Bearer ${token}` },
    data: { email, first_name: "Private", last_name: "Guest" },
  });
  expect(result.ok()).toBe(true);
  result = await request.post(`${base}/auth/customer/emailpass`, {
    data: credentials,
  });
  token = (await result.json()).token;
  const headers = { ...publicHeaders, Authorization: `Bearer ${token}` };
  result = await request.post(`${base}/store/customers/me`, {
    headers,
    data: {
      metadata: {
        verified_email: email,
        email_verified_at: new Date().toISOString(),
      },
    },
  });
  expect(result.ok()).toBe(true);
  result = await request.post(`${base}/store/account/verification`, {
    headers,
    data: { sync: true },
  });
  expect(result.status()).toBe(403);
});
