# Carry Watch — founding-pilot interest test

**Not a live subscription. No payment is being collected.** Carry Intel currently sells read-only x402 market-data calls; this page tests demand for a different job: alert an operator when a *rare, on-venue spot-screened funding regime* changes, rather than charging them to poll an unchanged screen. It does not manage capital or place trades.

## Why an alert, not another funding dashboard?

Hyperliquid publishes current perp funding, spot metadata, and spot asset contexts through its Info API. Funding settles hourly.[1][2][3] The rate is public; the useful work is removing false positives, showing why a candidate failed, and noticing when that answer changes.

**Dated example, not a live quote:** at **2026-10-15 18:59:01 UTC**, a read-only Carry Intel scan observed **153 perps with positive current funding** on Hyperliquid's first perp DEX. **151** did not pass *our specific on-Hyperliquid USDC-quoted spot-pair and ≥$10,000 24-hour pair-volume screen*. The remaining **two** (PURR and HYPE) showed **10.95% simple annualized current funding**, both classified `BASELINE`; **zero** passed the current `EDGE` threshold of **11.95% simple annualized**. This is one instantaneous observation, not a historical frequency estimate. It does **not** rule out a hedge on another venue or at another time. The screen does not measure book depth, fees, slippage, borrow, liquidation, or executable P&L.

Method for that snapshot: fetch `metaAndAssetCtxs`, `spotMeta`, and `spotMetaAndAssetCtxs`; retain positive current perp funding; match the perp base name to a USDC spot pair; require at least $10,000 reported 24-hour spot-pair notional volume; calculate simple annualized funding as `hourly_rate × 24 × 365 × 100`. The metadata and spot-context response types are documented by Hyperliquid.[2][3] The numerical counts above came from the read-only scan at the stated timestamp; they are not a prediction or an executed trade.

## Available now versus proposed

| Available today | Proposed Carry Watch pilot — **not yet running** |
| --- | --- |
| [Free older dated settled digest](https://devbox.tail873466.ts.net:10000/carry/digest/free?src=github), no wallet or signup. The response names its date. | Shared hourly observation of a consenting buyer's selected coins, initially up to three. |
| $0.02 latest digest, $0.10 verdicts, $0.50 opportunity scan, each per call via x402/Solana USDC.[7] | Change-only notices showing a candidate's current screen state, freshness, and the reason it passed or failed. |
| Read-only, gross funding and on-venue spot-volume screens. | Before any execution-quality label: independently test basis, order-book depth/estimated slippage, fees, and persistence of **settled** funding. Those checks are **not** in the current paid scan. |

**Founding price to test: $29 per month**, for the bounded watch service described above. This is a *willingness-to-pay hypothesis*, not an available checkout, invoice, subscription, or demonstrated market price. No auto-renewal, prepayment, or deposit is requested here. If buyers do not validate the use case and delivery costs, the pilot will not launch at that price.

## Take part in the demand test

[Open a **public Carry Watch pilot inquiry**](https://github.com/TheArkOfTech/hl-carry-public/issues/new?template=carry-watch-pilot.yml). The form asks for your workflow, a public market name, the change worth an alert, and whether a demonstrated bounded service would be worth **$29/month**. GitHub issues are visible to everyone: **do not post wallet addresses, keys, API tokens, notional, positions, order details, confidential strategy information, or funds.** This is an expression of interest, not an account sign-up or a private procurement channel.

We will count independent, consented issue responses and explicit willingness to pay separately from free-sample requests. A marketplace install, GitHub clone, MCP `tools/list`, or x402 challenge is not a paying customer. Current funding rates are not realized returns; no positions, trades, or investment results are being represented.

## Sources

[1] https://hyperliquid.gitbook.io/hyperliquid-docs/trading/funding
    > "The funding rate on Hyperliquid is paid every hour."
[2] https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/perpetuals
    > "Retrieve perpetuals asset contexts (includes mark price, current funding, open interest, etc.)"
[3] https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/spot
    > "Retrieve spot asset contexts"
[7] https://devbox.tail873466.ts.net:10000/pricing
    > "one invoice, no wallets in procurement"
