import { spawn } from "node:child_process";
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { root, stripeConfig } from "./demo-config.mjs";
export async function startStripeListener(track) {
  const stripe = stripeConfig();
  if (stripe.provider !== "stripe") return;
  if (process.env.STRIPE_WEBHOOK_MODE === "external") {
    if (!stripe.webhookSecret?.startsWith("whsec_"))
      throw new Error("External webhook mode requires STRIPE_WEBHOOK_SECRET.");
    return;
  }
  mkdirSync(path.join(root, ".demo/stripe-cli"), { recursive: true });
  const log = path.join(root, ".demo/stripe-cli/webhooks.log");
  const child = spawn(
    path.join(root, "node_modules/.bin/stripe"),
    [
      "--config",
      path.join(root, ".demo/stripe-cli/config.toml"),
      "--color",
      "off",
      "listen",
      "--forward-to",
      "http://127.0.0.1:9000/hooks/payment/stripe_stripe",
      "--events",
      "payment_intent.created,payment_intent.processing,payment_intent.requires_action,payment_intent.amount_capturable_updated,payment_intent.succeeded,payment_intent.payment_failed,payment_intent.canceled",
    ],
    {
      cwd: root,
      env: {
        ...process.env,
        STRIPE_API_KEY: stripe.secretKey,
        STRIPE_NO_AUTO_UPDATE: "1",
      },
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  track(child);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () =>
        reject(
          new Error(
            "Stripe webhook listener timed out. Check .demo/stripe-cli/webhooks.log and your test credentials.",
          ),
        ),
      45000,
    );
    let output = "";
    const receive = (chunk) => {
      const text = chunk.toString();
      appendFileSync(
        log,
        text.replace(/whsec_[a-zA-Z0-9]+/g, "[webhook secret hidden]"),
        { mode: 0o600 },
      );
      output = (output + text).slice(-10000);
      const secret = output.match(/whsec_[a-zA-Z0-9]+/)?.[0];
      if (secret) {
        clearTimeout(timeout);
        process.env.STRIPE_WEBHOOK_SECRET = secret;
        resolve();
      }
    };
    child.stdout.on("data", receive);
    child.stderr.on("data", receive);
    child.once("error", () => {
      clearTimeout(timeout);
      reject(
        new Error("Unable to start the Stripe CLI. Run npm ci to install it."),
      );
    });
    child.once("exit", () => {
      clearTimeout(timeout);
      reject(
        new Error(
          "Stripe webhook listener stopped. Review .demo/stripe-cli/webhooks.log.",
        ),
      );
    });
  });
  console.log("Stripe TEST webhook forwarding is ready.");
}
