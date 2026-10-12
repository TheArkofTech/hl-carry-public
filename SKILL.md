---
name: carry-intel
description: Buy Hyperliquid funding-carry intelligence over x402 — live DEPLOY/WEAK/NEG verdicts per leg, full-universe hedgeable carry scans, and daily settled-prints digests. Use when the task involves Hyperliquid funding rates, carry trading, perp/spot hedging, or finding positive-carry opportunities.
---

# Carry Intel — Hyperliquid funding-carry intelligence, per call in USDC

Pay-per-call over the x402 protocol. No API key, no account, no signup.
Payments settle on-chain (USDC, Solana mainnet) to the provider's wallet.

## Endpoint

**Base URL:** `https://devbox.tail873466.ts.net:10000`

- `GET /carry/verdicts` — **$0.10** — live deploy/watch verdicts for tracked legs
- `GET /carry/opportunities` — **$0.50** — full-universe hedgeable carry scan
- `GET /carry/digest/latest` — **$0.02** — latest daily digest (markdown)

## How to pay (the 402 flow)

1. Call the endpoint unpaid → get `HTTP 402` + challenge in the `PAYMENT-REQUIRED` header (base64 JSON, `x402Version: 2`)
2. Build the payment payload for the scheme you support (`exact`, USDC on `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`, payTo as specified in the challenge)
3. Retry with `PAYMENT-SIGNATURE: <payload>` header → `HTTP 200` + data
4. Any x402-compatible wallet/client handles this automatically — `x402-fetch`, `@x402/svm` client packages, CDP SDK, or an MCP payment-wrapped client

## Response shapes

`/carry/verdicts` →
```json
{
  "generated_at": "2026-10-10T15:55:17.884Z",
  "legs": [
    {"coin": "PURR", "verdict": "DEPLOY", "funding_ann_pct": 10.95, "hedgeable": true, "basis": 0.9982, "samples_24h": 25, "tracked": false}
  ]
}
```

`/carry/opportunities` →
```json
{
  "generated_at": "…",
  "carries": [
    {"coin": "HYPE", "funding_ann_pct": 10.95, "hedgeable": true, "spot_pair": "HYPE/USDC", "spot_pair_day_vol_usd": 4200000, "mark_px": 25.1, "perp_oi_usd": 210000000, "verdict": "DEPLOY"}
  ]
}
```

`verdict` semantics: `DEPLOY` = funding ≥ 5%/yr AND spot hedge liquid (≥ $10k/day pair volume). `WEAK` = positive but < 5%/yr. `NEG` = negative funding (no carry). `UNHEDGEABLE` = positive funding but the spot hedge book is a dead trap — do not touch.

## Why trust it

The seller runs this strategy live with its own capital and publishes a
settled-prints track record daily — including worst days — at
https://github.com/TheArkofTech/hl-carry-public. Every digest shows actual
settled funding per leg, not sampled estimates.

## Free probes (no payment)

- `GET /health` — liveness
- `GET /llms.txt` — this catalog
- `GET /.well-known/x402` — machine-readable resource list
