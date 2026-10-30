import "server-only";
import { createHmac } from "node:crypto";
import { medusa } from "./medusa";
export async function aftercare(orderId: string, body?: unknown) {
  const time = String(Date.now()),
    method = body === undefined ? "GET" : "POST";
  const secret =
    process.env.AFTERCARE_API_SECRET || process.env.ACCOUNT_SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("Configure AFTERCARE_API_SECRET for return requests.");
  const signature = createHmac("sha256", secret)
    .update(
      `aftercare-v1:${time}:${method}:${orderId}:${JSON.stringify(body || {})}`,
    )
    .digest("hex");
  return medusa(`/store/aftercare/${orderId}`, {
    method,
    body,
    headers: { "x-ceylon-time": time, "x-ceylon-signature": signature },
  });
}
