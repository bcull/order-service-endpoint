"use strict";

const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

// Public deterministic inputs, never provider-issued credentials or environment values.
function bytes(label, length) {
  const chunks = [];
  for (let counter = 0; Buffer.concat(chunks).length < length; counter++) {
    chunks.push(createHash("sha256").update(`order-service-synthetic-v1:${label}:${counter}`).digest());
  }
  return Buffer.concat(chunks).subarray(0, length);
}

function characters(label, length, symbols = alphabet) {
  return [...bytes(label, length)].map((byte) => symbols[byte % symbols.length]).join("");
}

function buildSamples() {
  const values = {
    payment: "sk_live_" + characters("payment", 96),
    reconciliation: "rk_live_" + characters("reconciliation", 96),
    mail: "SG." + characters("mail-id", 22) + "." + characters("mail-key", 43),
    release: "ghp_" + characters("release", 36),
    registry: "npm_" + characters("registry", 36),
    slack: "xoxb-" + characters("workspace", 12, "0123456789")
      + "-" + characters("bot", 12, "0123456789") + "-" + characters("slack", 24),
    aws: bytes("invoice-archive", 30).toString("base64"),
    azure: bytes("audit-archive", 64).toString("base64")
  };
  const files = {};
  const findings = [];
  const controls = [];
  const scenarios = [];
  const literal = (id, value, ruleId, extra = {}) => ({ id, value, ruleId, ...extra });
  const clean = (id, value) => ({ id, value });

  function add(relativePath, scenario, template, entries = {}) {
    const positions = [];
    let delta = 0;
    const content = template.replace(/@@(\w+)@@/g, (marker, name, offset) => {
      const entry = entries[name];
      if (!entry) throw new Error(`Missing sample marker: ${name}`);
      positions.push({ entry, offset: offset + delta + (entry.shift || 0) });
      delta += entry.value.length - marker.length;
      return entry.value;
    });
    files[relativePath] = content;
    scenarios.push({ path: relativePath, scenario });
    for (const { entry, offset } of positions) {
      const before = content.slice(0, offset);
      const location = {
        id: entry.id,
        path: relativePath,
        lineNumber: before.split("\n").length,
        columnNumber: offset - before.lastIndexOf("\n")
      };
      if (entry.ruleId) {
        findings.push({
          ...location,
          ruleId: entry.ruleId,
          transformation: entry.transformation || "none",
          locationPrecision: entry.locationPrecision || "exact"
        });
      } else {
        controls.push(location);
      }
    }
  }

  add("src/integrations/payment-client.js", "Payment authorization with a committed environment fallback.",
    String.raw`"use strict";

// Inert synthetic integration sample; not connected to the HTTP server.
function buildPaymentRequest(order, env = {}) {
  const apiKey = env.STRIPE_SECRET_KEY || "@@payment@@";
  return {
    method: "POST",
    url: "https://api.stripe.com/v1/payment_intents",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": "order-" + order.orderId
    },
    body: new URLSearchParams({
      amount: String(Math.round(order.amount * 100)),
      currency: "usd",
      "metadata[order_id]": order.orderId
    }).toString()
  };
}

module.exports = { buildPaymentRequest };
`, { payment: literal("payment-fallback", values.payment, "TI-CREDENTIAL-STRIPE") });

  add("config/payments.json", "Restricted reconciliation credential alongside a public checkout identifier.",
    `{
  "reconciliation": {
    "schedule": "0 2 * * *",
    "pageSize": 100,
    "apiKey": "@@restricted@@"
  },
  "checkout": {
    "publishableKey": "@@public@@",
    "currency": "usd"
  }
}
`, {
      restricted: literal("reconciliation-key", values.reconciliation, "TI-CREDENTIAL-STRIPE"),
      public: clean("publishable-key", "pk_live_" + characters("checkout", 96))
    });

  add("config/notifications.json", "Receipt-delivery settings exported with a Unicode-escaped key prefix.",
    `{
  "provider": "sendgrid",
  "apiKey": "@@mail@@",
  "sender": "receipts@example.invalid",
  "subject": "Your order is confirmed",
  "timeoutMs": 3000
}
`, {
      mail: literal("escaped-mail-key", "\\u0053" + values.mail.slice(1), "CSCAN-GENERAL0140",
        { transformation: "literal-decoding" })
    });

  add("src/integrations/receipt-client.js", "Receipt request construction consumes the exported settings.",
    String.raw`"use strict";

// Returns a request description only. It never delivers mail.
const settings = require("../../config/notifications.json");

function buildReceiptRequest(order, env = {}) {
  return {
    method: "POST",
    url: "https://api.sendgrid.com/v3/mail/send",
    headers: {
      Authorization: "Bearer " + (env.SENDGRID_API_KEY || settings.apiKey),
      "Content-Type": "application/json"
    },
    body: {
      personalizations: [{ to: [{ email: order.receiptEmail }] }],
      from: { email: settings.sender },
      subject: settings.subject,
      content: [{ type: "text/plain", value: "Order " + order.orderId + " is confirmed." }]
    }
  };
}

module.exports = { buildReceiptRequest };
`);

  add("src/integrations/operations-client.js", "Manual-review notifications contain a bot-token fallback.",
    String.raw`"use strict";

// Synthetic scanner input. This module has no network transport.
function buildReviewNotification(order, env = {}) {
  const botToken = env.SLACK_BOT_TOKEN || "@@slack@@";
  return {
    method: "POST",
    url: "https://slack.com/api/chat.postMessage",
    headers: { Authorization: "Bearer " + botToken, "Content-Type": "application/json" },
    body: {
      channel: "C0123456789",
      text: "Order " + order.orderId + " requires merchant review."
    }
  };
}

module.exports = { buildReviewNotification };
`, { slack: literal("operations-bot", values.slack, "CSCAN-COLLAB0010") });

  add("config/invoice-archive.env", "An invoice-export profile accidentally includes an AWS credential pair.",
    `# Synthetic configuration input only; never sourced by the service.
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=@@accessId@@
AWS_SECRET_ACCESS_KEY=@@aws@@
INVOICE_BUCKET=sentinel-order-invoices
INVOICE_PREFIX=year=2026/month=11/
`, {
      accessId: clean("aws-access-identifier", "AKIA" + characters("access-id", 16, "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")),
      aws: literal("invoice-archive-secret", values.aws, "TI-CREDENTIAL-AWS-SECRET")
    });

  add("config/audit-storage.json", "An audit-export connection string contains its storage account key.",
    `{
  "container": "merchant-audit",
  "retentionDays": 90,
  "connectionString": "DefaultEndpointsProtocol=https;BlobEndpoint=https://audit.storage.invalid;AccountName=sentinelaudit;AccountKey=@@azure@@",
  "uploadConcurrency": 2
}
`, { azure: literal("audit-storage-key", values.azure, "CSCAN-AZURE0070") });

  add("src/integrations/release-client.js", "A legacy release client reconstructs a token from constant literals.",
    String.raw`"use strict";

// Offline request construction. No GitHub requests are made.
const fallbackToken = @@joined@@;

function buildReleaseLookup(tag, env = {}) {
  return {
    method: "GET",
    url: "https://api.github.com/repos/example/order-service/releases/tags/" + encodeURIComponent(tag),
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + (env.GITHUB_TOKEN || fallbackToken)
    }
  };
}

module.exports = { buildReleaseLookup };
`, {
      joined: literal("joined-release-token", "'ghp_' +\n  '" + values.release.slice(4) + "'",
        "CSCAN-GH0010", { shift: 1, transformation: "literal-decoding" })
    });

  add(".github/workflows/release.yml", "Release configuration contrasts a copied token with a secret reference.",
    `# Inert synthetic workflow: manual trigger only, and the sole job is always skipped.
name: Release package
on:
  workflow_dispatch:
permissions:
  contents: read
jobs:
  publish:
    if: \${{ false }}
    runs-on: ubuntu-latest
    env:
      GH_TOKEN: "@@release@@"
      NODE_AUTH_TOKEN: @@reference@@
    steps:
      - run: echo "This scanner sample must remain disabled."
`, {
      release: literal("copied-release-token", values.release, "CSCAN-GH0010"),
      reference: clean("workflow-secret-reference", "${{ secrets.NPM_TOKEN }}")
    });

  add("deploy/build/.npmrc", "A scoped registry token is committed in a container-build context.",
    `; Synthetic scanner input, not the repository's active npm configuration.
@sentinel:registry=https://packages.example.invalid/
//packages.example.invalid/:_authToken=@@registry@@
`, { registry: literal("registry-authentication", values.registry, "CSCAN-CICD0020") });

  add("deploy/kubernetes/order-worker-secret.yaml", "A checked-in Secret encodes two integration credentials.",
    `# Synthetic scanner input only. Never apply this manifest.
apiVersion: v1
kind: Secret
metadata:
  name: order-worker-integrations
  namespace: orders
type: Opaque
data:
  RECONCILIATION_API_KEY: @@restricted@@
  SENDGRID_API_KEY: @@mail@@
`, {
      restricted: literal("encoded-reconciliation-key", Buffer.from(values.reconciliation).toString("base64"),
        "TI-CREDENTIAL-STRIPE", { transformation: "base64", locationPrecision: "enclosing" }),
      mail: literal("encoded-mail-key", Buffer.from(values.mail).toString("base64"),
        "CSCAN-GENERAL0140", { transformation: "base64", locationPrecision: "enclosing" })
    });

  add("deploy/recovery/payment-worker.env", "An operations recovery profile duplicates the payment fallback.",
    `# Synthetic recovery profile only; never loaded by the application.
WORKER_CONCURRENCY=2
PAYMENT_TIMEOUT_MS=4000
STRIPE_SECRET_KEY=@@payment@@
`, { payment: literal("copied-payment-key", values.payment, "TI-CREDENTIAL-STRIPE") });

  add("src/config/runtime-integrations.js", "Environment references and secret-file paths do not embed credentials.",
    String.raw`"use strict";

function loadIntegrationSettings(env = {}) {
  return {
    paymentKey: @@paymentEnv@@,
    notificationKey: @@mailEnv@@,
    archiveCredentialsFile: @@mount@@,
    databasePassword: @@dbEnv@@
  };
}

module.exports = { loadIntegrationSettings };
`, {
      paymentEnv: clean("payment-environment-reference", "env.STRIPE_SECRET_KEY"),
      mailEnv: clean("mail-environment-reference", "env.SENDGRID_API_KEY"),
      mount: clean("mounted-secret-path", '"/run/secrets/invoice-archive"'),
      dbEnv: clean("database-environment-reference", "env.DB_PASSWORD")
    });

  add("config/checkout.json", "Client-visible configuration contains identifiers, not secret keys.",
    `{
  "publishableKey": "@@public@@",
  "merchantId": "@@merchant@@",
  "credentialLabel": "@@label@@",
  "receiptTemplate": "@@template@@",
  "publicPayload": "@@payload@@"
}
`, {
      public: clean("checkout-public-key", "pk_live_" + characters("checkout", 96)),
      merchant: clean("merchant-identifier", "merchant-2026-0017"),
      label: clean("short-key-label", "sk_live_REPLACE_ME"),
      template: clean("mail-key-lookalike", "SG.not-a-key"),
      payload: clean("encoded-public-payload", Buffer.from("order-receipt-template-v2-public-content").toString("base64"))
    });

  add("src/templates/payment-labels.js", "Credential-looking fragments are labels or operands, not constant credentials.",
    `"use strict";

const labels = {
  keyLength: @@length@@,
  keyInitial: @@slice@@,
  runtimeSuffix: (env) => @@dynamic@@
};

module.exports = { labels };
`, {
      length: clean("member-length-lookalike", "'sk_live_' + '" + characters("label-length", 24) + "'.length"),
      slice: clean("member-slice-lookalike", "'sk_live_' + '" + characters("label-slice", 24) + "'.slice(0, 1)"),
      dynamic: clean("dynamic-expression", '"ghp_" + env.RELEASE_LABEL')
    });

  add("deploy/build/runtime.npmrc", "A runtime registry profile contains only an environment substitution.",
    `@sentinel:registry=https://packages.example.invalid/
//packages.example.invalid/:_authToken=@@env@@
`, { env: clean("npm-environment-reference", "${NPM_TOKEN}") });

  add("deploy/kubernetes/order-worker.yaml", "A workload references an existing Secret instead of embedding its value.",
    `# Reference-only scanner input; not a deployment instruction.
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-worker
  namespace: orders
spec:
  replicas: 0
  selector:
    matchLabels: { app: order-worker }
  template:
    metadata:
      labels: { app: order-worker }
    spec:
      containers:
        - name: worker
          image: registry.example.invalid/orders/worker:1.0.0
          env:
            - name: SENDGRID_API_KEY
              valueFrom:
                secretKeyRef:
                  name: @@name@@
                  key: SENDGRID_API_KEY
`, { name: clean("kubernetes-secret-reference", "order-worker-integrations") });

  const manifest = {
    version: 1,
    syntheticOnly: true,
    liveValidationPerformed: false,
    countMeaning: "Distinct rule and source locations, not unique credential values.",
    expectations: "Declared from generated source positions, not learned from scanner output.",
    files: scenarios,
    findings,
    controls,
    sources: [
      { topic: "Stripe secret, restricted and publishable keys", url: "https://docs.stripe.com/keys" },
      { topic: "Stripe request authentication", url: "https://docs.stripe.com/api/authentication" },
      { topic: "SendGrid receipt authentication and mail shape", url: "https://www.twilio.com/docs/sendgrid/for-developers/sending-email/quickstart-nodejs" },
      { topic: "Slack bot-token purpose and prefix", url: "https://docs.slack.dev/authentication/tokens/" },
      { topic: "AWS environment credential fields", url: "https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html" },
      { topic: "Azure Storage connection-string fields", url: "https://learn.microsoft.com/en-us/azure/storage/common/storage-configure-connection-string" },
      { topic: "Registry-scoped npm authentication", url: "https://docs.npmjs.com/cli/v11/configuring-npm/npmrc/" },
      { topic: "Kubernetes data and secret references", url: "https://kubernetes.io/docs/concepts/configuration/secret/" },
      { topic: "GitHub Actions secret references", url: "https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets" }
    ]
  };
  files["test/credential-expectations.json"] = JSON.stringify(manifest, null, 2) + "\n";
  return { files, manifest, syntheticValues: Object.values(values) };
}

if (require.main === module) {
  const mode = process.argv[2] || "--check";
  if (!["--write", "--check"].includes(mode) || process.argv.length > 3) {
    throw new Error("Usage: node tools/integration-samples.js [--check|--write]");
  }
  const { files, manifest } = buildSamples();
  for (const [relativePath, content] of Object.entries(files)) {
    const target = path.join(root, relativePath);
    if (mode === "--write") {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content, "utf8");
    } else if (!fs.existsSync(target) || fs.readFileSync(target, "utf8").replace(/\r\n/g, "\n") !== content) {
      throw new Error(`Generated sample differs: ${relativePath}`);
    }
  }
  console.log(`${Object.keys(files).length} files; ${manifest.findings.length} expected locations; ${manifest.controls.length} clean controls.`);
}

module.exports = { buildSamples };
