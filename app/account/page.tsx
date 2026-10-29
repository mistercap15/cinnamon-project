import type { Metadata } from "next";
import { Account } from "./account";
import { isDemo } from "../lib/medusa";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Your account — CEYLON",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <Account demo={isDemo()} />;
}
