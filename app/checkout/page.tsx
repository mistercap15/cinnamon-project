import type { Metadata } from "next";
import { Checkout } from "./checkout";
export const metadata: Metadata = {
  title: "Your little collection — Checkout",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <Checkout />;
}
