import { model } from "@medusajs/framework/utils";
export const Post = model.define("journal_post", {
  id: model.id({ prefix: "post" }).primaryKey(),
  handle: model.text().unique(),
  title: model.text(),
  excerpt: model.text(),
  content_html: model.text(),
  image: model.text().nullable(),
  category: model.text(),
  author: model.text().default("The Ceylon journal"),
  published: model.boolean().default(false),
  published_at: model.dateTime().nullable(),
});
