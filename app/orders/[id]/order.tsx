"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ArrowUpRight, Leaf, Package, Truck } from "lucide-react";
import {
  commerce,
  amount,
  orderDate,
  statusLabel,
} from "../../lib/commerce-client";
export function OrderDetails({ id }: { id: string }) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState("");
  useEffect(() => {
    commerce(`orders/${id}`)
      .then((result) => {
        setData(result);
      })
      .catch((e) => setError(e.message));
  }, [id]);
  if (!data)
    return (
      <main id="main-content" className="commerce-page">
        <div className="commerce-loading" role="status">
          <Package size={40} />
          <h2>
            {error
              ? "A little help finding your order."
              : "Opening your order…"}
          </h2>
          {error && (
            <>
              <p>{error}</p>
              <Link className="button dark" href="/account">
                Sign in to your account <ArrowUpRight size={17} />
              </Link>
            </>
          )}
        </div>
      </main>
    );
  const { order, demo } = data,
    shipping = order.shipping_address;
  return (
    <main id="main-content" className="commerce-page order-page">
      <div className="order-thank-you">
        <span className="order-check">
          <Check size={30} />
        </span>
        <p className="eyebrow">
          ORDER #{order.display_id} / {orderDate(order.created_at)}
        </p>
        <h1>
          A little warmth.
          <br />
          <em>On its way.</em>
        </h1>
        <p>
          Your order is placed. Thank you for making a little room for Ceylon.
        </p>
        {demo && (
          <p className="order-demo-note">
            Showcase order · no real payment collected or shipment arranged.
          </p>
        )}
      </div>
      <div className="order-overview">
        <div>
          <Package size={21} />
          <span>
            Order status<strong>{statusLabel(order.status)}</strong>
          </span>
        </div>
        <div>
          <Check size={21} />
          <span>
            Payment<strong>{statusLabel(order.payment_status)}</strong>
          </span>
        </div>
        <div>
          <Truck size={21} />
          <span>
            Delivery
            <strong>
              {statusLabel(order.fulfillment_status)}
              <small>
                {order.shipping_methods?.[0]?.name || "Standard delivery"}
              </small>
            </strong>
          </span>
        </div>
      </div>
      <div className="checkout-layout">
        <section className="order-detail-items">
          <h2>Your little collection.</h2>
          {order.items.map((item: any) => (
            <article key={item.id}>
              <img
                src={item.thumbnail || "/images/cinnamon.jpg"}
                alt={item.product_title || item.title}
              />
              <div>
                <h3>{item.product_title || item.title}</h3>
                <p>
                  {item.variant_title} · Quantity {item.quantity}
                </p>
              </div>
              <span>{amount(item.total, order.currency_code)}</span>
            </article>
          ))}
          <div className="receipt-address">
            <p className="eyebrow">DELIVER TO</p>
            <h3>
              {shipping?.first_name} {shipping?.last_name}
            </h3>
            <p>
              {shipping?.address_1}
              <br />
              {shipping?.city}, {shipping?.postal_code}
              <br />
              {shipping?.country_code?.toUpperCase()}
            </p>
          </div>
        </section>
        <aside className="checkout-summary">
          <p className="eyebrow">THE LITTLE DETAILS</p>
          <h2>Your order summary.</h2>
          <dl className="order-totals">
            <div>
              <dt>Subtotal</dt>
              <dd>{amount(order.item_subtotal, order.currency_code)}</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>{amount(order.shipping_total, order.currency_code)}</dd>
            </div>
            <div>
              <dt>Taxes</dt>
              <dd>{amount(order.tax_total, order.currency_code)}</dd>
            </div>
            {order.discount_total > 0 && (
              <div>
                <dt>Savings</dt>
                <dd>−{amount(order.discount_total, order.currency_code)}</dd>
              </div>
            )}
            <div className="grand-total">
              <dt>Total</dt>
              <dd>{amount(order.total, order.currency_code)}</dd>
            </div>
          </dl>
          <Leaf size={20} />
          <p className="receipt-account-note">
            Keep your island moments together. Create an account or sign in with
            your checkout email, then verify it to find earlier guest orders.
          </p>
          <Link href="/account" className="button dark">
            Your account <ArrowUpRight size={18} />
          </Link>
        </aside>
      </div>
      <div className="order-continue">
        <Link href="/shop" className="text-link">
          A little more to discover <ArrowUpRight size={18} />
        </Link>
      </div>
    </main>
  );
}
