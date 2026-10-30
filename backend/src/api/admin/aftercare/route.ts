import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { caseStatus, policy } from "../../../lib/aftercare";
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const requests = await (
    req.scope.resolve("aftercare") as any
  ).listReturnRequests({}, { take: 200, order: { created_at: "DESC" } });
  res.json({
    requests: await Promise.all(
      requests.map((r: any) => caseStatus(req.scope, r)),
    ),
    policy: policy(),
  });
}
