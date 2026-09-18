# Sentinel Order Risk Service

A small, runnable merchant risk API for evaluating orders that may require manual review. The service uses only Node.js built-ins and makes no outbound network requests.

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
