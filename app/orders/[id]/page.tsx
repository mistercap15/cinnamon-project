import type { Metadata } from "next";
import { OrderDetails } from "./order";
export const metadata: Metadata = {
  title: "Your order — CEYLON",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <OrderDetails id={(await params).id} />;
}
