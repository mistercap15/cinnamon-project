export async function commerce(path: string, body?: unknown) {
  const response = await fetch(`/api/commerce/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Please try again in a moment.");
  return data;
}
export function amount(value: number | undefined, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(Number(value) || 0);
}
export function orderDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
export function statusLabel(value: string) {
  return (value || "pending")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}
