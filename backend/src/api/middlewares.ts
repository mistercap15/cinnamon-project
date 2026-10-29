import {
  defineMiddlewares,
  authenticate,
  validateAndTransformBody,
} from "@medusajs/framework/http";
import { z } from "@medusajs/framework/zod";
const post = z.object({
  title: z.string().min(1).max(200),
  handle: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(150),
  excerpt: z.string().max(1000),
  content_html: z.string().min(1).max(100000),
  image: z.string().max(2000).nullable().optional(),
  category: z.string().min(1).max(80),
  author: z.string().max(100),
  published: z.boolean(),
  published_at: z.string().datetime().nullable().optional(),
});
export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/account/*",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/admin/journal*",
      middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
    },
    {
      matcher: "/admin/journal",
      method: "POST",
      middlewares: [validateAndTransformBody(post)],
    },
    {
      matcher: "/admin/journal/:id",
      method: "POST",
      middlewares: [validateAndTransformBody(post)],
    },
  ],
});
