import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { sendMail } from "../lib/mail";
export default async function passwordReset({
  event: { data },
}: SubscriberArgs<{ entity_id: string; actor_type: string; token: string }>) {
  if (data.actor_type !== "customer") return;
  const url = new URL("/account/reset-password", process.env.FRONTEND_URL);
  url.searchParams.set("token", data.token);
  url.searchParams.set("email", data.entity_id);
  await sendMail(
    data.entity_id,
    "Reset your Ceylon password",
    `Use this one-time link to reset your password:\n${url.href}\nIf you did not request this, ignore this message.`,
  );
}
export const config: SubscriberConfig = { event: "auth.password_reset" };
