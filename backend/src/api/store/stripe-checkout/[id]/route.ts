import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  ContainerRegistrationKeys,
  Modules,
  MedusaError,
} from "@medusajs/framework/utils";
import { trusted } from "../../../../lib/aftercare";
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  trusted(req, "stripe-checkout");
  if (
    !/^cart_[a-zA-Z0-9]+$/.test(req.params.id) ||
    process.env.DEMO_PAYMENT_PROVIDER !== "stripe"
  )
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Stripe checkout is not enabled.",
    );
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "cart",
    fields: [
      "id",
      "payment_collection.amount",
      "payment_collection.currency_code",
      "payment_collection.payment_sessions.*",
    ],
    filters: { id: req.params.id },
  });
  const session = (data[0] as any)?.payment_collection?.payment_sessions?.find(
    (s: any) => s.provider_id === "pp_stripe_stripe",
  );
  if (!session || session.data?.livemode !== false)
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "A Stripe test payment session is required.",
    );
  // Stripe's provider re-reads the PaymentIntent. A browser claim that payment
  // succeeded is never sufficient to authorize or complete an order.
  const payment = await req.scope
    .resolve(Modules.PAYMENT)
    .authorizePaymentSession(session.id, {});
  if (!payment)
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "The Stripe test payment has not been confirmed.",
    );
  const full = await req.scope
    .resolve(Modules.PAYMENT)
    .retrievePayment(payment.id, { relations: ["captures", "refunds"] });
  const collection = (data[0] as any).payment_collection;
  const captured = (full.captures || []).reduce(
    (sum: number, c: any) => sum + Number(c.amount),
    0,
  );
  if ((full.refunds || []).some((r: any) => r.status !== "failed"))
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "This test payment has been refunded. Please begin a new checkout.",
    );
  if (
    full.currency_code !== collection.currency_code ||
    Math.abs(Number(full.amount) - Number(collection.amount)) > 0.000001 ||
    captured + 0.000001 < Number(collection.amount)
  )
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "The test payment has not been fully captured for this checkout total.",
    );
  res.json({ status: "captured" });
}
