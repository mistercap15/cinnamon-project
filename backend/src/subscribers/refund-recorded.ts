import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { sendMail, localDemo } from "../lib/mail";
export default async function refundRecorded({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const payment = await container
    .resolve(Modules.PAYMENT)
    .retrievePayment(data.id, { relations: ["refunds"] });
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data: links } = await query.graph({
    entity: "order_payment_collection",
    fields: [
      "order.id",
      "order.email",
      "order.display_id",
      "order.currency_code",
    ],
    filters: { payment_collection_id: payment.payment_collection_id },
  });
  const order = (links[0] as any)?.order;
  if (!order?.email) return;
  const total = (payment.refunds || [])
    .filter((r: any) => r.status === "succeeded")
    .reduce((sum: number, r: any) => sum + Number(r.amount), 0);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: order.currency_code.toUpperCase(),
  }).format(total);
  await sendMail(
    order.email,
    `Refund update for Ceylon order #${order.display_id}`,
    `Confirmed refunds on this payment now total ${formatted}. ${localDemo() ? "These are demo records only. No real money has moved." : "Refunds are returned through the original payment method. Bank processing times vary."}\nView the refund entries on your order: ${process.env.FRONTEND_URL}/orders/${order.id}`,
  );
}
export const config: SubscriberConfig = { event: "payment.refunded" };
