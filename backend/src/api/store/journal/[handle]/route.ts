import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const [post] = await (req.scope.resolve("journal") as any).listPosts({
    handle: req.params.handle,
    published: true,
  });
  if (!post) return res.status(404).json({ message: "Story not found." });
  res.json({ post });
}
