# Verification boundaries

Carry Intel sells a read-only screen over public Hyperliquid data. This repository is useful only if its claims stay narrower than its evidence.

## What can be reproduced

The `settled prints` rows in `reports/YYYY-MM-DD.md` come from Hyperliquid's public `fundingHistory` endpoint.[7] Re-query one day and compare every printed annualized rate, print count, and negative-print count:

```sh
node scripts/verify-settled-prints.mjs 2026-10-12
node scripts/verify-settled-prints.mjs --all
```

The verifier makes unauthenticated public API requests. It does not access a wallet, sign a challenge, transfer funds, or place trades. Annualized rate is `mean(hourly fundingRate) × 24 × 365 × 100`; it is not portfolio return.

## What this repository does not prove

- The hourly watchdog samples are stored in the operator's private state file, not in this repository. Their per-day sample pace cannot be independently rebuilt from this tree.
- `carry-monitor.mjs`, `funding-digest.mjs`, and `x409-fingerprint.mjs` require an explicit `CARRY_STATE_FILE` pointing to that private file. No operator state is bundled, and these scripts do not establish live positions or trade execution.
- The historical `180d avg` values were hard-coded in the report generator and the underlying 180-day series was not published. Those values are withdrawn as evidence; see [the 2026-10-13 errata](../reports/errata-2026-10-13.md).
- A funding rate is not an executed return. These reports do not include a complete, account-level ledger of fills, fees, slippage, spot borrow, liquidation risk, or realized P&L.
- The `reports/reserves-*.md` files are dated account-balance snapshots. They are not an independent audit, proof of client assets, or client AUM.
- `carry-exec.mjs` is a dry-run planner. Its live order-submission path exits with status 2; it does not trade.
- The separate vault proposal is inactive. `aum-ledger.json` records paused intake, no depositors, and zero recorded deposits. Do not send funds to any address shown in historical Git commits or reports.

## Current-state check

The live `/verify` endpoint re-queries public Hyperliquid and Solana APIs. At `2026-10-14T02:19:27.767Z`, its `live_now.perp_positions` list was empty, while its `claim` field still said the operator runs the advertised carry position live.[5] The live `/mcp` tool description also claims "live position tracking."[11] Do not repeat the live-strategy claim; re-run `/verify` before relying on any current account-state claim:

```sh
curl -fsS https://devbox.tail873466.ts.net:10000/verify
```

The current `/pricing` response describes a "live, on-chain-verifiable trading system" and advertises a fund with "deposits >= $10 USDC"; `/verify` still claims live operation despite the empty position list.[4][5] The live `/mcp` text repeats the unsupported position claim.[11] Until `/pricing`, `/fund`, `/verify`, and `/mcp` descriptions are corrected in the shared API checkout, do not interpret the fund section as an open offer or deposit route. The per-call API prices are $0.10 for verdicts, $0.50 for the opportunities scan, and $0.02 for the latest digest; verify the current 402 amount before authorizing any payment.[4]

## Licensing

This repository has no root `LICENSE` file. Public visibility does not grant a reuse license. Paid API responses are governed by the live [Carry-Intel Proprietary Data License](https://devbox.tail873466.ts.net:10000/license). Hyperliquid's raw funding facts remain independently retrievable from its public API.

## Sources

[4] https://devbox.tail873466.ts.net:10000/pricing
[5] https://devbox.tail873466.ts.net:10000/verify
[7] https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/perpetuals
[11] https://devbox.tail873466.ts.net:10000/mcp
