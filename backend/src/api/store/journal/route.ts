import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve("journal") as any;
  const posts = await service.listPosts(
    { published: true },
    { take: 100, order: { published_at: "DESC" } },
  );
  res.json({ posts });
}
