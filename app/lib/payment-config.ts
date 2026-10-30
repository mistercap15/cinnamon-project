import "server-only";
export function paymentConfig() {
  const provider = process.env.DEMO_PAYMENT_PROVIDER || "manual";
  if (provider === "stripe") {
    const key = process.env.STRIPE_PUBLISHABLE_KEY;
    if (!key?.startsWith("pk_test_") || process.env.DEMO_MODE !== "true")
      throw new Error("Stripe test checkout is not configured.");
    return { provider: "stripe" as const, publishableKey: key, testMode: true };
  }
  return { provider: "manual" as const, testMode: true };
}
