import type { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import {
  createStockLocationsWorkflow,
  createInventoryLevelsWorkflow,
} from "@medusajs/medusa/core-flows";
export default async function seed({ container }: ExecArgs) {
  const name = "Ceylon returns — quarantine";
  let [location] = await container
    .resolve(Modules.STOCK_LOCATION)
    .listStockLocations({ name });
  if (!location) {
    const { result } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name,
            address: {
              city: "Colombo",
              country_code: "LK",
              address_1: "Demo return inspection area",
            },
          },
        ],
      },
    });
    location = result[0] as any;
  }
  const inventory = container.resolve(Modules.INVENTORY);
  const items = await inventory.listInventoryItems({});
  for (const item of items) {
    const existing = await inventory.listInventoryLevels({
      inventory_item_id: item.id,
      location_id: location.id,
    });
    if (!existing.length)
      await createInventoryLevelsWorkflow(container).run({
        input: {
          inventory_levels: [
            {
              inventory_item_id: item.id,
              location_id: location.id,
              stocked_quantity: 0,
            },
          ],
        },
      });
  }
  container
    .resolve("logger")
    .info(
      "Return quarantine location ready; it is not linked to a selling sales channel.",
    );
}
