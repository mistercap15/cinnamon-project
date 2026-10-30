"use client";
import { ButtonIcon } from "./button-icon";
import { useMemo, useState } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js/pure";
import { ArrowUpRight, LockKeyhole } from "lucide-react";
import { completeCheckout } from "../lib/complete-checkout";
export function StripePayment({
  publishableKey,
  clientSecret,
  cart,
  onComplete,
}: {
  publishableKey: string;
  clientSecret: string;
  cart: any;
  onComplete: (orderId: string) => void;
}) {
  const stripe = useMemo(() => loadStripe(publishableKey), [publishableKey]);
  return (
    <Elements
      stripe={stripe}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#293b29",
            colorBackground: "#f6f2e8",
            colorText: "#293b29",
            colorDanger: "#9c4b2c",
            borderRadius: "2px",
            fontFamily: "Arial, sans-serif",
            spacingUnit: "5px",
          },
        },
      }}
    >
      <Payment cart={cart} onComplete={onComplete} />
    </Elements>
  );
}
function Payment({
  cart,
  onComplete,
}: {
  cart: any;
  onComplete: (orderId: string) => void;
}) {
  const stripe = useStripe(),
    elements = useElements();
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [paid, setPaid] = useState(false),
    [error, setError] = useState("");
  async function pay(event: React.MouseEvent<HTMLButtonElement>) {
    if (
      !event.currentTarget.form?.reportValidity() ||
      !stripe ||
      !elements ||
      busy
    )
      return;
    setBusy(true);
    setError("");
    try {
      if (!paid) {
        const { error: paymentError, paymentIntent } =
          await stripe.confirmPayment({
            elements,
            confirmParams: {
              return_url: new URL("/checkout/return", location.origin).href,
              payment_method_data: {
                billing_details: {
                  name: `${cart.billing_address?.first_name || ""} ${cart.billing_address?.last_name || ""}`.trim(),
                  email: cart.email,
                  phone: cart.billing_address?.phone || undefined,
                  address: {
                    line1: cart.billing_address?.address_1,
                    line2: cart.billing_address?.address_2 || undefined,
                    city: cart.billing_address?.city,
                    state: cart.billing_address?.province || undefined,
                    postal_code: cart.billing_address?.postal_code,
                    country: cart.billing_address?.country_code?.toUpperCase(),
                  },
                },
              },
            },
            redirect: "if_required",
          });
        if (paymentError)
          throw new Error(
            paymentError.message ||
              "The test payment was not completed. Please try another test card.",
          );
        if (
          !paymentIntent ||
          !["succeeded", "requires_capture"].includes(paymentIntent.status)
        )
          throw new Error(
            "Your test payment is still processing. Please wait and try again.",
          );
        setPaid(true);
      }
      const result = await completeCheckout();
      onComplete(result.orderId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="stripe-payment">
      <div className="demo-payment">
        <LockKeyhole size={23} />
        <div>
          <h3>Stripe test payment</h3>
          <p>Use a Stripe test card only. No real money will be charged.</p>
        </div>
      </div>
      <PaymentElement
        options={{
          layout: "tabs",
          defaultValues: {
            billingDetails: {
              email: cart.email,
              name: `${cart.billing_address?.first_name || ""} ${cart.billing_address?.last_name || ""}`.trim(),
              address: {
                country: cart.billing_address?.country_code?.toUpperCase(),
              },
            },
          },
          wallets: { applePay: "never", googlePay: "never" },
        }}
        onReady={() => setReady(true)}
        onLoadError={() =>
          setError(
            "Stripe’s payment form could not load. Check your connection, then reload checkout.",
          )
        }
      />
      {!ready && !error && (
        <p role="status" className="stripe-loading">
          Opening Stripe’s secure test checkout…
        </p>
      )}
      <p className="stripe-test-hint">
        Test card: <strong>4242 4242 4242 4242</strong> · any future expiry ·
        any 3-digit CVC.
      </p>
      <label className="check-consent">
        <input type="checkbox" name="acknowledged" required />I understand this
        is a Stripe test payment and will use test card details only.
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
          {paid &&
            " Your payment was confirmed; retrying this button only finalizes the order."}
        </p>
      )}
      <button
        className="button dark stripe-pay-button"
        type="button"
        aria-busy={busy}
        disabled={!stripe || !elements || !ready || busy}
        onClick={pay}
      >
        {busy
          ? "Confirming your test order…"
          : paid
            ? "Finish confirming your order"
            : "Pay & place test order"}
        <ButtonIcon loading={busy}><ArrowUpRight size={18} /></ButtonIcon>
      </button>
    </div>
  );
}
