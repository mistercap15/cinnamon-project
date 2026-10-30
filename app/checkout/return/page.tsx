import { PaymentReturn } from "./return";
export const metadata = {
  title: "Confirming your test order — CEYLON",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default function Page() {
  return <PaymentReturn />;
}
