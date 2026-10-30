import { aftercare } from "../../../lib/aftercare";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  medusa,
  medusaEnabled,
  isDemo,
  CommerceError,
} from "../../../lib/medusa";
import {
  customerToken,
  getPrivate,
  setPrivate,
  clearPrivate,
  checkOrigin,
} from "../../../lib/commerce-session";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
};
const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers });
const email = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((v) => v.toLowerCase());
const password = z.string().min(10, "Use at least 10 characters.").max(128);
const address = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  address_1: z.string().trim().min(3).max(200),
  address_2: z.string().max(200).optional(),
  city: z.string().trim().min(1).max(100),
  province: z.string().max(100).optional(),
  postal_code: z.string().trim().min(2).max(20),
  country_code: z.string().length(2),
  phone: z.string().trim().min(6).max(30),
});
// Store API defaults omit customer_id. Request it explicitly so account order
// access is checked against ownership, even without the guest receipt cookie.
const orderFields =
  "*items,*shipping_address,*shipping_methods,+customer_id,+payment_status,+fulfillment_status";
const cartFields =
  "*items,*items.variant,*items.variant.product,*shipping_methods,*shipping_address,*billing_address,*payment_collection,*payment_collection.payment_sessions,*region,*region.countries";
async function getCart() {
  const id = (await getPrivate("cart"))?.id;
  if (!id)
    throw new CommerceError(
      "Your bag is empty. Add something lovely to continue.",
      404,
    );
  return (await medusa(`/store/carts/${id}?fields=${cartFields}`)).cart;
}
async function options(cart: any) {
  return (await medusa(`/store/shipping-options?cart_id=${cart.id}`))
    .shipping_options;
}
async function cartResponse() {
  const cart = await getCart();
  let customer = null;
  const token = await customerToken();
  if (token) {
    try {
      customer = (
        await medusa("/store/customers/me?fields=*addresses", { token })
      ).customer;
    } catch {}
  }
  return {
    cart,
    customer,
    shippingOptions: cart.shipping_address?.country_code
      ? await options(cart)
      : [],
    demo: isDemo(),
  };
}
async function authenticated() {
  const token = await customerToken();
  if (!token) throw new CommerceError("Please sign in to continue.", 401);
  const { customer } = await medusa("/store/customers/me", { token });
  return { token, customer };
}
async function ownedOrder(id: string) {
  const receipt = await getPrivate("receipt");
  let customer: any = null;
  if (receipt?.orderId !== id) customer = (await authenticated()).customer;
  const { order } = await medusa(`/store/orders/${id}?fields=${orderFields}`);
  if (customer && order.customer_id !== customer.id)
    throw new CommerceError("Order not found.", 404);
  return order;
}
async function dispatch(request: Request, segments: string[]) {
  if (!medusaEnabled())
    throw new CommerceError("Medusa is not enabled for this storefront.", 503);
  const path = segments.join("/"),
    method = request.method;
  if (method === "GET") {
    if (path === "checkout") return json(await cartResponse());
    if (path === "account") {
      const token = await customerToken();
      if (!token) return json({ customer: null });
      try {
        const { customer } = await medusa(
          "/store/customers/me?fields=*addresses",
          { token },
        );
        const offset = Math.max(
          0,
          Math.min(
            10000,
            Number(new URL(request.url).searchParams.get("offset")) || 0,
          ),
        );
        const orders = await medusa(
          `/store/orders?limit=10&offset=${offset}&fields=${orderFields}`,
          { token },
        );
        const { region } = await medusa(
          `/store/regions/${process.env.MEDUSA_REGION_ID}`,
        );
        return json({ customer, ...orders, countries: region.countries });
      } catch (error) {
        if (error instanceof CommerceError && error.status === 401) {
          await clearPrivate("customer");
          return json({ customer: null, expired: true });
        }
        throw error;
      }
    }
    if (
      path.startsWith("orders/") &&
      /^order_[a-zA-Z0-9]+$/.test(segments[1] || "")
    ) {
      const id = segments[1],
        order = await ownedOrder(id);
      return json({ order, demo: isDemo(), aftercare: await aftercare(id) });
    }
    if (
      path === "inbox" &&
      isDemo() &&
      ["localhost", "127.0.0.1"].includes(
        new URL(process.env.SITE_URL || request.url).hostname,
      ) &&
      ["localhost", "127.0.0.1"].includes(
        (request.headers.get("host") || "").split(":")[0],
      )
    )
      return json(await medusa("/store/demo/inbox"));
    throw new CommerceError("Page not found.", 404);
  }
  try {
    checkOrigin(request);
  } catch {
    throw new CommerceError(
      "Please submit this request from the Ceylon website.",
      403,
    );
  }
  if (Number(request.headers.get("content-length")) > 32000)
    throw new CommerceError("Request too large.", 413);
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 32000)
    throw new CommerceError("Request too large.", 413);
  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new CommerceError("Please send valid form data.", 400);
  }
  if (segments.length === 2 && segments[0] === "returns") {
    const id = z
      .string()
      .regex(/^order_[a-zA-Z0-9]+$/)
      .parse(segments[1]);
    await ownedOrder(id);
    const data =
      body.action === "withdraw"
        ? z
            .object({
              action: z.literal("withdraw"),
              request_id: z.string().regex(/^rma_[a-zA-Z0-9]+$/),
            })
            .parse(body)
        : z
            .object({
              action: z.literal("request"),
              client_key: z.string().uuid(),
              reason: z.enum([
                "change_mind",
                "damaged",
                "incorrect",
                "missing",
                "quality",
              ]),
              note: z.string().trim().min(10).max(2000),
              unopened: z.boolean(),
              items: z
                .array(
                  z.object({
                    id: z.string(),
                    quantity: z.number().int().min(1).max(99),
                  }),
                )
                .min(1)
                .max(30),
            })
            .parse(body);
    return json(await aftercare(id, data));
  }
  if (path === "cart") {
    const lines = z
      .array(
        z.object({
          variant_id: z.string().regex(/^variant_[a-zA-Z0-9]+$/),
          quantity: z.number().int().min(1).max(99),
        }),
      )
      .min(1)
      .max(30)
      .parse(body.lines);
    if (new Set(lines.map((l) => l.variant_id)).size !== lines.length)
      throw new CommerceError("Please review duplicate items.", 400);
    let cart: any = null;
    try {
      const old = await getCart();
      if (
        !old.completed_at &&
        old.items.length === lines.length &&
        old.items.every((i: any) =>
          lines.some(
            (l) => l.variant_id === i.variant_id && l.quantity === i.quantity,
          ),
        )
      )
        cart = old;
    } catch {}
    if (!cart) {
      const created = await medusa("/store/carts", {
        method: "POST",
        body: { region_id: process.env.MEDUSA_REGION_ID, items: lines },
      });
      cart = created.cart;
      await setPrivate("cart", { id: cart.id });
    }
    const token = await customerToken();
    if (token) {
      try {
        await medusa(`/store/carts/${cart.id}/customer`, {
          method: "POST",
          body: {},
          token,
        });
      } catch {
        /* Guest checkout remains available if a session expired. */
      }
    }
    return json({ checkoutUrl: "/checkout" });
  }
  if (path === "checkout") {
    const cart = await getCart();
    if (body.action === "address") {
      const contact = email.parse(body.email),
        shipping = address.parse(body.address);
      await medusa(`/store/carts/${cart.id}`, {
        method: "POST",
        body: {
          email: contact,
          shipping_address: shipping,
          billing_address: shipping,
        },
      });
      return json(await cartResponse());
    }
    if (body.action === "shipping") {
      const id = z
        .string()
        .regex(/^so_[a-zA-Z0-9]+$/)
        .parse(body.option_id);
      if (!(await options(cart)).some((o: any) => o.id === id))
        throw new CommerceError(
          "Please select an available delivery option.",
          400,
        );
      await medusa(`/store/carts/${cart.id}/shipping-methods`, {
        method: "POST",
        body: { option_id: id },
      });
      return json(await cartResponse());
    }
    if (body.action === "complete") {
      if (!isDemo() || body.acknowledged !== true)
        throw new CommerceError(
          "This showcase only supports acknowledged test orders. No live payments are configured.",
          400,
        );
      if (
        !cart.email ||
        !cart.shipping_address?.address_1 ||
        !cart.shipping_methods?.length
      )
        throw new CommerceError(
          "Please finish your contact and delivery details.",
          400,
        );
      let collection = cart.payment_collection;
      if (!collection)
        collection = (
          await medusa("/store/payment-collections", {
            method: "POST",
            body: { cart_id: cart.id },
          })
        ).payment_collection;
      if (
        !collection.payment_sessions?.some(
          (p: any) => p.provider_id === "pp_system_default",
        )
      )
        await medusa(
          `/store/payment-collections/${collection.id}/payment-sessions`,
          { method: "POST", body: { provider_id: "pp_system_default" } },
        );
      const result = await medusa(`/store/carts/${cart.id}/complete`, {
        method: "POST",
        body: {},
      });
      if (result.type !== "order")
        throw new CommerceError(
          result.error?.message ||
            "Your order could not be placed. Please review your bag.",
          409,
        );
      await setPrivate("receipt", { orderId: result.order.id });
      await clearPrivate("cart");
      return json({ orderId: result.order.id });
    }
  }
  if (path === "account") {
    if (body.action === "login" || body.action === "register") {
      const credentials = {
        email: email.parse(body.email),
        password: (body.action === "login"
          ? z.string().min(1).max(128)
          : password
        ).parse(body.password),
      };
      const names =
        body.action === "register"
          ? z
              .object({
                first_name: z.string().trim().min(1).max(80),
                last_name: z.string().trim().min(1).max(80),
              })
              .parse(body)
          : null;
      const auth = await medusa(
        `/auth/customer/emailpass${body.action === "register" ? "/register" : ""}`,
        { method: "POST", body: credentials },
      );
      if (body.action === "register") {
        await medusa("/store/customers", {
          method: "POST",
          token: auth.token,
          body: { email: credentials.email, ...names },
        });
        const refreshed = await medusa("/auth/customer/emailpass", {
          method: "POST",
          body: credentials,
        });
        auth.token = refreshed.token;
      }
      const { customer } = await medusa("/store/customers/me", {
        token: auth.token,
      });
      await setPrivate("customer", { token: auth.token });
      if (customer.metadata?.verified_email === customer.email?.toLowerCase())
        await medusa("/store/account/verification", {
          method: "POST",
          token: auth.token,
          body: { sync: true },
        });
      return json({ customer });
    }
    if (body.action === "logout") {
      await clearPrivate("customer");
      await clearPrivate("cart");
      await clearPrivate("receipt");
      return json({ success: true });
    }
    if (body.action === "reset-request") {
      await medusa("/auth/customer/emailpass/reset-password", {
        method: "POST",
        body: { identifier: email.parse(body.email) },
      });
      return json({
        message:
          "If an account exists, a reset link will be sent to its email address.",
      });
    }
    if (body.action === "reset-confirm") {
      await medusa("/auth/customer/emailpass/update", {
        method: "POST",
        token: z.string().min(20).max(4000).parse(body.token),
        body: {
          email: email.parse(body.email),
          password: password.parse(body.password),
        },
      });
      return json({ success: true });
    }
    const { token } = await authenticated();
    if (body.action === "profile") {
      const data = z
        .object({
          first_name: z.string().trim().min(1).max(80),
          last_name: z.string().trim().min(1).max(80),
          phone: z.string().max(30).optional(),
        })
        .parse(body.profile);
      return json(
        await medusa("/store/customers/me", {
          method: "POST",
          token,
          body: data,
        }),
      );
    }
    if (body.action === "address-save") {
      const data = address.parse(body.address);
      const id = body.id
        ? z
            .string()
            .regex(/^cuaddr_[a-zA-Z0-9]+$/)
            .parse(body.id)
        : null;
      return json(
        await medusa("/store/customers/me/addresses" + (id ? `/${id}` : ""), {
          method: "POST",
          token,
          body: data,
        }),
      );
    }
    if (body.action === "address-remove") {
      const id = z
        .string()
        .regex(/^cuaddr_[a-zA-Z0-9]+$/)
        .parse(body.id);
      return json(
        await medusa(`/store/customers/me/addresses/${id}`, {
          method: "DELETE",
          token,
        }),
      );
    }
    if (body.action === "verify-request")
      return json(
        await medusa("/store/account/verification", {
          method: "POST",
          token,
          body: {},
        }),
      );
    if (body.action === "verify-confirm")
      return json(
        await medusa("/store/account/verification", {
          method: "POST",
          token,
          body: {
            code: z
              .string()
              .regex(/^\d{6}$/)
              .parse(body.code),
          },
        }),
      );
  }
  throw new CommerceError("Request not found.", 404);
}
export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    return await dispatch(request, (await params).path);
  } catch (error) {
    return handle(error);
  }
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    return await dispatch(request, (await params).path);
  } catch (error) {
    return handle(error);
  }
}
function handle(error: unknown) {
  if (error instanceof z.ZodError)
    return json(
      { error: error.issues[0]?.message || "Please check your details." },
      400,
    );
  if (error instanceof CommerceError)
    return json({ error: error.message }, error.status);
  console.error(
    "Commerce request failed:",
    error instanceof Error ? error.message : "Unknown error",
  );
  return json(
    { error: "We couldn’t complete that request. Please try again." },
    502,
  );
}
