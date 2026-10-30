"use client";
import { commerce } from "./commerce-client";
export async function completeCheckout() {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      return await commerce("checkout", {
        action: "complete",
        acknowledged: true,
      });
    } catch (error) {
      const e = error as Error & { status?: number };
      if (
        attempt === 5 ||
        e.status !== 409 ||
        !/already.*complet|being completed/i.test(e.message)
      )
        throw e;
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
  }
  throw new Error("Your order is still being confirmed. Please try again.");
}
