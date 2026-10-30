import { defineRouteConfig } from "@medusajs/admin-sdk";
import { ArrowUturnLeft } from "@medusajs/icons";
import {
  Container,
  Heading,
  Button,
  Text,
  Textarea,
  Label,
} from "@medusajs/ui";
import { useEffect, useState } from "react";
async function api(path: string, body?: any) {
  const token = localStorage.getItem("medusa_auth_token");
  const response = await fetch(path, {
    credentials: "include",
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.message || "Unable to complete this action.");
  return data;
}
export default function Aftercare() {
  const [data, setData] = useState<any>(null),
    [locations, setLocations] = useState<any[]>([]),
    [selected, setSelected] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [filter, setFilter] = useState("requested");
  const load = () =>
    api("/admin/aftercare")
      .then(setData)
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
    api("/admin/stock-locations?limit=100")
      .then((d) => setLocations(d.stock_locations))
      .catch((e) => setError(e.message));
  }, []);
  async function decide(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError("");
    try {
      await api(`/admin/aftercare/${selected.id}`, form);
      setSelected(null);
      setMessage(
        "Decision saved. The customer can see the response on their order.",
      );
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Container>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 24,
          marginBottom: 24,
        }}
      >
        <div>
          <Heading>Returns & care</Heading>
          <Text>
            Review customer requests before any goods are returned or money is
            refunded.
          </Text>
        </div>
        <Button variant="secondary" onClick={load}>
          Refresh requests
        </Button>
      </div>
      {error && (
        <p role="alert" style={{ color: "#a33", marginBottom: 16 }}>
          {error}
        </p>
      )}
      {message && (
        <p role="status" style={{ color: "#27663b", marginBottom: 16 }}>
          {message}
        </p>
      )}
      <p style={{ marginBottom: 20 }}>
        Demo policy: {data?.policy.windowDays || 14} days for unopened
        change-of-mind returns. Product issues are reviewed separately. Approval
        does not issue a refund. Receive approved returns and issue full or
        partial refunds through the native order page. Use the quarantine stock
        location for returned food; it is excluded from selling stock.
      </p>
      {selected ? (
        <form
          onSubmit={decide}
          style={{ display: "grid", gap: 20, maxWidth: 760 }}
        >
          <Heading level="h2">Review order #{selected.order_number}</Heading>
          <p>
            {selected.email} · {selected.reason.replaceAll("_", " ")}
          </p>
          {selected.items.map((i: any) => (
            <p key={i.id}>
              {i.title} · {i.variant} · Qty {i.quantity}
            </p>
          ))}
          <p style={{ whiteSpace: "pre-wrap" }}>{selected.note}</p>
          <p>
            Customer declared items unopened: {selected.unopened ? "Yes" : "No"}
          </p>
          <label>
            Decision
            <select
              name="action"
              required
              defaultValue="approve"
              style={{
                display: "block",
                padding: 10,
                border: "1px solid #ddd",
                width: "100%",
              }}
            >
              <option value="approve">Approve request</option>
              <option value="decline">Decline request</option>
            </select>
          </label>
          <label>
            Resolution if approved
            <select
              name="resolution"
              defaultValue="return"
              style={{
                display: "block",
                padding: 10,
                border: "1px solid #ddd",
                width: "100%",
              }}
            >
              <option value="return">Customer sends approved goods back</option>
              <option value="refund_only">
                No physical return required — review refund separately
              </option>
            </select>
          </label>
          <label>
            Return inspection location
            <select
              name="location_id"
              defaultValue={
                locations.find((l) => l.name.includes("quarantine"))?.id || ""
              }
              style={{
                display: "block",
                padding: 10,
                border: "1px solid #ddd",
                width: "100%",
              }}
            >
              <option value="">Select a location for physical returns</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <div>
            <Label htmlFor="reply">
              Customer response / return instructions
            </Label>
            <Textarea
              id="reply"
              name="reply"
              rows={5}
              required
              minLength={10}
              maxLength={3000}
              placeholder="Explain your decision. If approved, provide the correct return address, request reference, packaging instructions and who covers shipping. Do not instruct customers to post to a demo address."
            />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <Button disabled={busy}>
              {busy ? "Saving…" : "Save decision"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSelected(null)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <>
          <label>
            Show requests
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ marginLeft: 15, padding: 8, border: "1px solid #ddd" }}
            >
              <option value="requested">Awaiting review</option>
              <option value="all">All requests</option>
              <option value="approved">Approved</option>
              <option value="declined">Declined</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </label>
          {data?.requests
            .filter((r: any) => filter === "all" || r.status === filter)
            .map((r: any) => (
              <article
                key={r.id}
                style={{ padding: "24px 0", borderBottom: "1px solid #ddd" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 20,
                  }}
                >
                  <div>
                    <Heading level="h2">Order #{r.order_number}</Heading>
                    <Text>
                      {r.email} · {r.reason.replaceAll("_", " ")} ·{" "}
                      {new Date(r.created_at).toLocaleDateString()}
                    </Text>
                    <Text>
                      {r.status}
                      {r.return_status
                        ? ` · Native return: ${r.return_status}`
                        : ""}
                    </Text>
                  </div>
                  {r.status === "requested" && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSelected(r);
                        setError("");
                        setMessage("");
                      }}
                    >
                      Review request
                    </Button>
                  )}
                </div>
                <p style={{ margin: "12px 0", whiteSpace: "pre-wrap" }}>
                  {r.note}
                </p>
                {r.items.map((i: any) => (
                  <Text key={i.id}>
                    {i.title} · {i.variant} · Qty {i.quantity}
                  </Text>
                ))}
                {r.reply && (
                  <p style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>
                    Customer response: {r.reply}
                  </p>
                )}
                <a
                  href={`/app/orders/${r.order_id}`}
                  style={{
                    textDecoration: "underline",
                    display: "inline-block",
                    marginTop: 15,
                  }}
                >
                  Open order — receive return / manage refunds
                </a>
              </article>
            ))}
          {data &&
            !data.requests.some(
              (r: any) => filter === "all" || r.status === filter,
            ) && <p style={{ padding: "40px 0" }}>No requests in this view.</p>}
        </>
      )}
    </Container>
  );
}
export const config = defineRouteConfig({
  label: "Returns & care",
  icon: ArrowUturnLeft,
});
