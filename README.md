# Sentinel Order Risk Service

A small, runnable merchant risk API used to validate repository threat-intelligence preprocessing. The service uses only Node.js built-ins and makes no outbound network requests.

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

## Threat-intelligence fixtures

All fixtures are inert and exist only for scanner validation.

| Expected scanner path | Fixture |
|---|---|
| URL reputation from source code | `src/config/reputation-blocklist.js` |
| File reputation / antivirus test file | `test-fixtures/file-reputation/eicar.com.txt` |
| URL extracted from an embedded data URI | `src/templates/merchant-preview.js` |
| Package reputation from a lockfile | `test-fixtures/package-reputation/package-lock.json` |

The EICAR file is the standard harmless antivirus test file. Microsoft Defender or another endpoint product may quarantine it automatically; that behavior confirms the file-reputation fixture is working. The package lock models a retired legacy worker and is not part of the runnable application's dependency graph.
