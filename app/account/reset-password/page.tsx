import type { Metadata } from "next";
import { ResetPassword } from "./reset";
export const metadata: Metadata = {
  title: "A fresh start — CEYLON",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <ResetPassword />;
}
