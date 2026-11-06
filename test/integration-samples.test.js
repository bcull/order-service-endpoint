"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const https = require("node:https");
const net = require("node:net");
const dns = require("node:dns");
const vm = require("node:vm");
const { buildSamples } = require("../tools/integration-samples");

const root = path.resolve(__dirname, "..");

test("checked-in integration samples reproduce from public synthetic inputs", () => {
  const { files, manifest } = buildSamples();
  for (const [relativePath, expected] of Object.entries(files)) {
    const actual = fs.readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");
    assert.ok(actual === expected, `Regenerate changed sample: ${relativePath}`);
    if (relativePath.endsWith(".js")) new vm.Script(actual, { filename: relativePath });
    if (relativePath.endsWith(".json")) JSON.parse(actual);
  }
  const locations = manifest.findings.map((item) =>
    [item.ruleId, item.path, item.lineNumber, item.columnNumber].join(":"));
  assert.equal(new Set(locations).size, locations.length, "Each expected finding has a distinct location");
});

test("request samples construct realistic payloads without network calls, including during import", (t) => {
  const unexpectedNetwork = () => assert.fail("Integration samples must remain offline");
  for (const transport of [http, https]) {
    t.mock.method(transport, "request", unexpectedNetwork);
    t.mock.method(transport, "get", unexpectedNetwork);
  }
  t.mock.method(globalThis, "fetch", unexpectedNetwork);
  t.mock.method(net.Socket.prototype, "connect", unexpectedNetwork);
  t.mock.method(dns, "lookup", unexpectedNetwork);

  const { buildPaymentRequest } = require("../src/integrations/payment-client");
  const { buildReceiptRequest } = require("../src/integrations/receipt-client");
  const { buildReviewNotification } = require("../src/integrations/operations-client");
  const { buildReleaseLookup } = require("../src/integrations/release-client");
  const { loadIntegrationSettings } = require("../src/config/runtime-integrations");
  const order = Object.freeze({ orderId: "ord-1042", amount: 42.5, receiptEmail: "buyer@example.invalid" });

  const payment = buildPaymentRequest(order);
  assert.equal(new URLSearchParams(payment.body).get("amount"), "4250");
  assert.equal(new URLSearchParams(payment.body).get("metadata[order_id]"), order.orderId);
  assert.equal(payment.headers["Idempotency-Key"], "order-ord-1042");
  assert.equal(buildPaymentRequest(order, { STRIPE_SECRET_KEY: "runtime-reference" }).headers.Authorization,
    "Bearer runtime-reference");

  const receipt = buildReceiptRequest(order);
  assert.equal(receipt.body.personalizations[0].to[0].email, order.receiptEmail);
  assert.equal(receipt.headers.Authorization, "Bearer " + require("../config/notifications.json").apiKey);
  assert.equal(buildReceiptRequest(order, { SENDGRID_API_KEY: "runtime-reference" }).headers.Authorization,
    "Bearer runtime-reference");

  assert.ok(buildReviewNotification(order).body.text.includes(order.orderId));
  assert.equal(buildReviewNotification(order, { SLACK_BOT_TOKEN: "runtime-reference" }).headers.Authorization,
    "Bearer runtime-reference");
  assert.ok(buildReleaseLookup("release/1").url.endsWith("/release%2F1"));
  assert.equal(buildReleaseLookup("v1", { GITHUB_TOKEN: "runtime-reference" }).headers.Authorization,
    "Bearer runtime-reference");
  assert.equal(loadIntegrationSettings({ DB_PASSWORD: "runtime-reference" }).databasePassword, "runtime-reference");
});

test("encoded and duplicate samples represent the same synthetic integration settings", () => {
  const { files } = buildSamples();
  const secret = files["deploy/kubernetes/order-worker-secret.yaml"];
  const data = Object.fromEntries([...secret.matchAll(/^  ([A-Z_]+): ([A-Za-z0-9+/=]+)$/gm)]
    .map((match) => [match[1], Buffer.from(match[2], "base64").toString("utf8")]));
  assert.equal(data.RECONCILIATION_API_KEY, require("../config/payments.json").reconciliation.apiKey);
  assert.equal(data.SENDGRID_API_KEY, require("../config/notifications.json").apiKey);
  const recovery = files["deploy/recovery/payment-worker.env"].match(/^STRIPE_SECRET_KEY=(.+)$/m)[1];
  const { buildPaymentRequest } = require("../src/integrations/payment-client");
  assert.equal(buildPaymentRequest({ orderId: "ord-1", amount: 1 }).headers.Authorization, "Bearer " + recovery);
});

test("expression controls do not evaluate to their apparent concatenated credential", () => {
  const { labels } = require("../src/templates/payment-labels");
  assert.equal(labels.keyLength, "sk_live_" + 24);
  assert.equal(labels.keyInitial.length, "sk_live_".length + 1);
  assert.equal(labels.runtimeSuffix({ RELEASE_LABEL: "preview" }), "ghp_preview");
});

test("release fixture remains manual, unconditionally skipped and non-publishing", () => {
  const workflow = fs.readFileSync(path.join(root, ".github/workflows/release.yml"), "utf8");
  assert.match(workflow, /\bon:\r?\n  workflow_dispatch:/);
  assert.match(workflow, /if: \$\{\{ false \}\}/);
  assert.match(workflow, /contents: read/);
  assert.doesNotMatch(workflow, /(?:push:|pull_request:|uses:|npm publish|curl |wget )/);
  assert.equal(fs.existsSync(path.join(root, ".npmrc")), false, "Registry fixture must not become root npm config");
});
