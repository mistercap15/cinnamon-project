import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { Modules } from "@medusajs/framework/utils";
import { sendMail } from "../lib/mail";
export default async function orderPlaced({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const order = await container.resolve(Modules.ORDER).retrieveOrder(data.id);
  if (order.email)
    await sendMail(
      order.email,
      `Your Ceylon order #${order.display_id}`,
      `Thank you. Your showcase order #${order.display_id} has been placed.\nOrder reference: ${order.id}\nThis is a test order. No real funds have moved.\nSign in or register using this email at ${process.env.FRONTEND_URL}/account, then verify your email to add guest orders to your history.`,
    );
}
export const config: SubscriberConfig = { event: "order.placed" };
