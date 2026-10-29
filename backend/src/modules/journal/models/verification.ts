import { model } from "@medusajs/framework/utils";
export const EmailVerification = model.define("email_verification", {
  id: model.id({ prefix: "verify" }).primaryKey(),
  customer_id: model.text().unique(),
  email: model.text(),
  code_hash: model.text(),
  expires_at: model.dateTime(),
  attempts: model.number().default(0),
  verified_at: model.dateTime().nullable(),
});
