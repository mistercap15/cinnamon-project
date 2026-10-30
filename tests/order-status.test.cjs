const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const source = fs.readFileSync(
  path.join(__dirname, "../app/lib/commerce-client.ts"),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const exportsObject = {};
new Function("exports", compiled)(exportsObject);
const { orderProgress } = exportsObject;
test("delivery progress takes precedence over Medusa pending administrative status", () => {
  for (const [state, label] of Object.entries({
    fulfilled: "Fulfilled",
    partially_fulfilled: "Partially fulfilled",
    shipped: "Shipped",
    partially_shipped: "Partially shipped",
    delivered: "Delivered",
    partially_delivered: "Partially delivered",
  }))
    assert.equal(
      orderProgress({
        status: "pending",
        fulfillment_status: state,
        payment_status: "captured",
      }),
      label,
    );
});
test("cancelled orders and incomplete payments remain clear", () => {
  assert.equal(
    orderProgress({ status: "canceled", fulfillment_status: "delivered" }),
    "Canceled",
  );
  assert.equal(
    orderProgress({
      status: "pending",
      fulfillment_status: "not_fulfilled",
      payment_status: "awaiting",
    }),
    "Awaiting payment",
  );
  assert.equal(
    orderProgress({
      status: "pending",
      fulfillment_status: "not_fulfilled",
      payment_status: "captured",
    }),
    "Order placed",
  );
  assert.equal(
    orderProgress({ status: "completed", fulfillment_status: "not_fulfilled" }),
    "Completed",
  );
});

test("headline and message follow fulfillment progress rather than always promising shipment", () => {
  const { orderMessage } = exportsObject;
  const scenarios = [
    ["not_fulfilled", "Order received."],
    ["fulfilled", "Ready for dispatch."],
    ["shipped", "On its way."],
    ["delivered", "Delivered."],
    ["partially_fulfilled", "Coming together."],
    ["partially_shipped", "Partly on its way."],
    ["partially_delivered", "Partly delivered."],
  ];
  for (const [state, headline] of scenarios) {
    const copy = orderMessage({
      status: "pending",
      fulfillment_status: state,
      payment_status: "captured",
    });
    assert.equal(copy.headline, headline);
    assert.ok(copy.message.length > 0);
  }
  const canceled = orderMessage({
    status: "canceled",
    fulfillment_status: "shipped",
  });
  assert.equal(canceled.headline, "Order cancelled.");
  assert.equal(canceled.icon, "cancel");
  assert.doesNotMatch(canceled.message, /has shipped/);
  assert.equal(
    orderMessage({ payment_status: "awaiting" }).headline,
    "Awaiting payment.",
  );
  assert.equal(
    orderMessage({ status: "completed" }).headline,
    "Order complete.",
  );
});
