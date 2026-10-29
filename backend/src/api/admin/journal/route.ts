import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const posts = await (req.scope.resolve("journal") as any).listPosts(
    {},
    { take: 200, order: { created_at: "DESC" } },
  );
  res.json({ posts });
}
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const post = await (req.scope.resolve("journal") as any).createPosts(
    req.validatedBody,
  );
  res.status(201).json({ post });
}
