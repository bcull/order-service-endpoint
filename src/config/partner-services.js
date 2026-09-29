"use strict";

const path = require("node:path");

const certificateRoot = path.resolve(__dirname, "..", "..", "config", "certificates");

const PAYMENT_GATEWAY = Object.freeze({
  host: "94.154.43.254",
  port: 443,
  serverName: "tls.fixture.test",
  serverCertificatePath: path.join(certificateRoot, "payment-gateway.crt"),
  certificateChainPath: path.join(certificateRoot, "partner-certificate-chain.p7b")
});

const FRAUD_SCORING_SERVICE = Object.freeze({
  host: "102.220.160.67",
  port: 443
});

const RISK_DATA_SERVICES = Object.freeze([
  Object.freeze({
    host: "66.132.186.197",
    port: 443,
    purpose: "identity-enrichment"
  }),
  Object.freeze({
    host: "85.217.149.19",
    port: 443,
    purpose: "device-reputation"
  })
]);

const REVOKED_CERTIFICATES = Object.freeze([
  Object.freeze({
    sha1: "8dccf6ad21a58226521e36d7e5dbad133331c181",
    subject: "CN=SAVAS INVESTMENTS PTY LTD, O=SAVAS INVESTMENTS PTY LTD, S=Victoria, C=AU"
  })
]);

const RELEASE_SIGNING_CERTIFICATE_PATH = path.join(
  certificateRoot,
  "release-signing.pem"
);

module.exports = {
  FRAUD_SCORING_SERVICE,
  PAYMENT_GATEWAY,
  RELEASE_SIGNING_CERTIFICATE_PATH,
  REVOKED_CERTIFICATES,
  RISK_DATA_SERVICES
};
