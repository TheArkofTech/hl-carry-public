# MCPRush listing — current published state

**Marketplace economics:** the published MCPRush listing is **Free ($0)**. Calls go directly to the publisher-hosted endpoint; MCPRush is not in the call path.[10]

The publisher fee is 12% of net marketplace sales; payment-processing fees are separate.[1]

No MCPRush markup is needed on direct x402 calls.[1][10]

**Listing copy updated 2026-10-15:** the public page now distinguishes the free MCPRush listing from paid x402 calls and shows the current route ladder: $0.10 verdicts, $0.50 opportunities, $0.02 digest, plus a free prior-day sample.[10]

The live API reports those route prices. At `2026-10-15T02:26:32.506Z`, `/verify` still asserted a live carry position while returning an empty `perp_positions` list.[4][5]

The live `/mcp` `tools/list` still repeats the position-tracking claim, and `/pricing` still contains legacy fund/deposit language.[4][11] MCPRush's manual tool-list override corrects the marketplace listing only; no backend deployment or route change was made.

## Price architecture and market anchor

The live API ladder is 2¢ for the latest digest, 10¢ for verdicts, and 50¢ for the full opportunities scan.[4] 2s lists raw Hyperliquid funding data at $0.0036 per call.[3] CoinGlass Hobbyist is $29/month with 80+ data endpoints and a 30-request/minute limit.[2] These are not apples-to-apples: our premium must be earned by screening, hedgeability metadata, and visible negative settled prints—not by reselling a public rate. Relative to 2s's raw call, the price ladder is about 6× / 28× / 139×, so the full scan needs a crisp, defensible value proposition.[2][3][4]

**Pricing decision:** keep the direct x402 ladder unchanged; make MCPRush discovery free. Revisit call prices only after route-level challenge-to-settlement conversion is instrumented. No measured post-change conversion denominator currently supports a price cut or hike.

## Current title

Carry Intel — Hyperliquid funding-carry intelligence (unchanged)

## Published copy (MCPRush)

**Short description:** Read-only Hyperliquid screens. Free MCPRush listing; x402/Solana USDC calls: verdicts $0.10, scan $0.50, digest $0.02; prior-day sample free. Not proof of positions or returns.

**What it does:** Hyperliquid funding-carry intel, per-call via x402 (USDC/Solana). Free sample tool included. Call pricing applies to the publisher endpoint, not MCPRush: carry_verdicts $0.10/call, carry_opportunities $0.50/call, carry_digest $0.02/call via x402 in USDC/Solana; carry_free_sample returns yesterday's digest free. The MCPRush listing is free. Current /verify claims a live position but reports empty perp_positions; this listing does not verify positions, trades, or returns. /pricing still includes legacy fund/deposit terms; this listing makes no deposit or managed-fund offer.

**Published `carry_verdicts` tool description:** Read-only Hyperliquid funding verdicts for tracked markets; /verify currently contradicts its live-position claim, so positions, trades, and returns are not verified. Costs $0.10/call via x402.

## Price field and tool prices

- MCPRush marketplace billing: **Free** (directory/discovery only)
- `carry_verdicts`: **$0.10** per call via direct x402
- `carry_opportunities`: **$0.50** per call via direct x402
- `carry_digest`: **$0.02** per call via direct x402
- `carry_free_sample`: **Free**, prior-day digest

The listing-copy and marketplace tool-surface updates are live without a release. The listing remains v1.0.1; no v1.0.2 release was created. These marketplace edits do not change direct `/mcp` metadata or `/pricing`. Keep the backend correction blocked until the shared no-deploy/lock constraint is explicitly released; then fix and verify those live routes.

## Listing copy

The current marketplace copy discloses the live x402 route prices, the free prior-day sample, the `/verify` contradiction, and the legacy fund/deposit text still present at `/pricing`. It makes no live-position, trade, return, deposit, or managed-fund claim.

## Campaign hooks

- **Don't pay for fake carry.** Verify the hedge before you underwrite the yield.
- **We publish the negative hours too.** Audit the settled prints, not just the annualized headline.
- **One free digest. Pay only when you query.** No seat fee; route prices are explicit.

## Trust and activation checklist

- The page still shows no reviews and no security scan. A live `tools/list` probe returns empty-object `inputSchema` values for all four no-argument tools; do not invent parameters.[10][11]
- No release was created; the listing still reports v1.0.1. Do not imply a security audit: the listing identifies the server as remote and unscanned.[10]
- Ask independent users for real reviews after they test the free digest. Never seed or fabricate reviews.

## Sources

[1] https://mcprush.com/for-publishers
[2] https://www.coinglass.com/pricing
[3] https://2s.io/crypto/hyperliquid-funding
[4] https://devbox.tail873466.ts.net:10000/pricing
[5] https://devbox.tail873466.ts.net:10000/verify
[10] https://mcprush.com/thearkoftech/carry-intel-hyperliquid-funding-carry-intelli-mcp
[11] https://devbox.tail873466.ts.net:10000/mcp
