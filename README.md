# Sentinel Order Risk Service

A small, runnable merchant risk API for evaluating orders that may require manual review. The service uses only Node.js built-ins and makes no outbound network requests.

The repository also contains inert threat-intelligence fixtures that resemble
normal service dependencies, including a configured partner payment gateway,
its server certificate and certificate chain, and a release-signing
certificate. They are test data only and must not be used for authentication,
signing, encryption, or production traffic.

Network and certificate-reputation indicators include:

- partner endpoints `94.154.43.254` and `102.220.160.67`
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
