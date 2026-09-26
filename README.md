# Sentinel Order Risk Service

A small, runnable merchant risk API for evaluating orders that may require manual review. The service uses only Node.js built-ins and makes no outbound network requests.

The repository also contains inert threat-intelligence fixtures that resemble
normal service dependencies, including a configured partner payment gateway,
its server certificate and certificate chain, and a release-signing
certificate. They are test data only and must not be used for authentication,
signing, encryption, or production traffic.

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
