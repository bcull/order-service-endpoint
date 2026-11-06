"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const path = require("node:path");

test("serves integration previews while preserving existing routes", { timeout: 15_000 }, async (t) => {
  const child = spawn(process.execPath, [path.join(__dirname, "..", "src", "server.js")], {
    env: { ...process.env, PORT: "0" },
    stdio: ["ignore", "pipe", "ignore"]
  });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit");
      child.kill();
      await exited;
    }
  });

  const address = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Service did not become ready")), 5_000);
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", () => {
      clearTimeout(timer);
      reject(new Error("Service exited before the test completed"));
    });
    let output = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      output += chunk;
      const match = output.match(/listening on (http:\/\/localhost:\d+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
  });

  const post = (route, body) => fetch(`${address}${route}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    signal: AbortSignal.timeout(2_000)
  });
  const input = JSON.stringify({ orderId: " ord-1001 ", amount: 42.5, country: "us" });
  const previewResponse = await post("/api/risk/integration-plan", input);
  assert.equal(previewResponse.status, 200);
  const preview = await previewResponse.json();
  assert.equal(preview.orderId, "ord-1001");
  assert.equal(preview.decision, "approve");
  assert.equal(preview.requests.length, 4);
  assert.ok(preview.requests.every((request) => new URL(request.url).protocol === "https:"));

  const invalidResponse = await post("/api/risk/integration-plan", "{}");
  assert.equal(invalidResponse.status, 400);
  assert.match((await invalidResponse.json()).error, /required/);

  const malformedResponse = await post("/api/risk/integration-plan", "{");
  assert.equal(malformedResponse.status, 400);
  assert.match((await malformedResponse.json()).error, /valid JSON/);

  const evaluationResponse = await post("/api/risk/evaluate", input);
  assert.equal(evaluationResponse.status, 200);
  const evaluation = await evaluationResponse.json();
  assert.deepEqual(Object.keys(evaluation).sort(), [
    "decision", "evaluatedAt", "orderId", "reasons"
  ]);
  assert.equal(evaluation.decision, preview.decision);
  assert.deepEqual(evaluation.reasons, []);

  const healthResponse = await fetch(`${address}/health`, {
    signal: AbortSignal.timeout(2_000)
  });
  assert.equal(healthResponse.status, 200);
  assert.deepEqual(await healthResponse.json(), { status: "healthy", service: "order-risk" });
});
