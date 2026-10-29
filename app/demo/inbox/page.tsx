import { notFound } from "next/navigation";
import { isDemo } from "../../lib/medusa";
import { Inbox } from "./inbox";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Local demo inbox — CEYLON",
  robots: { index: false, follow: false },
};
export default function Page() {
  if (
    !isDemo() ||
    !["localhost", "127.0.0.1"].includes(
      new URL(process.env.SITE_URL || "https://invalid.example").hostname,
    )
  )
    notFound();
  return <Inbox />;
}
