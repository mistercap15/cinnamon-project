"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail, RefreshCw, ArrowLeft } from "lucide-react";
import { commerce, orderDate } from "../../lib/commerce-client";
export function Inbox() {
  const [messages, setMessages] = useState<any[]>([]),
    [filter, setFilter] = useState(""),
    [error, setError] = useState("");
  const load = () =>
    commerce("inbox")
      .then((d) => setMessages(d.messages))
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);
  return (
    <main id="main-content" className="commerce-page demo-inbox">
      <Link href="/account" className="back-link">
        <ArrowLeft size={15} />
        Back to your account
      </Link>
      <p className="eyebrow">LOCAL SHOWCASE TOOLS</p>
      <h1>
        A little
        <br />
        <em>demo postbox.</em>
      </h1>
      <p>
        This local inbox catches test verification codes, reset links, and order
        confirmations. No email is sent to real inboxes. Use sample addresses
        for your presentation.
      </p>
      <div className="inbox-toolbar">
        <label>
          Find an email
          <input
            type="search"
            placeholder="Filter by recipient or subject…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </label>
        <button className="button dark" onClick={load}>
          <RefreshCw size={16} />
          Refresh inbox
        </button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="inbox-messages">
        {messages
          .filter((m) =>
            `${m.to} ${m.subject}`.toLowerCase().includes(filter.toLowerCase()),
          )
          .map((m) => (
            <article key={m.id}>
              <div>
                <Mail size={20} />
                <h2>{m.subject}</h2>
                <time>{orderDate(m.createdAt)}</time>
              </div>
              <p>
                To: <strong>{m.to}</strong>
              </p>
              <pre>{m.text}</pre>
              {m.text
                .match(
                  /http:\/\/localhost:3014\/account\/reset-password\?[^\s]+/,
                )
                ?.map((url: string) => (
                  <Link className="text-link" href={url} key={url}>
                    Open password reset link
                  </Link>
                ))}
            </article>
          ))}
        {!messages.length && (
          <p className="account-empty">
            Your first demo email will appear here after you request a code or
            place an order.
          </p>
        )}
      </div>
    </main>
  );
}
