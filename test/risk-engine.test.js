"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluateOrder } = require("../src/risk-engine");

test("approves a normal order", () => {
  const result = evaluateOrder({
    orderId: "ord-1001",
    amount: 42.5,
    country: "US"
  });

  assert.equal(result.decision, "approve");
  assert.deepEqual(result.reasons, []);
});

test("reviews a high-value order", () => {
  const result = evaluateOrder({
    orderId: "ord-1002",
    amount: 7_200,
    country: "US"
  });

  assert.equal(result.decision, "review");
  assert.deepEqual(result.reasons, ["high_value_order"]);
});

test("rejects incomplete input", () => {
  assert.throws(
    () => evaluateOrder({ orderId: "", amount: -1, country: "USA" }),
    /required/
  );
});
