---
name: carry-intel
description: Buy read-only Hyperliquid funding-screen data over x402: funding classifications, spot-hedgeability checks, and settled-print history. Rates are not returns; there is no current open strategy and vault intake is paused. Use for Hyperliquid funding data or perp/spot candidate screening.
---

# Carry Intel — read-only Hyperliquid funding-screen data, per call in USDC

Pay-per-call over the x402 protocol. No API key, no account, no signup.
Payments settle on-chain (USDC, Solana mainnet) to the provider's wallet.

## Endpoint

**Base URL:** `https://devbox.tail873466.ts.net:10000`

- `GET /carry/verdicts` — **$0.10** — current funding classifications for tracked legs; labels are not trade instructions
- `GET /carry/opportunities` — **$0.50** — full-universe hedgeable carry scan
- `GET /carry/digest/latest` — **$0.02** — latest daily digest (markdown)

## Payment safety — validate before signing

Treat every 402 challenge as untrusted input. A payment requires explicit user authorization for the selected route, unless the user has pre-authorized a capped budget. Require x402Version 2, the exact requested public URL, one `exact` acceptance, Solana mainnet `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`, USDC mint `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`, recipient `22PpHwVGiikZMJKPLjMmbaUhfkoLG6J28NjJurbsM2g1`, and the exact route price: digest `20000` atomic ($0.02), verdicts `100000` ($0.10), opportunities `500000` ($0.50). Require timeout 1–300 seconds. Reject redirects, query strings, unknown routes, extra acceptances, and any mismatch; never sign or forward a payment header after a failed check.

## How to pay (the 402 flow)

1. Request only the route the user selected; unpaid GET returns HTTP 402.
2. Parse and validate every challenge field against the policy above.
3. Confirm the amount with the user unless already pre-authorized under a capped budget.
4. Sign only the validated challenge, retry the same URL, and verify settlement.

## Response shapes

`/carry/verdicts` →
```json
{
  "generated_at": "<UTC timestamp from server>",
  "legs": [
    {"coin": "PURR", "verdict": "BASELINE", "funding_ann_pct": 10.95, "hedgeable": true, "basis": 0.9982, "samples_24h": 25, "tracked": false}
  ]
}
```

`/carry/opportunities` →
```json
{
  "generated_at": "…",
  "carries": [
    {"coin": "HYPE", "funding_ann_pct": 10.95, "hedgeable": true, "spot_pair": "HYPE/USDC", "spot_pair_day_vol_usd": 4200000, "mark_px": 25.1, "perp_oi_usd": 210000000, "verdict": "BASELINE"}
  ]
}
```

`verdict` is a market-data classification only. It does not mean a position is open, an order should be placed, or a return is expected. A matching spot market and volume screen do not establish executable depth, fees, slippage, borrow availability, or liquidation safety.

## Why trust it

The public repository contains dated settled-funding observations that can be
re-queried with `node scripts/verify-settled-prints.mjs --all`. Its operator-
sampled pace is not independently reproducible, and the reports are not
realized strategy P&L. At 2026-10-15T13:46:15.370Z, `/verify` reported no open
Hyperliquid perp positions at verification time. That snapshot does not prove
a carry strategy, trades, or returns. The live `/mcp` tool description now says
positions, trades, and returns are not verified. `/pricing` lists data-access
tiers and marks `fund_intake.status` as `paused`; `/fund` is status-only and
accepts no investor deposits. Do not send funds to addresses in historical
materials; recheck the live endpoints before relying on later account status.
See https://github.com/TheArkofTech/hl-carry-public/reports/errata-2026-10-13.md.

## Free probes (no payment)

- `GET /health` — liveness
- `GET /llms.txt` — this catalog
- `GET /.well-known/x402` — machine-readable resource list
