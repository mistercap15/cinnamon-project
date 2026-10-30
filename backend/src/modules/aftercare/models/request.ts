import { model } from "@medusajs/framework/utils";
export const ReturnRequest = model.define("aftercare_request", {
  id: model.id({ prefix: "rma" }).primaryKey(),
  client_key: model.text().unique(),
  order_id: model.text(),
  order_number: model.number(),
  email: model.text(),
  items: model.json(),
  reason: model.text(),
  note: model.text(),
  unopened: model.boolean().default(false),
  status: model
    .enum(["requested", "approved", "declined", "withdrawn"])
    .default("requested"),
  resolution: model.enum(["return", "refund_only"]).nullable(),
  native_return_id: model.text().nullable(),
  reply: model.text().nullable(),
  reviewed_at: model.dateTime().nullable(),
  reviewed_by: model.text().nullable(),
});
