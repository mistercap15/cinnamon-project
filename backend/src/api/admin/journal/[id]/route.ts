import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const post = await (req.scope.resolve("journal") as any).updatePosts({
    id: req.params.id,
    ...(req.validatedBody as object),
  });
  res.json({ post });
}
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  await (req.scope.resolve("journal") as any).deletePosts(req.params.id);
  res.json({ id: req.params.id, deleted: true });
}
