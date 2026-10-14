# Vault status — paused; this document is withdrawn

The former `carry-intel vault-lite` pitch is not a verified current offer. The dated repository ledger marks intake paused, but the live API `/pricing` still advertises legacy fund deposits. Treat that conflict as unresolved. **Do not send funds** to any address shown in this repository's older Git history, reports, or external listings.

The checked-in `aum-ledger.json` is dated `2026-10-13T22:57:21.137Z` and records `intake_status: paused`, zero recorded deposits, and no depositors. At `2026-10-14T02:19:27.767Z`, `/verify` returned an empty `live_now.perp_positions` list while still claiming live operation. `carry-exec.mjs` does not submit orders.

The prior performance-fee, minimum-deposit, skin, and withdrawal terms are legacy proposal values, not active terms. The old balance reports are account snapshots—not proof of reserves, client AUM, or realized strategy returns. The live API `/pricing` and `/fund` copy still contains stale fund language; it must be corrected before any relaunch or marketing of a fund product.

This file is retained to make the withdrawal visible in repository history. It is not an investment offer or an invitation to transfer assets.
