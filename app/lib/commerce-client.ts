export async function commerce(path: string, body?: unknown) {
  const response = await fetch(`/api/commerce/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok)
    throw Object.assign(
      new Error(data.error || "Please try again in a moment."),
      { status: response.status },
    );
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

// Medusa keeps administrative, payment, and fulfillment states separately.
// A delivered order can still have administrative status "pending".
export function orderProgress(order: {
  status?: string;
  fulfillment_status?: string;
  payment_status?: string;
}) {
  if (order.status === "canceled") return "Canceled";
  const fulfillment: Record<string, string> = {
    partially_fulfilled: "Partially fulfilled",
    fulfilled: "Fulfilled",
    partially_shipped: "Partially shipped",
    shipped: "Shipped",
    partially_delivered: "Partially delivered",
    delivered: "Delivered",
  };
  if (fulfillment[order.fulfillment_status])
    return fulfillment[order.fulfillment_status];
  if (order.status && order.status !== "pending")
    return statusLabel(order.status);
  if (["not_paid", "awaiting"].includes(order.payment_status))
    return "Awaiting payment";
  return "Order placed";
}

export function orderMessage(order: Parameters<typeof orderProgress>[0]) {
  const progress = orderProgress(order);
  switch (progress) {
    case "Canceled":
      return {
        headline: "Order cancelled.",
        message:
          "This order has been cancelled. Check the payment status below for any refund updates.",
        icon: "cancel",
      } as const;
    case "Delivered":
      return {
        headline: "Delivered.",
        message:
          "Your order has been marked as delivered. Thank you for making a little room for Ceylon.",
        icon: "check",
      } as const;
    case "Partially delivered":
      return {
        headline: "Partly delivered.",
        message:
          "Part of your order has been marked as delivered. The remaining items are not yet marked as delivered.",
        icon: "package",
      } as const;
    case "Shipped":
      return {
        headline: "On its way.",
        message:
          "Your order has shipped. A little island warmth is making its way to you.",
        icon: "truck",
      } as const;
    case "Partially shipped":
      return {
        headline: "Partly on its way.",
        message:
          "Some items have shipped. The remaining items have not shipped yet.",
        icon: "truck",
      } as const;
    case "Fulfilled":
      return {
        headline: "Ready for dispatch.",
        message:
          "Your order has been prepared. We’ll update its status when it ships.",
        icon: "package",
      } as const;
    case "Partially fulfilled":
      return {
        headline: "Coming together.",
        message:
          "Part of your order has been prepared. The remaining items are still being prepared.",
        icon: "package",
      } as const;
    case "Awaiting payment":
      return {
        headline: "Awaiting payment.",
        message:
          "Your order is awaiting payment. Check the payment status below for details.",
        icon: "clock",
      } as const;
    case "Completed":
      return {
        headline: "Order complete.",
        message: "Your order is complete. Thank you for choosing Ceylon.",
        icon: "check",
      } as const;
    default:
      return {
        headline: "Order received.",
        message:
          "Your order is placed. We’ll update its status as it is prepared and shipped.",
        icon: "check",
      } as const;
  }
}
