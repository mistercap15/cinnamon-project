"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Leaf, ArrowUpRight } from "lucide-react";
import { completeCheckout } from "../../lib/complete-checkout";
import { useBag } from "../../components/storefront";
export function PaymentReturn() {
  const router = useRouter(),
    { clear } = useBag();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const started = useRef(false);
  async function finish() {
    setBusy(true);
    setError("");
    try {
      const result = await completeCheckout();
      clear();
      router.replace(`/orders/${result.orderId}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    history.replaceState(null, "", "/checkout/return");
    finish();
  }, []);
  return (
    <main id="main-content" className="commerce-page">
      <div className="commerce-loading">
        <Leaf size={38} />
        <h1>{error ? "A little more time." : "Confirming your order."}</h1>
        <p role={error ? "alert" : "status"}>
          {error ||
            "Checking your test payment and gathering your order details…"}
        </p>
        {error && (
          <>
            <button className="button dark" disabled={busy} onClick={finish}>
              Check again <ArrowUpRight size={17} />
            </button>
            <Link className="text-link" href="/checkout">
              Return to checkout
            </Link>
            <Link className="text-link" href="/account">
              Your order history
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
