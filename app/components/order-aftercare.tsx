"use client";
import { useState } from "react";
import { ArrowUpRight, Package, RotateCcw, Check } from "lucide-react";
import {
  commerce,
  amount,
  orderDate,
  statusLabel,
} from "../lib/commerce-client";
const reasons = [
  ["change_mind", "Changed my mind"],
  ["damaged", "Damaged product"],
  ["incorrect", "Incorrect item"],
  ["missing", "Missing item"],
  ["quality", "Quality concern"],
];
export function OrderAftercare({
  id,
  currency,
  initial,
  demo,
}: {
  id: string;
  currency: string;
  initial: any;
  demo: boolean;
}) {
  const [data, setData] = useState(initial),
    [open, setOpen] = useState(false),
    [clientKey, setClientKey] = useState(""),
    [reason, setReason] = useState("damaged"),
    [quantities, setQuantities] = useState<Record<string, number>>({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  async function submit(body: any) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      setData(await commerce(`returns/${id}`, body));
      setOpen(false);
      setQuantities({});
      setSuccess(
        body.action === "withdraw"
          ? "Your request has been withdrawn."
          : "Your request has been received. Please wait for our review before sending anything back.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="aftercare-panel" aria-labelledby="aftercare-heading">
      <div className="aftercare-heading">
        <div>
          <p className="eyebrow">HERE TO HELP, AFTER DELIVERY TOO</p>
          <h2 id="aftercare-heading">A little care, continued.</h2>
          <p>Returns, product concerns, and refund updates for your order.</p>
        </div>
        <RotateCcw size={27} />
      </div>
      <details className="return-policy">
        <summary>Return policy & what happens next</summary>
        <p>
          Our demo policy offers {data.policy.windowDays} days from recorded
          delivery to request an unopened, sealed change-of-mind return.{" "}
          {data.policy.summary}
        </p>
        <p>
          We review each request before approving it. Return instructions and
          shipping responsibility are confirmed during review. Returned food is
          inspected separately from sellable stock. Refunds are reviewed
          separately; approval is not a refund confirmation.
        </p>
        <p>
          For missing or damaged goods, describe the issue and keep any
          packaging or photos available for the team. You do not need to send
          goods back unless asked.
        </p>
      </details>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="form-success" role="status">
          {success}
        </p>
      )}
      {data.requests.length > 0 && (
        <div className="return-request-list">
          {data.requests.map((r: any) => (
            <article key={r.id}>
              <div className="return-card-heading">
                <div>
                  <span className="eyebrow">
                    REQUEST {r.id.slice(-8).toUpperCase()}
                  </span>
                  <p>{orderDate(r.created_at)}</p>
                </div>
                <span className="status-badge">
                  {r.status === "approved" && r.return_status === "received"
                    ? "Return received"
                    : r.status === "approved" &&
                        r.return_status === "partially_received"
                      ? "Partially received"
                      : r.status === "approved" &&
                          r.return_status === "cancelled"
                        ? "Return cancelled"
                        : r.status === "approved" &&
                            r.resolution === "refund_only"
                          ? "Approved · no return needed"
                          : statusLabel(r.status)}
                </span>
              </div>
              <h3>
                {reasons.find(([key]) => key === r.reason)?.[1] ||
                  "Return request"}
              </h3>
              {r.items.map((i: any) => (
                <p key={i.id}>
                  {i.title} · {i.variant} · Qty {i.quantity}
                </p>
              ))}
              <p className="return-note">{r.note}</p>
              {r.reply && (
                <div className="return-reply">
                  <strong>Our response</strong>
                  <p>{r.reply}</p>
                </div>
              )}
              {r.status === "requested" && (
                <>
                  <p>
                    Awaiting review. Please keep the items until we confirm the
                    next steps.
                  </p>
                  <button
                    className="text-link"
                    disabled={busy}
                    onClick={() =>
                      submit({ action: "withdraw", request_id: r.id })
                    }
                  >
                    Withdraw request
                  </button>
                </>
              )}
              {r.status === "approved" && (
                <p>
                  {r.return_status === "cancelled"
                    ? "This return was cancelled. Please contact the team before sending any goods."
                    : r.return_status === "partially_received"
                      ? "Some returned items have been recorded as received. The remaining items are awaiting receipt."
                      : r.return_status === "received"
                        ? "Your return has been recorded as received. Any refund issued is shown separately below."
                        : r.resolution === "refund_only"
                          ? "No goods need to be sent back. Any refund issued is shown separately below."
                          : "Follow the return instructions in our response. A refund will be reviewed after inspection."}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
      {data.refunds.length > 0 && (
        <div className="refund-ledger">
          <h3>Refunds recorded.</h3>
          {data.refunds.map((r: any) => (
            <div key={r.id}>
              <span>
                {orderDate(r.created_at)} ·{" "}
                {r.status === "succeeded"
                  ? "Confirmed"
                  : r.status === "pending"
                    ? "Processing"
                    : "Failed"}
              </span>
              <strong>{amount(r.amount, currency)}</strong>
            </div>
          ))}
          <p>
            Total refunded: {amount(data.refunded, currency)}.{" "}
            {demo
              ? "Demo records only — no real money has moved."
              : "Refunds are returned through the original payment method. Bank processing times vary."}
          </p>
        </div>
      )}
      {data.canRequest && !open && (
        <button
          className="button dark"
          onClick={() => {
            setClientKey(crypto.randomUUID());
            setOpen(true);
            setSuccess("");
          }}
        >
          Request a return or report an issue <ArrowUpRight size={17} />
        </button>
      )}
      {!data.canRequest && !data.requests.length && (
        <p className="return-unavailable">
          Return requests become available for delivered items. If you have
          already submitted a request, its progress appears here.
        </p>
      )}
      {open && (
        <form
          className="return-form"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            submit({
              action: "request",
              client_key: clientKey,
              reason,
              note: form.get("note"),
              unopened: form.get("unopened") === "on",
              items: Object.entries(quantities)
                .filter(([, q]) => q > 0)
                .map(([id, quantity]) => ({ id, quantity })),
            });
          }}
        >
          <h3>What can we put right?</h3>
          <fieldset>
            <legend>Select the items and quantities</legend>
            {data.items
              .filter((i: any) => i.available > 0)
              .map((i: any) => (
                <label className="return-item" key={i.id}>
                  <img src={i.thumbnail || "/images/cinnamon.jpg"} alt="" />
                  <span>
                    {i.title}
                    <small>
                      {i.variant} · {i.available} available
                    </small>
                  </span>
                  <select
                    aria-label={`Return quantity for ${i.title}`}
                    value={quantities[i.id] || 0}
                    onChange={(e) =>
                      setQuantities({
                        ...quantities,
                        [i.id]: Number(e.target.value),
                      })
                    }
                  >
                    {Array.from(
                      { length: Math.min(i.available, 99) + 1 },
                      (_, q) => (
                        <option value={q} key={q}>
                          {q === 0 ? "Not selected" : q}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              ))}
          </fieldset>
          <label>
            Reason
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              {reasons.map(([value, label]) => (
                <option
                  key={value}
                  value={value}
                  disabled={value === "change_mind" && !data.withinWindow}
                >
                  {label}
                  {value === "change_mind" && !data.withinWindow
                    ? " — window closed"
                    : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tell us what happened
            <textarea
              name="note"
              required
              minLength={10}
              maxLength={2000}
              rows={4}
              placeholder="Describe the issue and the items affected…"
            />
          </label>
          {reason === "change_mind" && (
            <label className="check-consent">
              <input type="checkbox" name="unopened" required />
              These items are unopened, sealed and in their original condition.
            </label>
          )}
          <p>
            Submitting a request does not automatically approve a return or
            issue a refund.
          </p>
          <div className="checkout-actions">
            <button
              className="text-link"
              type="button"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button
              className="button dark"
              disabled={busy || !Object.values(quantities).some((q) => q > 0)}
            >
              {busy ? "Sending…" : "Submit request"}
              <ArrowUpRight size={17} />
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
