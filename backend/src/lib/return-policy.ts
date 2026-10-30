export function returnPolicy(value = process.env.RETURN_WINDOW_DAYS) {
  const days = Number(value || 14);
  return {
    windowDays: Number.isInteger(days) && days > 0 && days <= 365 ? days : 14,
    summary:
      "Unopened, sealed change-of-mind returns can be requested within the review window. Product issues are reviewed separately and are not restricted by this window. Please wait for approval before sending anything back. Your statutory rights are unaffected.",
  };
}
export function inReturnWindow(
  deliveredAt: number | null,
  days: number,
  now = Date.now(),
) {
  return (
    deliveredAt !== null &&
    Number.isFinite(deliveredAt) &&
    deliveredAt <= now &&
    now <= deliveredAt + days * 86400000
  );
}
