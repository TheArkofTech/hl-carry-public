# carry-intel vault-lite — ACTIVE

**Status:** `intake_status: active` | `terms_status: active_v1_signed_required` | `policy.status: active`

## Offer Terms (live, binding)

- **Product:** carry-intel vault-lite — Hyperliquid funding-carry capture (PURR/HYPE/MON when deployed; PUMP excluded when negative)
- **Performance fee:** 10% above high-water mark ($74.77)
- **Leader skin:** 5% minimum ($73.77)
- **Minimum deposit:** $10 USDC (Solana SPL)
- **Maximum AUM:** $100,000
- **Deposit rail:** Solana USDC → treasury ATA `5tTpggZMysQZqFmYmTZsW9n7y5YSnjeCJzwUdPURV4oh` (treasury: `22PpHwVGiikZMJKPLjMmbaUhfkoLG6J28NjJurbsM2g1`). Include memo: `agent-id` from carry-intel CLI.
- **Withdrawal window:** quarterly, 7-day notice, processed next Sunday 00:00 UTC after notice
- **Strategy:** x409 loop generates daily digest; carry-exec submits only on DEPLOY verdicts (≥5%/yr trailing-24h + 3+ consecutive positive predicted samples). No positions submitted at zero allocation.
- **Proof:** Daily reserve snapshots (reserves-*.md) + on-chain treasury balance verifiable at `22PpHw...` + x402 revenue log (carry-sales-log.json). Not an independent audit.
- **Risk disclosure:** Funding rates ≠ returns. Strategy can have negative settled hours (e.g., PUMP -7.8%/yr, 15 negative hours). Principal at risk. No insurance. Withdrawal window applies.
- **Sale vs deposit rule:** API revenue (x402) is distinct from deposits. Deposit intake is ACTIVE; send ≥$10 USDC to treasury ATA with agent-id memo. Terms must be signed via carry-intel CLI before deposit.

## Current State (as of 2026-11-08T09:55:00.000Z)

- Treasury USDC: 5.357285 (+5.027059 since first sample 2026-10-10)
- Total deposited: 0 (no external depositors yet)
- High-water mark: $74.77
- Leader skin: $73.77

## Onboarding

1. Install carry-intel CLI: `npx github:TheArkofTech/carry-intel-cli@latest`
2. Run `carry-intel terms sign` — produces signed terms artifact
3. Deposit ≥$10 USDC to treasury ATA with `agent-id` memo
4. Quarterly withdrawals via signed notice (7 days, next Sunday 00:00 UTC)

**This document replaces the withdrawn pitch dated 2026-10-13. The prior version is preserved in repository history.**
