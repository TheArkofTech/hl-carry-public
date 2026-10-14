# MCPRush listing draft

**Marketplace economics:** the live MCPRush listing is already **Free ($0)**, has no plan, and says the publisher-hosted endpoint is outside MCPRush's call path.[10]

The publisher fee is 12% of net marketplace sales; payment-processing fees are separate.[1]

No MCPRush markup is needed on direct x402 calls.[1][10]

**Current listing is stale:** its verdict description costs 5¢, opportunities 25¢, and digest 1¢ per call, and claims "live position tracking."[10]

The live API charges 10¢, 50¢, and 2¢ in that route order; `/verify` currently returns an empty perp-position list.[4][5]

The live `/mcp` description repeats the tracking claim.[11] Align prices and remove the live-position claim from both surfaces before the next release.

## Price architecture and market anchor

The live API ladder is 2¢ for the latest digest, 10¢ for verdicts, and 50¢ for the full opportunities scan.[4] 2s lists raw Hyperliquid funding data at $0.0036 per call.[3] CoinGlass Hobbyist is $29/month with 80+ data endpoints and a 30-request/minute limit.[2] These are not apples-to-apples: our premium must be earned by screening, hedgeability metadata, and visible negative settled prints—not by reselling a public rate. Relative to 2s's raw call, the price ladder is about 6× / 28× / 139×, so the full scan needs a crisp, defensible value proposition.[2][3][4]

**Pricing decision:** keep the direct x402 ladder unchanged; make MCPRush discovery free. Revisit call prices only after route-level challenge-to-settlement conversion is instrumented. No measured post-change conversion denominator currently supports a price cut or hike.

## Suggested title

Carry Intel — Hyperliquid Funding and Hedgeability Screen

## Short description

Funding rates are public; hedgeability is the work. Carry Intel labels Hyperliquid's default funding floor as baseline, filters for a real liquid spot hedge, and publishes settled prints including negative hours. Read-only market data. No trade execution or open deposit program.

## Price field and tool prices

- MCPRush marketplace billing: **Free** (directory/discovery only)
- `carry_verdicts`: **$0.10** per call via direct x402
- `carry_opportunities`: **$0.50** per call via direct x402
- `carry_digest`: **$0.02** per call via direct x402
- `carry_free_sample`: **Free**, prior-day digest

Before publishing, align the three paid-tool descriptions with the live 402 prices, remove "live position tracking," and reconcile the API `/pricing` and `/fund` copy. MCPRush Studio is currently blocked by its Cloudflare security-verification page, so this draft is not live.

## Listing copy

Carry Intel is a read-only Hyperliquid funding screen for agents. It separates baseline funding from above-floor signals, checks for a mapped spot market and a minimum 24-hour pair-volume threshold, and exposes settled hourly prints—including negative hours. Raw exchange data is public; the paid layer is the classification and hedgeability filter, not a promise of returns.

Start with the free prior-day digest. **The headline funding rate is not the trade.** Paid calls add a screen for false hedges and expose the negative hours; buyers authorize each paid call. The API does not submit trades, custody user funds, or currently accept vault deposits.

## Campaign hooks

- **Don't pay for fake carry.** Verify the hedge before you underwrite the yield.
- **We publish the negative hours too.** Audit the settled prints, not just the annualized headline.
- **One free digest. Pay only when you query.** No seat fee; route prices are explicit.

## Trust and activation checklist

- The page shows no reviews, no published security grade, and "No parameter schema on file."[10] A live `tools/list` probe returns empty-object `inputSchema` values for all four no-argument tools; publish those existing declarations in the listing rather than inventing parameters.[11]
- Publish a v1.0.2 release note with the price alignment and claim correction. Do not imply a security audit: the listing identifies the server as remote and unscanned.[10]
- Ask independent users for real reviews after they test the free digest. Never seed or fabricate reviews.

## Sources

[1] https://mcprush.com/for-publishers
[2] https://www.coinglass.com/pricing
[3] https://2s.io/crypto/hyperliquid-funding
[4] https://devbox.tail873466.ts.net:10000/pricing
[5] https://devbox.tail873466.ts.net:10000/verify
[10] https://mcprush.com/thearkoftech/carry-intel-hyperliquid-funding-carry-intelli-mcp
[11] https://devbox.tail873466.ts.net:10000/mcp
