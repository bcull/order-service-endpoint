"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { X509Certificate } = require("node:crypto");
const fs = require("node:fs");
const {
  PAYMENT_GATEWAY,
  RELEASE_SIGNING_CERTIFICATE_PATH
} = require("../src/config/partner-services");

test("configures the partner payment gateway by IP address", () => {
  assert.equal(PAYMENT_GATEWAY.host, "94.154.43.254");
  assert.equal(PAYMENT_GATEWAY.port, 443);
  assert.equal(PAYMENT_GATEWAY.serverName, "tls.fixture.test");
});

test("loads the payment gateway server certificate", () => {
  const certificate = new X509Certificate(
    fs.readFileSync(PAYMENT_GATEWAY.serverCertificatePath)
  );

  assert.match(certificate.subject, /CN=tls\.fixture\.test/);
});

test("loads the release signing certificate without private key material", () => {
  const pem = fs.readFileSync(RELEASE_SIGNING_CERTIFICATE_PATH, "utf8");
  const certificate = new X509Certificate(pem);

  assert.match(certificate.subject, /CN=code-signing\.fixture\.test/);
  assert.doesNotMatch(pem, /PRIVATE KEY/);
});

test("keeps the partner certificate chain alongside the gateway config", () => {
  const chain = fs.readFileSync(PAYMENT_GATEWAY.certificateChainPath);

  assert.ok(chain.length > 0);
});
