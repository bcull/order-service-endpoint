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

const RELEASE_SIGNING_CERTIFICATE_PATH = path.join(
  certificateRoot,
  "release-signing.pem"
);

module.exports = { PAYMENT_GATEWAY, RELEASE_SIGNING_CERTIFICATE_PATH };
