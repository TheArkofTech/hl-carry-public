# Carry Intel — Hyperliquid funding and hedgeability screen

## Funding rates are public. False hedges are expensive.

Carry Intel is a **read-only market-data service** for agents screening Hyperliquid funding. It separates the protocol's default funding floor from above-floor observations, checks for a matching spot market and a minimum 24-hour pair-volume threshold, and exposes settled funding prints—including negative hours.

The product is the filter and the audit trail, not the raw funding rate. **Funding rates are not returns.** An annualized funding quote is not realized portfolio P&L; a spot/perp pair is not risk-free, and this screen does not model execution depth, fees, slippage, borrow, liquidation, or venue risk.

## Current product and pricing

| Tool | Current price | What it returns |
|---|---:|---|
| `carry_free_sample` | Free | Prior-day digest |
| `carry_digest` | $0.02/call | Latest digest |
| `carry_verdicts` | $0.10/call | Funding classifications and available basis observations |
| `carry_opportunities` | $0.50/call | Full-universe candidate scan with spot-market and volume screening |

The API's current direct x402 ladder is 2¢, 10¢, and 50¢ per call.[4]

The MCPRush listing is already **Free ($0)** with no paid plan; its live page says the publisher endpoint is outside the marketplace path and MCPRush cannot bill for calls.[10]

MCPRush's 12% platform fee is on net marketplace sales, with processing fees separate; it does not apply to these direct x402 calls.[1][10]

The listing's paid-call prices and live-position claim are stale.[10][5] See [the prepared next-release copy](docs/mcprush-listing-copy.md).

An unpaid request to a paid route returns an HTTP 402 challenge. A client must independently validate the exact route and amount and obtain authorization before signing; the API does not silently charge a wallet.

## Current status — do not confuse the data service with a fund

- At `2026-10-14T02:19:27.767Z`, the live [`/verify` response](https://devbox.tail873466.ts.net:10000/verify) returned an empty `live_now.perp_positions` list while its claim field still asserted the operator runs the strategy live. The live `/mcp` tool description also claims "live position tracking."[5][11] The endpoint contradicts itself; do not repeat either live-position claim.
- The checked-in `aum-ledger.json` is dated `2026-10-13T22:57:21.137Z` and records paused intake, no depositors, and `$0` recorded deposits. The live `/pricing` still advertises legacy fund deposits, so the repository record and API copy conflict. **Do not send funds** to an address found in an old commit or report.
- `carry-exec.mjs` is a dry-run planner. Its live order-submission path exits with status 2; it does not place trades.
- The current API [`/pricing`](https://devbox.tail873466.ts.net:10000/pricing) and `/fund` responses still contain stale fund/deposit copy that conflicts with this status.[4][5] Until those API surfaces are corrected, do not treat their fund section as an open offer or deposit route. The mismatch is documented in [verification boundaries](docs/verification.md).

## What this repository can prove

- The `settled prints` rows in `reports/YYYY-MM-DD.md` can be independently re-queried from Hyperliquid's public `fundingHistory` API.[7] Run `node scripts/verify-settled-prints.mjs --all` to check each reported rate, print count, and negative-hour count.
- The historical watchdog sample pace is operator telemetry; its raw state file is not published here, so those sample values are not independently reproducible from this repository.
- The historical `180d avg` values were hard-coded without the underlying series and are withdrawn. The `DEPLOY`/`HOLD` tags were model-screen labels, not proof of executed orders. See the [2026-10-13 errata](reports/errata-2026-10-13.md).
- `reports/reserves-*.md` are dated account-balance snapshots, **not** an independent proof of reserves, client AUM, or strategy returns.

## Connect

The remote MCP endpoint is `https://devbox.tail873466.ts.net:10000/mcp`. `tools/list` and the free sample are available without payment. Paid tool calls return the x402 challenge for their published route price.

```json
{"mcpServers":{"carry-intel":{"url":"https://devbox.tail873466.ts.net:10000/mcp"}}}
```

The separate read-only Carry Console MCP App [12][13] is available at `https://devbox.tail873466.ts.net:10000/mcp/carry-console`:

```json
{"mcpServers":{"carry-console":{"url":"https://devbox.tail873466.ts.net:10000/mcp/carry-console"}}}
```

Its `carry_opportunities_ui` tool renders the same **$0.50** scan.[12][4] Discovery is free. The current tool schema accepts only a `ui_refresh` interaction; payment authorization travels through the HTTP `PAYMENT-SIGNATURE` header, never tool arguments.[12][13] The app does not sign payments or execute trades.[13]

## Verification commands

```sh
curl -fsS https://devbox.tail873466.ts.net:10000/verify
node scripts/verify-settled-prints.mjs 2026-10-12
node scripts/verify-settled-prints.mjs --all
node --test test/*.test.mjs
node scripts/validate-public.mjs
```

The settled-print verifier makes public read-only data requests. It does not access keys, wallets, paid endpoints, or trading routes. `docs/verification.md` describes the evidence boundaries and known API-copy mismatch.

## Licensing

This repository has no root open-source license; public visibility does not grant reuse rights. See [license status](LICENSE-STATUS.md). The paid API response terms are published at <https://devbox.tail873466.ts.net:10000/license>.

## Sources

[1] https://mcprush.com/for-publishers
[4] https://devbox.tail873466.ts.net:10000/pricing
[5] https://devbox.tail873466.ts.net:10000/verify
[7] https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/perpetuals
[10] https://mcprush.com/thearkoftech/carry-intel-hyperliquid-funding-carry-intelli-mcp
[11] https://devbox.tail873466.ts.net:10000/mcp
[12] https://devbox.tail873466.ts.net:10000/mcp/carry-console
[13] https://github.com/TheArkofTech/x402-carry-api/blob/main/apps/carry-console/src/server.mjs
