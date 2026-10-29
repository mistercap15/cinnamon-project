import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { randomInt, createHmac, timingSafeEqual } from "node:crypto";
import { sendMail } from "../../../../lib/mail";
const digest = (id: string, code: string) =>
  createHmac("sha256", process.env.JWT_SECRET!)
    .update(`${id}:${code}`)
    .digest("hex");
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) {
  const id = req.auth_context.actor_id,
    journal = req.scope.resolve("journal") as any;
  const locking = req.scope.resolve(Modules.LOCKING) as any;
  return locking.execute(`verify-email:${id}`, async () => {
    const customer = await req.scope
      .resolve(Modules.CUSTOMER)
      .retrieveCustomer(id);
    const email = customer.email?.trim().toLowerCase();
    if (!email)
      return res.status(400).json({ message: "An email address is required." });
    const claim = async () => {
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
      const { data: orders } = await query.graph({
        entity: "order",
        fields: [
          "id",
          "customer_id",
          "email",
          "customer.has_account",
          "metadata",
        ],
        filters: { email },
      });
      const eligible = orders.filter(
        (o: any) =>
          o.email?.toLowerCase() === email &&
          o.customer_id !== id &&
          o.customer?.has_account !== true,
      );
      if (eligible.length)
        await req.scope
          .resolve(Modules.ORDER)
          .updateOrders(
            eligible.map((o: any) => ({
              id: o.id,
              customer_id: id,
              metadata: {
                ...o.metadata,
                guest_claimed_at: new Date().toISOString(),
                guest_claim_method: "verified-email",
              },
            })),
          );
      return eligible.length;
    };
    const [old] = await journal.listEmailVerifications({ customer_id: id });
    if ((req.body as any)?.sync) {
      if (!old?.verified_at || old.email !== email)
        return res.status(403).json({ message: "Verify your email first." });
      return res.json({ linked: await claim() });
    }
    const code = (req.body as { code?: string })?.code;
    if (code === undefined) {
      if (
        old &&
        Date.now() - new Date(old.updated_at).getTime() < 60000 &&
        !old.verified_at
      )
        return res
          .status(429)
          .json({
            message: "Please wait a minute before requesting another code.",
          });
      const next = String(randomInt(100000, 1000000));
      const data = {
        customer_id: id,
        email,
        code_hash: digest(id, next),
        expires_at: new Date(Date.now() + 600000),
        attempts: 0,
        verified_at: null,
      };
      if (old) await journal.updateEmailVerifications({ id: old.id, ...data });
      else await journal.createEmailVerifications(data);
      await sendMail(
        email,
        "Verify your Ceylon email",
        `Your Ceylon verification code is ${next}. It expires in 10 minutes. This verifies ownership before linking guest orders. Never share this code.`,
      );
      return res.json({
        message: "A verification code has been sent to your account email.",
      });
    }
    if (
      !/^\d{6}$/.test(code) ||
      !old ||
      old.email !== email ||
      old.verified_at ||
      new Date(old.expires_at).getTime() < Date.now() ||
      old.attempts >= 5
    )
      return res
        .status(400)
        .json({
          message: "This code is invalid or has expired. Request a new code.",
        });
    await journal.updateEmailVerifications({
      id: old.id,
      attempts: old.attempts + 1,
    });
    if (
      !timingSafeEqual(
        Buffer.from(old.code_hash),
        Buffer.from(digest(id, code)),
      )
    )
      return res
        .status(400)
        .json({ message: "That code does not match. Please try again." });
    const linked = await claim();
    await req.scope
      .resolve(Modules.CUSTOMER)
      .updateCustomers(id, {
        metadata: {
          ...customer.metadata,
          email_verified_at: new Date().toISOString(),
          verified_email: email,
        },
      });
    await journal.updateEmailVerifications({
      id: old.id,
      verified_at: new Date(),
    });
    res.json({
      verified: true,
      linked,
      message: `Email verified. ${linked} guest order${linked === 1 ? "" : "s"} added to your history.`,
    });
  });
}
