"use client";
import { ButtonIcon } from "../components/button-icon";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  LockKeyhole,
  Leaf,
  Truck,
} from "lucide-react";
import { commerce, amount } from "../lib/commerce-client";
import { AddressFields } from "../components/address-fields";
import { useBag } from "../components/storefront";
import { StripePayment } from "../components/stripe-payment";
export function Checkout() {
  const { clear } = useBag();
  const [data, setData] = useState<any>(null),
    [step, setStep] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [method, setMethod] = useState(""),
    [savedAddress, setSavedAddress] = useState("");
  const router = useRouter();
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!panel.current) return;
    panel.current.focus({ preventScroll: true });
    panel.current.scrollIntoView({ behavior: "instant", block: "start" });
  }, [step]);
  useEffect(() => {
    commerce("checkout")
      .then((d) => {
        setData(d);
        setMethod(d.cart.shipping_methods?.[0]?.shipping_option_id || "");
      })
      .catch((e) => setError(e.message));
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      if (step === 0) {
        const { email, ...address } = Object.fromEntries(form);
        setData(
          await commerce("checkout", { action: "address", email, address }),
        );
        setStep(1);
      } else if (step === 1) {
        const shipping = await commerce("checkout", {
          action: "shipping",
          option_id: method,
        });
        setData(
          shipping.payment?.provider === "stripe"
            ? await commerce("checkout", { action: "payment" })
            : shipping,
        );
        setStep(2);
      } else {
        if (data.payment?.provider === "stripe") return;
        const result = await commerce("checkout", {
          action: "complete",
          acknowledged: form.get("acknowledged") === "on",
        });
        clear();
        router.push(`/orders/${result.orderId}`);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const cart = data?.cart,
    currency = cart?.currency_code;
  return (
    <main id="main-content" className="commerce-page">
      <div className="commerce-heading">
        <Link className="back-link" href="/shop">
          <ArrowLeft size={15} />
          Back to the collection
        </Link>
        <p className="eyebrow">FROM OUR ISLAND TO YOUR EVERYDAY</p>
        <h1>
          A little closer
          <br />
          to <em>your pantry.</em>
        </h1>
        <p>Good things, thoughtfully gathered.</p>
      </div>
      {!cart ? (
        <div className="commerce-loading" role="status">
          {error ? (
            <>
              <Leaf size={35} />
              <h2>Your collection is waiting.</h2>
              <p>{error}</p>
              <Link className="button dark" href="/shop">
                Explore the shop <ArrowUpRight size={18} />
              </Link>
            </>
          ) : (
            <p>Gathering your little collection…</p>
          )}
        </div>
      ) : (
        <>
          <div className="checkout-steps" aria-label="Checkout progress">
            {["Your details", "Delivery", "Review & place order"].map(
              (label, i) => (
                <button
                  key={label}
                  type="button"
                  disabled={i > step || busy}
                  aria-current={i === step ? "step" : undefined}
                  onClick={() => setStep(i)}
                >
                  <span>
                    {i < step ? (
                      <Check size={14} />
                    ) : (
                      String(i + 1).padStart(2, "0")
                    )}
                  </span>
                  {label}
                </button>
              ),
            )}
          </div>
          <div className="checkout-layout">
            <section
              ref={panel}
              tabIndex={-1}
              aria-label={
                ["Your details", "Delivery", "Review your order"][step]
              }
              className="checkout-form-panel"
            >
              <form onSubmit={submit} key={step}>
                {step === 0 ? (
                  <>
                    <div className="panel-heading">
                      <h2>Your details.</h2>
                      <p>
                        No account needed. Already have one?{" "}
                        <Link href="/account">Sign in</Link>
                      </p>
                    </div>
                    <label className="contact-field">
                      Email address
                      <input
                        name="email"
                        aria-label="Email address"
                        type="email"
                        autoComplete="email"
                        required
                        maxLength={254}
                        defaultValue={cart.email || data.customer?.email || ""}
                      />
                      <small>
                        We’ll send your order confirmation here. Use this email
                        to find guest orders in your account later.
                      </small>
                    </label>
                    <h3>Where shall we send it?</h3>
                    {data.customer?.addresses?.length > 0 && (
                      <label className="contact-field">
                        Saved delivery address
                        <select
                          value={savedAddress}
                          onChange={(e) => setSavedAddress(e.target.value)}
                        >
                          <option value="">Enter a delivery address</option>
                          {data.customer.addresses.map((a: any) => (
                            <option key={a.id} value={a.id}>
                              {a.first_name} {a.last_name} — {a.address_1},{" "}
                              {a.city}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <AddressFields
                      key={savedAddress}
                      value={
                        data.customer?.addresses?.find(
                          (a: any) => a.id === savedAddress,
                        ) ||
                        cart.shipping_address || {
                          first_name: data.customer?.first_name,
                          last_name: data.customer?.last_name,
                          phone: data.customer?.phone,
                        }
                      }
                      countries={cart.region?.countries}
                    />
                  </>
                ) : step === 1 ? (
                  <>
                    <div className="panel-heading">
                      <h2>A little on its way.</h2>
                      <p>Choose the delivery that suits your everyday.</p>
                    </div>
                    <div className="delivery-options">
                      {data.shippingOptions.map((option: any) => (
                        <label
                          className={method === option.id ? "selected" : ""}
                          key={option.id}
                        >
                          <input
                            type="radio"
                            name="delivery"
                            value={option.id}
                            checked={method === option.id}
                            required
                            onChange={() => setMethod(option.id)}
                          />
                          <Truck size={20} />
                          <span>
                            <strong>{option.name}</strong>
                            <small>{option.type?.description}</small>
                          </span>
                          <b>{amount(option.amount, currency)}</b>
                        </label>
                      ))}
                    </div>
                    {!data.shippingOptions.length && (
                      <p role="alert">
                        There are no delivery options for this address. Please
                        go back and select another destination.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="panel-heading">
                      <h2>One last little look.</h2>
                      <p>A moment to make sure everything is just right.</p>
                    </div>
                    <div className="review-address">
                      <div>
                        <p className="eyebrow">DELIVER TO</p>
                        <h3>
                          {cart.shipping_address.first_name}{" "}
                          {cart.shipping_address.last_name}
                        </h3>
                        <p>
                          {cart.shipping_address.address_1}
                          {cart.shipping_address.address_2 &&
                            `, ${cart.shipping_address.address_2}`}
                          <br />
                          {cart.shipping_address.city},{" "}
                          {cart.shipping_address.postal_code}
                          <br />
                          {cart.shipping_address.country_code.toUpperCase()}
                          <br />
                          {cart.email}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => setStep(0)}
                      >
                        Edit details
                      </button>
                    </div>
                    {data.payment?.provider === "stripe" ? (
                      <StripePayment
                        key={data.clientSecret}
                        publishableKey={data.payment.publishableKey}
                        clientSecret={data.clientSecret}
                        cart={cart}
                        onComplete={(orderId) => {
                          clear();
                          router.push(`/orders/${orderId}`);
                        }}
                      />
                    ) : (
                      <>
                        <div className="demo-payment">
                          <LockKeyhole size={23} />
                          <div>
                            <h3>Demo payment</h3>
                            <p>
                              This showcase uses Medusa’s manual test payment.
                              No card details are needed and no money will be
                              charged.
                            </p>
                          </div>
                        </div>
                        <label className="check-consent">
                          <input type="checkbox" name="acknowledged" required />
                          I understand this is a demonstration order and no
                          payment will be collected.
                        </label>
                      </>
                    )}
                  </>
                )}
                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}
                <div className="checkout-actions">
                  {step > 0 && (
                    <button
                      type="button"
                      className="text-link"
                      aria-busy={busy} disabled={busy}
                      onClick={() => setStep((s) => s - 1)}
                    >
                      <ArrowLeft size={15} />
                      Back
                    </button>
                  )}
                  {!(step === 2 && data.payment?.provider === "stripe") && (
                    <button
                      className="button dark"
                      aria-busy={busy} disabled={busy || (step === 1 && !method)}
                      type="submit"
                    >
                      {busy
                        ? "A little moment…"
                        : step === 0
                          ? "Continue to delivery"
                          : step === 1
                            ? "Review your order"
                            : "Place demo order"}
                      <ButtonIcon loading={busy}><ArrowUpRight size={18} /></ButtonIcon>
                    </button>
                  )}
                </div>
              </form>
            </section>
            <aside className="checkout-summary">
              <p className="eyebrow">YOUR LITTLE COLLECTION</p>
              <h2>Good things inside.</h2>
              <div className="summary-items">
                {cart.items.map((item: any) => (
                  <div key={item.id}>
                    <div className="summary-thumb">
                      <img
                        src={item.thumbnail || "/images/cinnamon.jpg"}
                        alt={item.product_title || item.title}
                      />
                      <span>{item.quantity}</span>
                    </div>
                    <div>
                      <h3>{item.product_title || item.title}</h3>
                      <p>{item.variant_title}</p>
                    </div>
                    <span>{amount(item.total, currency)}</span>
                  </div>
                ))}
              </div>
              <dl className="order-totals">
                <div>
                  <dt>Subtotal</dt>
                  <dd>{amount(cart.item_subtotal, currency)}</dd>
                </div>
                <div>
                  <dt>Delivery</dt>
                  <dd>
                    {cart.shipping_methods?.length
                      ? amount(cart.shipping_total, currency)
                      : "Next step"}
                  </dd>
                </div>
                <div>
                  <dt>Taxes</dt>
                  <dd>{amount(cart.tax_total, currency)}</dd>
                </div>
                {cart.discount_total > 0 && (
                  <div>
                    <dt>Savings</dt>
                    <dd>−{amount(cart.discount_total, currency)}</dd>
                  </div>
                )}
                <div className="grand-total">
                  <dt>Total</dt>
                  <dd>{amount(cart.total, currency)}</dd>
                </div>
              </dl>
              <p className="summary-assurance">
                <Leaf size={15} />A little island. An extraordinary spice.
              </p>
              {data.demo && (
                <p className="demo-caption">
                  SHOWCASE STORE · TEST ORDERS ONLY
                </p>
              )}
            </aside>
          </div>
        </>
      )}
    </main>
  );
}
