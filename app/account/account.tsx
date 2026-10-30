"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowLeft,
  Leaf,
  LogOut,
  Package,
  UserRound,
  Check,
  Mail,
  MapPin,
} from "lucide-react";
import {
  commerce,
  amount,
  orderDate,
  statusLabel,
  orderProgress,
} from "../lib/commerce-client";
import { AddressFields } from "../components/address-fields";
export function Account({ demo }: { demo: boolean }) {
  const [data, setData] = useState<any>(null),
    [mode, setMode] = useState("login"),
    [tab, setTab] = useState("orders"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [verifying, setVerifying] = useState(false),
    [address, setAddress] = useState<any>(null);
  const load = () =>
    commerce("account")
      .then(setData)
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);
  async function auth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const form = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (mode === "register" && form.password !== form.confirm)
        throw new Error("Your passwords do not match.");
      const result = await commerce("account", {
        ...form,
        action: mode === "forgot" ? "reset-request" : mode,
      });
      if (mode === "forgot") setMessage(result.message);
      else await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function action(body: any) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await commerce("account", body);
      setMessage(result.message || "Saved. A little detail, taken care of.");
      await load();
      return result;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return (
      <main id="main-content" className="commerce-page">
        <div className="commerce-loading" role="status">
          <Leaf size={38} />
          <h2>Your little corner.</h2>
          <p>{error || "Opening your account…"}</p>
          {error && (
            <button className="button dark" onClick={load}>
              Try again
            </button>
          )}
        </div>
      </main>
    );
  const customer = data.customer;
  if (!customer)
    return (
      <main id="main-content" className="account-page">
        <div className="account-welcome">
          <p className="eyebrow">A FAMILIAR LITTLE PLACE</p>
          <h1>
            Your corner
            <br />
            of <em>Ceylon.</em>
          </h1>
          <p>
            A little history. A few favourite things.
            <br />
            All your island moments, together.
          </p>
          <div>
            <Leaf size={22} />
            <span>Made for your everyday.</span>
          </div>
          <Link href="/shop" className="text-link">
            Back to the little collection <ArrowUpRight size={17} />
          </Link>
        </div>
        <section className="account-auth">
          <p className="eyebrow">
            {mode === "register"
              ? "BEGIN SOMETHING LOVELY"
              : mode === "forgot"
                ? "LET’S FIND YOUR WAY BACK"
                : "WELCOME BACK"}
          </p>
          <h2>
            {mode === "register"
              ? "Make yourself at home."
              : mode === "forgot"
                ? "A fresh little start."
                : "Good to see you."}
          </h2>
          <p>
            {mode === "register"
              ? "Create an account to keep your orders and delivery details together."
              : mode === "forgot"
                ? "Enter your account email and we’ll send a password reset link."
                : "Sign in with the email you used at checkout."}
          </p>
          <form onSubmit={auth} key={mode}>
            {mode === "register" && (
              <div className="address-grid">
                <label>
                  First name
                  <input
                    name="first_name"
                    autoComplete="given-name"
                    required
                    maxLength={80}
                  />
                </label>
                <label>
                  Last name
                  <input
                    name="last_name"
                    autoComplete="family-name"
                    required
                    maxLength={80}
                  />
                </label>
              </div>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
              />
            </label>
            {mode !== "forgot" && (
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete={
                    mode === "register" ? "new-password" : "current-password"
                  }
                  required
                  minLength={10}
                  maxLength={128}
                />
                {mode === "register" && (
                  <small>Use at least 10 characters.</small>
                )}
              </label>
            )}
            {mode === "register" && (
              <label>
                Confirm password
                <input
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={10}
                  maxLength={128}
                />
              </label>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {message && (
              <p className="form-success" role="status">
                {message}
              </p>
            )}
            <button className="button dark" disabled={busy}>
              {busy
                ? "A little moment…"
                : mode === "register"
                  ? "Create your account"
                  : mode === "forgot"
                    ? "Send reset link"
                    : "Sign in"}
              <ArrowUpRight size={18} />
            </button>
          </form>
          <div className="auth-switch">
            {mode === "login" ? (
              <>
                <button
                  onClick={() => {
                    setMode("forgot");
                    setError("");
                    setMessage("");
                  }}
                >
                  Forgot your password?
                </button>
                <p>
                  New to our little island?{" "}
                  <button
                    onClick={() => {
                      setMode("register");
                      setError("");
                      setMessage("");
                    }}
                  >
                    Create an account
                  </button>
                </p>
              </>
            ) : (
              <button
                onClick={() => {
                  setMode("login");
                  setError("");
                  setMessage("");
                }}
              >
                <ArrowLeft size={14} />
                Back to sign in
              </button>
            )}
          </div>
          <p className="account-guest-note">
            Shopping as a guest is always welcome. Verify your email after
            signing in to bring earlier guest orders into your account.
          </p>
          {demo && (
            <Link className="demo-inbox-link" href="/demo/inbox">
              <Mail size={15} />
              Open the local demo inbox
            </Link>
          )}
        </section>
      </main>
    );
  return (
    <main id="main-content" className="commerce-page account-dashboard">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">YOUR LITTLE CORNER OF CEYLON</p>
          <h1>
            Hello, <em>{customer.first_name || "friend"}.</em>
          </h1>
          <p>Good things are worth coming back to.</p>
        </div>
        <button
          className="text-link"
          disabled={busy}
          onClick={async () => {
            await action({ action: "logout" });
            setMessage("");
            setMode("login");
          }}
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
      <div className="account-layout">
        <aside className="account-sidebar">
          <span className="customer-initials">
            {customer.first_name?.[0] || "C"}
            {customer.last_name?.[0] || ""}
          </span>
          <h3>
            {customer.first_name} {customer.last_name}
          </h3>
          <p>{customer.email}</p>
          {customer.metadata?.email_verified_at && (
            <small>
              <Check size={12} />
              Email verified
            </small>
          )}
          <nav aria-label="Account navigation">
            {[
              { key: "orders", label: "Your orders", icon: Package },
              { key: "profile", label: "Your details", icon: UserRound },
              { key: "addresses", label: "Saved addresses", icon: MapPin },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setTab(item.key);
                  setError("");
                  setMessage("");
                }}
                aria-current={tab === item.key ? "page" : undefined}
              >
                <item.icon size={17} />
                {item.label}
                <ArrowUpRight size={15} />
              </button>
            ))}
          </nav>
          <Link href="/shop" className="text-link">
            A little more cinnamon <ArrowUpRight size={15} />
          </Link>
        </aside>
        <section className="account-content">
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="form-success" role="status">
              {message}
            </p>
          )}
          {tab === "orders" ? (
            <>
              <div className="panel-heading">
                <h2>Your island moments.</h2>
                <p>
                  {data.count || 0}{" "}
                  {(data.count || 0) === 1 ? "order" : "orders"}, thoughtfully
                  gathered.
                </p>
              </div>
              <div className="verification-card">
                <Mail size={21} />
                <div>
                  <h3>
                    {customer.metadata?.email_verified_at
                      ? "Missing a guest order?"
                      : "Bring your guest orders home."}
                  </h3>
                  <p>
                    Verify ownership of {customer.email} to securely add orders
                    placed as a guest with this email.
                  </p>
                  {!verifying ? (
                    <button
                      className="text-link"
                      disabled={busy}
                      onClick={async () => {
                        if (await action({ action: "verify-request" }))
                          setVerifying(true);
                      }}
                    >
                      Verify checkout email <ArrowUpRight size={15} />
                    </button>
                  ) : (
                    <form
                      className="verification-form"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const code = new FormData(e.currentTarget).get("code");
                        if (await action({ action: "verify-confirm", code }))
                          setVerifying(false);
                      }}
                    >
                      <label>
                        Verification code
                        <input
                          name="code"
                          autoComplete="one-time-code"
                          inputMode="numeric"
                          pattern="[0-9]{6}"
                          minLength={6}
                          maxLength={6}
                          required
                          placeholder="6-digit code"
                        />
                      </label>
                      <button className="button dark" disabled={busy}>
                        Verify & find orders
                      </button>
                    </form>
                  )}
                  {demo && verifying && (
                    <Link href="/demo/inbox" className="demo-inbox-link">
                      Read your code in the local demo inbox{" "}
                      <ArrowUpRight size={14} />
                    </Link>
                  )}
                </div>
              </div>
              {data.orders?.length ? (
                <div className="order-list">
                  {data.orders.map((order: any) => (
                    <article className="order-history-card" key={order.id}>
                      <div className="history-header">
                        <div>
                          <span className="eyebrow">
                            ORDER #{order.display_id}
                          </span>
                          <p>{orderDate(order.created_at)}</p>
                        </div>
                        <span className="status-badge">
                          {orderProgress(order)}
                        </span>
                      </div>
                      <div className="history-items">
                        {order.items.slice(0, 3).map((item: any) => (
                          <div key={item.id}>
                            <img
                              src={item.thumbnail || "/images/cinnamon.jpg"}
                              alt={item.product_title || item.title}
                            />
                            <div>
                              <h3>{item.product_title || item.title}</h3>
                              <p>
                                {item.variant_title} · Qty {item.quantity}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="history-footer">
                        <p>
                          {amount(order.total, order.currency_code)}{" "}
                          <span>· {statusLabel(order.payment_status)}</span>
                        </p>
                        <Link
                          href={`/orders/${order.id}`}
                          className="text-link"
                        >
                          View order <ArrowUpRight size={16} />
                        </Link>
                      </div>
                    </article>
                  ))}
                  {data.orders.length < data.count && (
                    <button
                      className="button dark load-more"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          const next = await commerce(
                            `account?offset=${data.orders.length}`,
                          );
                          setData({
                            ...next,
                            orders: [...data.orders, ...next.orders],
                          });
                        } catch (e) {
                          setError((e as Error).message);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      More island moments <ArrowUpRight size={16} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="account-empty">
                  <Package size={38} />
                  <h3>Your story is just beginning.</h3>
                  <p>
                    Orders placed while signed in appear here. For earlier guest
                    orders, verify your checkout email above.
                  </p>
                  <Link className="button dark" href="/shop">
                    Find your everyday extraordinary <ArrowUpRight size={17} />
                  </Link>
                </div>
              )}
            </>
          ) : tab === "profile" ? (
            <>
              <div className="panel-heading">
                <h2>The little details.</h2>
                <p>A familiar name. A place to reach you.</p>
              </div>
              <form
                className="profile-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  action({
                    action: "profile",
                    profile: Object.fromEntries(new FormData(e.currentTarget)),
                  });
                }}
              >
                <div className="address-grid">
                  <label>
                    First name
                    <input
                      name="first_name"
                      defaultValue={customer.first_name}
                      required
                      maxLength={80}
                    />
                  </label>
                  <label>
                    Last name
                    <input
                      name="last_name"
                      defaultValue={customer.last_name}
                      required
                      maxLength={80}
                    />
                  </label>
                </div>
                <label>
                  Email address
                  <input type="email" value={customer.email} readOnly />
                  <small>
                    Your email identifies your account and guest orders.
                  </small>
                </label>
                <label>
                  Phone number
                  <input
                    name="phone"
                    type="tel"
                    defaultValue={customer.phone || ""}
                    maxLength={30}
                  />
                </label>
                <button className="button dark" disabled={busy}>
                  Save your details <Check size={17} />
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="panel-heading">
                <h2>A place for good things.</h2>
                <p>Keep your favourite delivery addresses close.</p>
              </div>
              {address ? (
                <form
                  className="profile-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const result = await action({
                      action: "address-save",
                      id: address.id,
                      address: Object.fromEntries(
                        new FormData(e.currentTarget),
                      ),
                    });
                    if (result) setAddress(null);
                  }}
                >
                  <AddressFields value={address} countries={data.countries} />
                  <div className="checkout-actions">
                    <button
                      className="text-link"
                      type="button"
                      onClick={() => setAddress(null)}
                    >
                      Cancel
                    </button>
                    <button className="button dark" disabled={busy}>
                      Save address <Check size={17} />
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="saved-addresses">
                    {customer.addresses?.map((a: any) => (
                      <article key={a.id}>
                        <MapPin size={20} />
                        <h3>
                          {a.first_name} {a.last_name}
                        </h3>
                        <p>
                          {a.address_1}
                          <br />
                          {a.city}, {a.postal_code}
                          <br />
                          {a.country_code?.toUpperCase()}
                        </p>
                        <div>
                          <button
                            className="text-link"
                            onClick={() => setAddress(a)}
                          >
                            Edit
                          </button>
                          <button
                            className="text-link"
                            disabled={busy}
                            onClick={() =>
                              action({ action: "address-remove", id: a.id })
                            }
                          >
                            Remove
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                  <button
                    className="button dark"
                    onClick={() => setAddress({})}
                  >
                    Add a delivery address <ArrowUpRight size={17} />
                  </button>
                </>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
