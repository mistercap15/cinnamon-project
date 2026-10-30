import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import {
  Modules,
  MedusaError,
  ContainerRegistrationKeys,
} from "@medusajs/framework/utils";
import { z } from "@medusajs/framework/zod";
import { approveReturnWorkflow } from "../../../../workflows/approve-return";
import { sendMail } from "../../../../lib/mail";
const schema = z.object({
  action: z.enum(["approve", "decline"]),
  resolution: z.enum(["return", "refund_only"]).optional(),
  location_id: z.string().optional(),
  reply: z.string().trim().min(10).max(3000),
});
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) {
  const value = schema.safeParse(req.body);
  if (!value.success)
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Provide a decision and a customer message of 10–3000 characters.",
    );
  const service = req.scope.resolve("aftercare") as any;
  const c = await service.retrieveReturnRequest(req.params.id);
  return (req.scope.resolve(Modules.LOCKING) as any).execute(
    `aftercare:${c.order_id}`,
    async () => {
      const current = await service.retrieveReturnRequest(c.id);
      if (current.status !== "requested")
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "This request has already been reviewed.",
        );
      const body = value.data;
      let nativeId: string | null = null;
      if (body.action === "approve" && body.resolution !== "refund_only") {
        if (!body.location_id)
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            "Select a return stock location. Use a quarantine location for food.",
          );
        const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
        const { data: prior } = await query.graph({
          entity: "return",
          fields: ["id", "metadata", "requested_at"],
          filters: { order_id: c.order_id },
        });
        const recovered = prior.find(
          (r: any) =>
            r.metadata?.aftercare_request_id === c.id && r.requested_at,
        );
        if (recovered) nativeId = recovered.id;
        else {
          const { result } = await approveReturnWorkflow(req.scope).run({
            input: {
              order_id: c.order_id,
              request_id: c.id,
              location_id: body.location_id,
              items: c.items,
              created_by: req.auth_context.actor_id,
            },
          });
          nativeId = (result as any).return_id;
        }
      }
      const updated = await service.updateReturnRequests({
        id: c.id,
        status: body.action === "approve" ? "approved" : "declined",
        resolution:
          body.action === "approve" ? body.resolution || "return" : null,
        native_return_id: nativeId,
        reply: body.reply,
        reviewed_at: new Date(),
        reviewed_by: req.auth_context.actor_id,
      });
      try {
        await sendMail(
          c.email,
          `Ceylon return request ${body.action === "approve" ? "approved" : "reviewed"}`,
          `Order #${c.order_number}\n${body.reply}\n${body.action === "approve" ? "A refund is a separate step and will be shown on your order once processed." : ""}\nView updates: ${process.env.FRONTEND_URL}/orders/${c.order_id}`,
        );
      } catch {
        req.scope
          .resolve("logger")
          .error(
            "Return decision saved, but its notification could not be sent.",
          );
      }
      res.json({ request: updated });
    },
  );
}
