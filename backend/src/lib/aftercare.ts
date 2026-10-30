import { returnPolicy, inReturnWindow } from "./return-policy";
export const policy = returnPolicy;
import {
  ContainerRegistrationKeys,
  Modules,
  MedusaError,
} from "@medusajs/framework/utils";
import { createHmac, timingSafeEqual } from "node:crypto";
export const reasons = {
  change_mind: "Changed my mind",
  damaged: "Damaged product",
  incorrect: "Incorrect item",
  missing: "Missing item",
  quality: "Quality concern",
};
export function trusted(req: any, namespace = "aftercare") {
  const time = String(req.headers["x-ceylon-time"] || ""),
    signature = String(req.headers["x-ceylon-signature"] || "");
  const secret = process.env.AFTERCARE_API_SECRET;
  if (
    !secret ||
    !/^\d+$/.test(time) ||
    Math.abs(Date.now() - Number(time)) > 60000 ||
    !/^[a-f0-9]{64}$/.test(signature)
  )
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Unauthorized aftercare request.",
    );
  const expected = createHmac("sha256", secret)
    .update(
      `${namespace}-v1:${time}:${req.method}:${req.params.id}:${JSON.stringify(req.method === "GET" ? {} : req.body)}`,
    )
    .digest("hex");
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature)))
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Unauthorized aftercare request.",
    );
}
export async function orderData(scope: any, id: string) {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "email",
      "currency_code",
      "status",
      "created_at",
      "items.*",
      "items.detail.*",
      "fulfillments.id",
      "fulfillments.delivered_at",
      "payment_collections.payments.id",
      "payment_collections.payments.amount",
      "payment_collections.payments.captures.amount",
      "payment_collections.payments.refunds.id",
      "payment_collections.payments.refunds.amount",
      "payment_collections.payments.refunds.status",
      "payment_collections.payments.refunds.created_at",
    ],
    filters: { id },
  });
  if (!data[0])
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order not found.");
  return data[0];
}
export async function caseStatus(scope: any, c: any) {
  let native: any = null;
  if (c.native_return_id) {
    native = await scope
      .resolve(Modules.ORDER)
      .retrieveReturn(c.native_return_id, { relations: ["items"] });
  }
  return {
    ...c,
    return_status:
      native?.canceled_at || native?.status === "canceled"
        ? "cancelled"
        : native?.status || null,
    received_at: native?.received_at || null,
  };
}
export async function snapshot(scope: any, id: string) {
  const order = await orderData(scope, id),
    service = scope.resolve("aftercare");
  const requests = await service.listReturnRequests(
    { order_id: id },
    { order: { created_at: "DESC" }, take: 200 },
  );
  const cases = await Promise.all(
    requests.map((r: any) => caseStatus(scope, r)),
  );
  const deliveries = (order.fulfillments || [])
    .map((f: any) => f.delivered_at)
    .filter(Boolean)
    .map((v: string) => new Date(v).getTime());
  const deliveredAt = deliveries.length ? Math.max(...deliveries) : null;
  const p = policy();
  const withinWindow = inReturnWindow(deliveredAt, p.windowDays);
  const items = order.items.map((item: any) => {
    const held = requests
      .filter(
        (r: any) =>
          ["requested", "approved"].includes(r.status) && !r.native_return_id,
      )
      .reduce(
        (sum: number, r: any) =>
          sum +
          (r.items as any[])
            .filter((i) => i.id === item.id)
            .reduce((n, i) => n + i.quantity, 0),
        0,
      );
    const detail = item.detail || {};
    const nativeUsed = Math.max(
      Number(detail.return_requested_quantity) || 0,
      (Number(detail.return_received_quantity) || 0) +
        (Number(detail.return_dismissed_quantity) || 0),
    );
    return {
      id: item.id,
      title: item.product_title || item.title,
      variant: item.variant_title,
      thumbnail: item.thumbnail,
      quantity: Number(item.quantity),
      available: Math.max(
        0,
        (Number(detail.delivered_quantity) || 0) - nativeUsed - held,
      ),
    };
  });
  const payments = (order.payment_collections || []).flatMap(
    (c: any) => c.payments || [],
  );
  const refunds = payments.flatMap((p: any) =>
    (p.refunds || []).map((r: any) => ({
      id: r.id,
      amount: Number(r.amount),
      status: r.status,
      created_at: r.created_at,
    })),
  );
  return {
    order,
    requests: cases,
    items,
    policy: p,
    withinWindow,
    deliveredAt: deliveredAt ? new Date(deliveredAt).toISOString() : null,
    refunds,
    paid: payments.reduce(
      (sum: number, p: any) =>
        sum +
        (p.captures || []).reduce(
          (n: number, c: any) => n + Number(c.amount),
          0,
        ),
      0,
    ),
    refunded: refunds
      .filter((r: any) => r.status === "succeeded")
      .reduce((sum: number, r: any) => sum + r.amount, 0),
  };
}
export function publicSnapshot(data: any) {
  return {
    policy: data.policy,
    withinWindow: data.withinWindow,
    deliveredAt: data.deliveredAt,
    canRequest:
      data.order.status !== "canceled" &&
      data.items.some((i: any) => i.available > 0),
    items: data.items,
    refunds: data.refunds,
    refunded: data.refunded,
    paid: data.paid,
    requests: data.requests.map(({ reviewed_by, email, ...r }: any) => r),
  };
}
