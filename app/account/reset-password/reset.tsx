"use client";
import { ButtonIcon } from "../../components/button-icon";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Leaf } from "lucide-react";
import { commerce } from "../../lib/commerce-client";
export function ResetPassword() {
  const [token, setToken] = useState(""),
    [email, setEmail] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("token")) {
      setToken(params.get("token")!);
      setEmail(params.get("email") || "");
      history.replaceState(null, "", "/account/reset-password");
    }
  }, []);
  return (
    <main id="main-content" className="commerce-page">
      <section className="reset-card">
        <Leaf size={35} />
        <p className="eyebrow">A FRESH LITTLE START</p>
        <h1>
          Welcome
          <br />
          <em>back home.</em>
        </h1>
        {done ? (
          <>
            <p className="form-success" role="status">
              Your password has been updated. Sign in with your new password.
            </p>
            <Link className="button dark" href="/account">
              Back to sign in <ArrowUpRight size={18} />
            </Link>
          </>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const data = Object.fromEntries(new FormData(e.currentTarget));
              setBusy(true);
              setError("");
              try {
                if (data.password !== data.confirm)
                  throw new Error("Your passwords do not match.");
                await commerce("account", {
                  action: "reset-confirm",
                  token,
                  email,
                  password: data.password,
                });
                setDone(true);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <p>Choose a new password for {email || "your account"}.</p>
            <label>
              New password
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={10}
                maxLength={128}
              />
            </label>
            <label>
              Confirm new password
              <input
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={10}
                maxLength={128}
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button aria-busy={busy} disabled={busy || !token} className="button dark">
              {busy ? "Updating…" : "Save your new password"}
              <ButtonIcon loading={busy}><ArrowUpRight size={18} /></ButtonIcon>
            </button>
            <Link href="/account" className="text-link">
              Request a new reset link
            </Link>
          </form>
        )}
      </section>
    </main>
  );
}
