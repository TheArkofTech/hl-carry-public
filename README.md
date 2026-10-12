# Hyperliquid Funding Carry — Verified, Market-Neutral

An open, third-party-verifiable funding-rate carry system on Hyperliquid.

**Strategy:** long spot + short equal perp notional on assets with persistently positive funding → collect the funding rate, delta-neutral to price moves.

**Why this is credible (and how to verify it without trusting us):**
- Every Hyperliquid account, position, and P&L is **public on-chain** via the HL API. We publish our account address; anyone can independently audit every fill, every funding payment, every basis entry/exit.
- Funding rates are pulled live from `api.hyperliquid.xyz` — same data the watchdog logs hourly in this repo.
- No performance claims without a timestamped, API-verifiable record.

## The edge (as measured, not projected)

| Leg | 180d funding history | Live measured pace (54h, 58 samples) | Spot hedge |
|-----|---------------------|--------------------------------------|-------------|
| PURR | +26.9%/yr avg | **+11.0%/yr** (min = max = 0.0013%/h, rock steady) | PURR/USDC canonical pair, $1.6M/day |
| HYPE | +9.5%/yr avg | −13%/yr (negative → leg disabled until flip) | @107, $32M/day |

Round-trip execution cost measured at **0.31%** (entry+exit, both legs). Payback at +11%/yr ≈ 2.8 weeks.

## What's in this repo

- `carry-exec.mjs` — execution module. Dry-run by default; prints exact order plans and GO/NO-GO verdicts. Live mode requires explicit arming (`CARRY_LIVE=1` + key) and is intentionally not signed until capital is at stake.
- `carry-monitor.mjs` — hourly watchdog. Logs every funding sample to `carry-state.json`; prints alerts ONLY on actionable events (funding spike, negative funding on a deploy leg, basis drift >1%). Silent = healthy.
- `funding-digest.mjs` — daily digest generator: turns raw state into a shareable daily funding report (see `reports/`). This is the product.
- `reports/` — the track record. One markdown file per day, timestamped, generated from logged samples. This is the product.
- `clawhub-skill/` — installable agent skill for buying this data per-call over x402.

## Buy the data (API, MCP, skill)

Live system, same data the watchdog logs — sold per call, no key, no account:

**Install, don't browse — the base URL ships inside each surface:**
- **MCP (official registry):** add the server `io.github.TheArkofTech/carry-intel` from the MCP registry — your client resolves the endpoint automatically. Free `tools/list` + free sample tool; data tools are x402-paid.
- **CLI:** `npx github:TheArkofTech/carry-intel-cli` — same product, wallet file, commands `verdicts / opportunities / digest / free`.
- **Agent skill:** `clawhub install carry-intel` — purchase instructions embedded for any OpenClaw-compatible agent.
- Pricing ladder, license, and a live `/verify` proof route (positions, treasury, track record re-derived from public APIs on request) are served by the API itself — reach them through any surface above.

## Honest risk statement

- Funding can flip negative on any leg; the watchdog alerts and the leg unwinds. Negative carry = exit, not hope.
- Basis between spot and perp can exceed 1% in stressed markets; execution gates refuse entry above that.
- PURR is a Hyperliquid-native memecoin. Funding has been remarkably stable (+0.0013%/h, zero variance across 58 samples), but the leg is sized so a total funding collapse costs only the round-trip (~0.31%), not principal. Principal risk is the venue, not the market.
- This is not financial advice. It is a transparent, auditable system — judge it from the data.

## Roadmap

1. **Now:** public repo, hourly watchdog data, daily digest reports.
2. **First capital:** deploy live at small scale ($100–$500). Every hour of live P&L is on-chain and verifiable — the track record begins.
3. **At ~$10k:** Hyperliquid Vault (10% performance fee, depositors can exit in 1 day, everything on-chain). Builder Vault variant if spot-in-vault is required for the pure carry.
4. **Scale:** the published track record + on-chain auditability is the only marketing a vault needs.
