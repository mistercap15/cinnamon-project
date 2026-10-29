import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { localDemo, demoInbox } from "../../../../lib/mail";
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  if (!localDemo()) return res.status(404).json({ message: "Not found." });
  res.setHeader("Cache-Control", "no-store");
  res.json({ messages: demoInbox() });
}
