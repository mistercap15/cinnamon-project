import type { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows";
export default async function sync({ container }: ExecArgs) {
  const provider =
    process.env.DEMO_PAYMENT_PROVIDER === "stripe"
      ? "pp_stripe_stripe"
      : "pp_system_default";
  const regions = await container.resolve(Modules.REGION).listRegions({});
  for (const region of regions) {
    if (region.name !== "Ceylon demo destinations") continue;
    await updateRegionsWorkflow(container).run({
      input: {
        selector: { id: region.id },
        update: { payment_providers: [provider] },
      },
    });
  }
  container.resolve("logger").info(`Demo region accepts ${provider} only.`);
}
