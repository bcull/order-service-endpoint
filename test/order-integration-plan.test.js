"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const https = require("node:https");
const { ORDER_INTEGRATIONS } = require("../src/config/order-integrations");
const { buildOrderIntegrationPlan } = require("../src/order-integration-plan");

test("previews the configured destinations without changing the order", () => {
  const order = Object.freeze({
    orderId: " ord-1001 ",
    amount: 42.5,
    country: "us"
  });
  const plan = buildOrderIntegrationPlan(order);

  assert.equal(plan.orderId, "ord-1001");
  assert.equal(plan.decision, "approve");
  assert.deepEqual(plan.requests.map((request) => request.service), [
    "risk-assessment",
    "fulfillment",
    "payment-authorization",
    "merchant-notification"
  ]);
  for (const [index, request] of plan.requests.entries()) {
    const url = new URL(request.url);
    assert.equal(request.method, "POST");
    assert.equal(url.protocol, "https:");
    assert.equal(url.hostname, ORDER_INTEGRATIONS[index].host);
    assert.equal(url.pathname, ORDER_INTEGRATIONS[index].path);
    assert.equal(url.username, "");
    assert.equal(url.password, "");
  }
  assert.equal(order.orderId, " ord-1001 ");
  assert.equal(order.country, "us");
});

test("uses the same validation and review decision as order evaluation", () => {
  const plan = buildOrderIntegrationPlan({
    orderId: "ord-1002",
    amount: 7_200,
    country: "US"
  });

  assert.equal(plan.decision, "review");
  assert.throws(
    () => buildOrderIntegrationPlan({ orderId: "", amount: -1, country: "USA" }),
    /required/
  );
});

test("planning never dispatches requests or accepts destination overrides", (t) => {
  const unexpectedRequest = () => assert.fail("Planning must not send requests");
  t.mock.method(http, "request", unexpectedRequest);
  t.mock.method(http, "get", unexpectedRequest);
  t.mock.method(https, "request", unexpectedRequest);
  t.mock.method(https, "get", unexpectedRequest);
  t.mock.method(globalThis, "fetch", unexpectedRequest);

  const order = { orderId: "ord-1003", amount: 20, country: "US" };
  assert.deepEqual(
    buildOrderIntegrationPlan({ ...order, host: "override.invalid", requests: [] }),
    buildOrderIntegrationPlan(order)
  );
});
