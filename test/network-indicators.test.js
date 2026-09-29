"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { X509Certificate } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const {
  FRAUD_SCORING_SERVICE,
  PAYMENT_GATEWAY,
  RELEASE_SIGNING_CERTIFICATE_PATH,
  REVOKED_CERTIFICATES,
  RISK_DATA_SERVICES
} = require("../src/config/partner-services");

test("configures the partner payment gateway by IP address", () => {
  assert.equal(PAYMENT_GATEWAY.host, "94.154.43.254");
  assert.equal(PAYMENT_GATEWAY.port, 443);
  assert.equal(PAYMENT_GATEWAY.serverName, "tls.fixture.test");
});

test("configures the external fraud scoring service by IP address", () => {
  assert.deepEqual(FRAUD_SCORING_SERVICE, {
    host: "102.220.160.67",
    port: 443
  });
});

test("configures supplemental risk data services by IP address", () => {
  assert.deepEqual(RISK_DATA_SERVICES, [
    {
      host: "66.132.186.197",
      port: 443,
      purpose: "identity-enrichment"
    },
    {
      host: "85.217.149.19",
      port: 443,
      purpose: "device-reputation"
    }
  ]);
});

test("blocks the revoked partner signing certificate by SHA-1", () => {
  assert.deepEqual(REVOKED_CERTIFICATES, [
    {
      sha1: "8dccf6ad21a58226521e36d7e5dbad133331c181",
      subject: "CN=SAVAS INVESTMENTS PTY LTD, O=SAVAS INVESTMENTS PTY LTD, S=Victoria, C=AU"
    }
  ]);
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

for (const fixture of [
  {
    file: "positivessl-ca-2.pem",
    commonName: "PositiveSSL CA 2",
    sha1: "94807b1c788dd2fcbe19c8481ce41cfab8a4c17f"
  },
  {
    file: "rapidssl-sha256-ca.pem",
    commonName: "RapidSSL SHA256 CA",
    sha1: "c86edbc71ab05078f61acdf3d8dc5db61eb75fb6"
  }
]) {
  test(`keeps exactly the public ${fixture.commonName} certificate as a scan fixture`, () => {
    const pem = fs.readFileSync(
      path.join(__dirname, "..", "config", "certificates", fixture.file),
      "utf8"
    );

    assert.match(
      pem,
      /^-----BEGIN CERTIFICATE-----\r?\n[A-Za-z0-9+/=\r\n]+-----END CERTIFICATE-----\s*$/
    );
    assert.doesNotMatch(pem, /PRIVATE KEY/);

    const certificate = new X509Certificate(pem);

    assert.ok(certificate.subject.split("\n").includes(`CN=${fixture.commonName}`));
    assert.equal(certificate.ca, true);
    assert.equal(
      certificate.fingerprint.replaceAll(":", "").toLowerCase(),
      fixture.sha1
    );
  });
}
