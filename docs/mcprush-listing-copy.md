# MCPRush listing — current published state

**Marketplace economics:** the published MCPRush listing is **Free ($0)**. Calls go directly to the publisher-hosted endpoint; MCPRush is not in the call path.[10]

The publisher fee is 12% of net marketplace sales; payment-processing fees are separate.[1]

No MCPRush markup is needed on direct x402 calls.[1][10]

**Listing update status 2026-10-15:** the short description and route prices are current. The public “What it does” field is malformed: the new description was appended inside the old description, so stale `/verify` and `/pricing` warnings remain. Do not call the listing synchronized until that field is replaced cleanly and read back.[10]

The live API reports those route prices. At `2026-10-15T13:00:29.949Z`, `/verify` said no open Hyperliquid perp positions were returned and reported zero positions; `/pricing` exposed only API tiers plus paused capital intake, and `/fund` was status-only.[4][5]

The live `/mcp` `tools/list` now describes verdicts as read-only and says positions, trades, and returns are not verified.[11] The API correction was deployed and recorded in TheArkofTech/x402-carry-api PR #3, merged as `16f8301`. Independent read-back at `2026-10-15T13:28Z` confirmed the corrected API and marketplace tool description; the marketplace's main description remains a separate, stale surface.[10]

## Price architecture and market anchor

The live API ladder is 2¢ for the latest digest, 10¢ for verdicts, and 50¢ for the full opportunities scan.[4] 2s lists raw Hyperliquid funding data at $0.0036 per call.[3] CoinGlass Hobbyist is $29/month with 80+ data endpoints and a 30-request/minute limit.[2] These are not apples-to-apples: our premium must be earned by screening, hedgeability metadata, and visible negative settled prints—not by reselling a public rate. Relative to 2s's raw call, the price ladder is about 6× / 28× / 139×, so the full scan needs a crisp, defensible value proposition.[2][3][4]

**Pricing decision:** keep the direct x402 ladder unchanged; make MCPRush discovery free. Revisit call prices only after route-level challenge-to-settlement conversion is instrumented. No measured post-change conversion denominator currently supports a price cut or hike.

## Current title

Carry Intel — Hyperliquid funding-carry intelligence (unchanged)

## Published copy (MCPRush)

**Short description:** Read-only Hyperliquid screens. Free MCPRush listing; x402/Solana USDC calls: verdicts $0.10, scan $0.50, digest $0.02; prior-day sample free. Not proof of positions or returns.

**Target “What it does” copy (not yet cleanly published):** Hyperliquid funding-carry intel, per-call via x402 (USDC/Solana). Free sample tool included. Call pricing applies to the publisher endpoint, not MCPRush: carry_verdicts $0.10/call, carry_opportunities $0.50/call, carry_digest $0.02/call; carry_free_sample returns yesterday's settled digest free. Read-only funding screens; operator positions, trades, and returns are not verified. No investor deposits or managed-fund offer; capital intake is paused.

**Published MCPRush `carry_verdicts` override (read back 2026-10-15T13:28Z):** Read-only Hyperliquid funding verdicts; operator positions, trades, and returns are unverified. Basis and 24h sample context. Costs $0.10/call via x402. The obsolete `/verify` contradiction clause is no longer in the tool description.[10]

## Price field and tool prices

- MCPRush marketplace billing: **Free** (directory/discovery only)
- `carry_verdicts`: **$0.10** per call via direct x402
- `carry_opportunities`: **$0.50** per call via direct x402
- `carry_digest`: **$0.02** per call via direct x402
- `carry_free_sample`: **Free**, prior-day digest

Listing-copy and manual tool-surface edits do not require a release; the listing remains v1.0.1. They do not change direct `/mcp` metadata or `/pricing`. The backend correction is live and merged, and the marketplace tool override is corrected. The main marketplace description still requires a clean replacement and public read-back.

## Listing copy

The public marketplace description currently contains duplicated copy and retains stale warnings about `/verify` and `/pricing`. The short description, price fields, and tool override are current. Replace the main description cleanly, then read it back before treating distribution as synchronized. Do not mistake a corrected tool override for a corrected rich-text description.

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
