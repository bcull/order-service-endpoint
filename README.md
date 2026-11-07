# Sentinel Order Risk Service

A small, runnable merchant risk API for evaluating orders that may require manual review. The service uses only Node.js built-ins and makes no outbound network requests.

The repository also contains inert threat-intelligence fixtures that resemble
normal service dependencies, including a configured partner payment gateway,
its server certificate and certificate chain, and a release-signing
certificate. They are test data only and must not be used for authentication,
signing, encryption, or production traffic.

Network and certificate-reputation indicators include:

- partner endpoints `94.154.43.254`, `102.220.160.67`, `66.132.186.197`,
  and `85.217.149.19`
- revoked certificate SHA-1 `8dccf6ad21a58226521e36d7e5dbad133331c181`

Two additional public CA fixtures exercise certificate-reputation enrichment.
Each PEM contains only the named CA certificate, with no leaf certificate or
private key. The service does not load these fixtures or install them in a
trust store. Provider metadata may change between scans.

| Certificate fixture | Certificate SHA-1 |
| --- | --- |
| `config/certificates/positivessl-ca-2.pem` (PositiveSSL CA 2) | `94807b1c788dd2fcbe19c8481ce41cfab8a4c17f` |
| `config/certificates/rapidssl-sha256-ca.pem` (RapidSSL SHA256 CA) | `c86edbc71ab05078f61acdf3d8dc5db61eb75fb6` |

These are the matching certificate blocks from badssl.com's
[`wildcard-sha1-2016.pem`](https://github.com/chromium/badssl.com/blob/bfc80f7c2bf0873e2fdc9ba79f38a5afd93570fb/certs/sets/prod/pregen/chain/wildcard-sha1-2016.pem)
and
[`subdomain-invalid-expected-sct.pem`](https://github.com/chromium/badssl.com/blob/bfc80f7c2bf0873e2fdc9ba79f38a5afd93570fb/certs/sets/prod/pregen/chain/subdomain-invalid-expected-sct.pem),
respectively, rather than the complete chains.

Package-reputation fixtures cover npm, NuGet, PyPI, Maven, Gradle, and Cargo
manifests under `test-fixtures/package-reputation`. These manifests are scanner
inputs only and should not be installed.

| Ecosystem | Package | Scanner test case |
| --- | --- | --- |
| npm | `eicar@1.0.0` | Malicious package and file-metadata enrichment |
| npm | `lodash@4.17.21` | Additional reputation or vulnerability result |
| npm | `left-pad@1.3.0` | Unknown verdict |
| npm | `@scope/tool@1.2.3` | Scoped package/PURL encoding |
| NuGet | `Newtonsoft.Json@13.0.3` | NuGet discovery |
| PyPI | `requests@2.32.3` | PyPI discovery |
| Maven/Gradle | `org.apache.commons:commons-lang3:3.17.0` | JVM manifest discovery |
| Cargo | `serde@1.0.210` | Cargo discovery |

## Run

```powershell
npm start
```

Then open `http://localhost:3000/health` or submit an order:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/risk/evaluate `
  -ContentType application/json `
  -Body '{"orderId":"ord-1001","amount":7200,"country":"US"}'
```

Run validation with:

```powershell
npm test
```

## API

### `GET /health`

Returns the current service health.

### `POST /api/risk/evaluate`

Accepts an order with an `orderId`, non-negative `amount`, and two-letter `country`. The response recommends either approval or manual review and includes the reasons for that decision.

### `POST /api/risk/integration-plan`

Accepts the same order input and previews the configured risk, fulfillment,
payment, and notification destinations. The response includes the normalized
order ID, risk decision, and planned HTTPS request methods and URLs.
Destinations are configured in `src/config/order-integrations.js`; the planner
does not send requests, resolve hosts, or require provider credentials.
The existing evaluation response is unchanged.

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/risk/integration-plan `
  -ContentType application/json `
  -Body '{"orderId":"ord-1001","amount":42.5,"country":"US"}'
```

## Integration credential examples

The integration files model mistakes in an order service, not recommended
credential-handling practices. Every credential-shaped value is generated from
public fixed inputs by `tools/integration-samples.js`; none was obtained from a
provider or validated against a live account. The request builders are not
connected to the HTTP server and have no network transport.

| Business context | Scanner challenge |
| --- | --- |
| Payment authorization and recovery profile | A committed fallback key copied into two remediation locations |
| Overnight payment reconciliation | A restricted key next to a public checkout key |
| Receipt delivery | A Unicode-escaped mail credential in JSON consumed by a request builder |
| Merchant review notifications | A bot-token fallback in ordinary JavaScript |
| Invoice and audit exports | An AWS credential pair and an Azure Storage connection string |
| Release lookup and registry configuration | A constant-joined GitHub token, a copied workflow token, and scoped npm authentication |
| Kubernetes worker configuration | Base64-encoded integration credentials beside a reference-only workload |

`test/credential-expectations.json` declares **12 expected rule/source
locations** and **17 named clean controls**, with one-based lines and UTF-16
columns. It also records the official documentation used to design the
scenarios. Expectations are derived from template positions before scanning,
not copied from actual findings. Separate files containing the same value
remain separate findings. Base64 findings point to the enclosing encoded value.

The controls include environment substitutions, mounted-secret paths,
publishable keys, an AWS access identifier without its secret on that line,
short placeholders, public Base64 content, and expressions that look like
constant concatenation but evaluate differently. Detecting these examples
does not establish that a credential is usable or that every provider format
is covered.

```powershell
node tools/integration-samples.js --check
npm run check
```

Use `node tools/integration-samples.js --write` only when intentionally
regenerating the samples. The local tests verify reproducibility, offline
request construction, and fixture safety; they do not contain a credential
scanner. Compare an actual TI Preprocessor scan with the expectation manifest
to measure misses, unexpected findings, and source-location accuracy.

### Observed detection boundaries

The local V3 credential-enabled TI Preprocessor run found all 12 intended
source locations and no unexpected credential locations. **10 of 12** also
matched the expected rule and transformation metadata. These two differences
remain visible in the expectations rather than being rewritten to pass:

| Example | Expected | Observed |
| --- | --- | --- |
| Scoped npm authentication | npm-specific rule `CSCAN-CICD0020` | Generic authentication rule `CSCAN-GENERAL0001`, at the correct token location |
| Base64 mail credential | `base64` transformation, `enclosing` location | Generic raw carrier match: `none` transformation, `exact` location |

The second case detects the encoded material but does **not** demonstrate
decoded mail-key recognition in the public report. The encoded reconciliation
key does report the expected Base64 transformation and enclosing location.
These are synthetic sample results for the current development scanner, not
claims about live validity, every credential format, or the default V2 output.
The strict metadata comparison therefore has two mismatches, not a fully
passing result.

Verification used fake partner-reputation responses and checked both V3 and V2
artifacts for generated credential values. Two pre-existing malware fixtures
were excluded because host antivirus blocked access; two other binary files
were skipped by credential discovery. No new integration sample was excluded.
The existing classified-fixture test also fails locally when antivirus removes
its input; this change does not disable that test or restore quarantined data.

Do not source the `.env` examples, apply the Kubernetes manifests, or use these
values for authentication. The release workflow is manual-only with an
unconditional false job guard. Registry authentication lives under
`deploy/build`, never in the root npm configuration.
