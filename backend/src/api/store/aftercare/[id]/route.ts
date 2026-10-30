import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules, MedusaError } from "@medusajs/framework/utils";
import { z } from "@medusajs/framework/zod";
import {
  trusted,
  snapshot,
  publicSnapshot,
  reasons,
} from "../../../../lib/aftercare";
import { sendMail } from "../../../../lib/mail";
const input = z.object({
  action: z.literal("request"),
  client_key: z.string().uuid(),
  items: z
    .array(
      z.object({ id: z.string(), quantity: z.number().int().min(1).max(99) }),
    )
    .min(1)
    .max(30),
  reason: z.enum(["change_mind", "damaged", "incorrect", "missing", "quality"]),
  note: z.string().trim().min(10).max(2000),
  unopened: z.boolean(),
});
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  trusted(req);
  res.json(publicSnapshot(await snapshot(req.scope, req.params.id)));
}
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  trusted(req);
  const service = req.scope.resolve("aftercare") as any;
  return (req.scope.resolve(Modules.LOCKING) as any).execute(
    `aftercare:${req.params.id}`,
    async () => {
      const data = await snapshot(req.scope, req.params.id);
      const body = req.body as any;
      if (body.action === "withdraw") {
        const c = data.requests.find((r: any) => r.id === body.request_id);
        if (!c || c.status !== "requested")
          throw new MedusaError(
            MedusaError.Types.NOT_ALLOWED,
            "Only a pending request can be withdrawn.",
          );
        await service.updateReturnRequests({ id: c.id, status: "withdrawn" });
        return res.json(
          publicSnapshot(await snapshot(req.scope, req.params.id)),
        );
      }
      const parsed = input.safeParse(body);
      if (!parsed.success)
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Check the selected items, quantities and explanation (10–2000 characters).",
        );
      const value = parsed.data;
      const previous = data.requests.find(
        (r: any) => r.client_key === value.client_key,
      );
      if (previous) {
        const same =
          previous.reason === value.reason &&
          previous.note === value.note &&
          previous.unopened === value.unopened &&
          previous.items.length === value.items.length &&
          value.items.every((i) =>
            previous.items.some(
              (p: any) => p.id === i.id && p.quantity === i.quantity,
            ),
          );
        if (!same)
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            "This submission key has already been used for a different request.",
          );
        return res.json(publicSnapshot(data));
      }
      if (!data.order.email || data.order.status === "canceled")
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "This order cannot accept a return request.",
        );
      if (new Set(value.items.map((i) => i.id)).size !== value.items.length)
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Select each item only once.",
        );
      if (
        value.reason === "change_mind" &&
        (!value.unopened || !data.withinWindow)
      )
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "Change-of-mind requests require unopened, sealed items within the return window. Product issues can be submitted separately.",
        );
      const items = value.items.map((i) => {
        const line = data.items.find((a: any) => a.id === i.id);
        if (!line || i.quantity > line.available)
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            "The requested quantity is not available for return. Only delivered, unclaimed units can be selected.",
          );
        return { ...i, title: line.title, variant: line.variant };
      });
      const request = await service.createReturnRequests({
        client_key: value.client_key,
        order_id: data.order.id,
        order_number: data.order.display_id,
        email: data.order.email,
        items,
        reason: value.reason,
        note: value.note,
        unopened: value.unopened,
      });
      // Persist the request before notification; failed delivery must not invite duplicate submissions.
      try {
        await sendMail(
          data.order.email,
          `Ceylon return request ${request.id}`,
          `We received your request for order #${data.order.display_id}. Reason: ${reasons[value.reason]}. Please wait for approval and return instructions before sending anything back. View updates at ${process.env.FRONTEND_URL}/orders/${data.order.id}`,
        );
      } catch (e) {
        req.scope
          .resolve("logger")
          .error(
            "Return request saved, but its notification could not be sent.",
          );
      }
      res
        .status(201)
        .json(publicSnapshot(await snapshot(req.scope, req.params.id)));
    },
  );
}
