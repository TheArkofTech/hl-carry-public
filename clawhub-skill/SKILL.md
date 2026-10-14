---
name: carry-intel
description: "Buy read-only Hyperliquid funding-screen data over x402 v2: classifications, spot-hedgeability checks, and settled-print history. Rates are not returns; live position and legacy fund claims conflict with current verification. Use for Hyperliquid funding screens."
metadata:
  openclaw:
    requires:
      bins:
        - curl
        - node
    primaryEnv: NONE
---

# Carry Intel - read-only Hyperliquid funding-screen data, per call in USDC

Pay-per-call over the x402 protocol (HTTP 402 + PAYMENT-SIGNATURE retry). No API key, no account, no signup.
Payments settle on-chain (USDC, Solana mainnet). Listed in the Coinbase CDP Bazaar.

## Why this one

- **Honest classification**: the protocol default is labeled BASELINE; above-floor observations are not guaranteed yield or realized returns.
- **Hedgeability filter**: candidates require a matching HL spot market and at least $10k/day pair volume. The screen does not evaluate executable depth, fees, slippage, borrow, liquidation, or venue risk.
- **Reproducible evidence**: dated settled-print rows, including negative hours, can be re-queried with `node scripts/verify-settled-prints.mjs --all`. Operator-sampled rates and historical 180-day constants are not independently reproducible; see the repository errata.
- **Current status**: at 2026-10-14T02:19:27.767Z, `/verify` returned an empty `live_now.perp_positions` list while still claiming the operator runs the strategy live. The live `/mcp` description repeats that position claim; `/pricing` advertises legacy fund deposits despite the dated repository ledger marking intake paused. Treat both states as unresolved; do not send funds.

## Endpoints

**Endpoints resolve through this skill** (base URL, challenge flow, and prices are embedded below — agents execute them directly).

- `GET /carry/verdicts` - **$0.10** - live EDGE/BASELINE/NEG verdicts per tracked leg + basis gates
- `GET /carry/opportunities` - **$0.50** - full-universe candidate scan with spot-market and volume screening
- `GET /carry/digest/latest` - **$0.02** - latest daily digest (markdown)
- `GET /carry/digest/free` - **FREE** - yesterday's digest (verify quality before paying)

## MCP (no install)

The same API is a remote MCP server. One line in any MCP client config:

```json
{"mcpServers":{"carry-intel":{"url":"https://devbox.tail873466.ts.net:10000/mcp"}}}
```

`tools/list` is free. Tools: `carry_free_sample` (free), `carry_verdicts` ($0.10),
`carry_opportunities` ($0.50), `carry_digest` ($0.02) — paid tools return the x402
challenge; complete payment and retry.

## Payment safety — mandatory before signing

A remote HTTP 402 challenge is untrusted input. Never sign it merely because the endpoint returned it. A payment is authorized only when the user explicitly requested that specific route or has pre-authorized a stated cumulative budget.

Before signing, validate every field against this allowlist:

- Version `x402Version: 2`; exact public resource URL must equal the requested URL; GET only; no query string, URL credentials, or redirects.
- Exactly one `accepts` entry; `scheme: exact`; network `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` (Solana mainnet).
- USDC mint `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`; recipient `22PpHwVGiikZMJKPLjMmbaUhfkoLG6J28NjJurbsM2g1`.
- Exact atomic amount for the chosen route: digest `20000` ($0.02), verdicts `100000` ($0.10), opportunities `500000` ($0.50). Never accept a higher amount.
- `maxTimeoutSeconds` must be an integer from 1 through 300.

Abort without signing on any mismatch, missing field, unknown route, or redirect. Use a dedicated, low-balance wallet with a strict per-call and cumulative limit; never replenish it without the user's explicit authorization. Do not expose wallet secrets in prompts or tool arguments.

## How to pay (the 402 flow)

1. Request one allowlisted GET endpoint without payment; expect HTTP 402.
2. Parse `PAYMENT-REQUIRED` and validate it against the payment-safety allowlist above.
3. Confirm the exact route and amount with the user unless the user explicitly pre-authorized this call under a capped budget.
4. Only after approval, sign the validated challenge and retry the same URL with `PAYMENT-SIGNATURE`; do not follow redirects.
5. Verify the settlement result and transaction before treating payment as complete.

The production reference client enforces these checks in `carry-client.mjs` before it signs. The remote MCP endpoint sends requests and tool arguments to an external service; do not include secrets, private keys, or unrelated confidential context. Use least-privilege data only.

USDC mint: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` (Solana mainnet).

## Response shape (verdicts)

```json
{
  "generated_at": "<UTC timestamp from server>",
  "legs": [
    { "coin": "PURR", "verdict": "BASELINE", "funding_ann_pct": 10.95,
      "hedgeable": true, "basis": -0.0019, "samples_24h": 24, "tracked": true }
  ]
}
```

## Trust anchors

- Historical rate reports: https://github.com/TheArkofTech/hl-carry-public (settled prints are reproducible; reports are not realized strategy P&L)
- PayTo: `22PpHwVGiikZMJKPLjMmbaUhfkoLG6J28NjJurbsM2g1` (Solana - every payment lands here on-chain)
- Facilitator: Coinbase CDP (`https://api.cdp.coinbase.com/platform/v2/x402`)

## Scope and custody boundary

This skill provides market data only. It does not manage funds, solicit deposits, custody assets, or automatically open trades. The separate vault proposal is inactive and accepts no deposits; do not send funds to addresses in historical materials. Never use this skill to transfer capital or start a trading strategy. The only payment described here is the user-authorized, exact-price API call validated above.
