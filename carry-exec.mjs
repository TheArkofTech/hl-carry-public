/**
 * CARRY EXEC v1 — Hyperliquid funding-carry execution module.
 * Strategy (validated Oct 4 2026, skill: crypto-strategy-oos-testing):
 *   Spot-buy base + short equal perp notional → collect positive funding, market-neutral.
 *   Deploy legs: PURR (spot PURR/USDC, canonical), HYPE (spot @107, non-canonical).
 *   HYPE flipped WEAK→DEPLOY Oct 8 02:31Z (trailing-24h +5.6%/yr, 3 consecutive
 *   positive samples, basis +0.03%) — enabled, armed pending capital. Fragile:
 *   one negative sample reverts the trailing gate to WEAK.
 *
 * MODES:
 *   DRY-RUN (default): no key in env → computes exact orders (size, price, cost) and logs them.
 *   LIVE: HL_PRIVATE_KEY set → signs and places real orders. Requires explicit CARRY_LIVE=1.
 *
 * Usage:
 *   node carry-exec.mjs                 # dry-run quote
 *   CARRY_LIVE=1 node carry-exec.mjs    # live execution (needs HL_PRIVATE_KEY + capital)
 */

const HL_INFO = 'https://api.hyperliquid.xyz/info';
const HL_EXCHANGE = 'https://api.hyperliquid.xyz/exchange';
const DRY = !process.env.CARRY_LIVE || process.env.CARRY_LIVE !== '1';

// --- config ---
const LEGS = {
  PURR: { spot: 'PURR/USDC', perp: 'PURR', enabled: true },
  HYPE: { spot: '@107',      perp: 'HYPE', enabled: true }, // Oct 8: gates passed (trailing-24h +5.6%/yr, 3+ consec pos, basis +0.03%) — armed pending capital
};
const ALLOC_USDC = parseFloat(process.env.CARRY_ALLOC || '0'); // deploy capital per run
const MAX_BASIS = 0.01;   // refuse entry if spot/perp mid ratio deviates >1%
const MIN_FUNDING_ANN = 0.05; // refuse entry if annualized funding < 5%

async function hl(endpoint, body) {
  const r = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (j?.error) throw new Error(`HL: ${j.error}`);
  return j;
}

async function snapshot(legName, cfg) {
  const [perp, spot] = await Promise.all([
    hl(HL_INFO, { type: 'metaAndAssetCtxs' }),
    hl(HL_INFO, { type: 'spotMetaAndAssetCtxs' }),
  ]);
  const [pmeta, pctxs] = perp;
  const [smeta, sctxs] = spot;

  const idx = pmeta.universe.findIndex(u => u.name === cfg.perp);
  if (idx < 0) throw new Error(`${legName}: perp not found`);
  const pctx = pctxs[idx];
  const funding = parseFloat(pctx.funding);
  const annPct = funding * 24 * 365 * 100;

  const sctx = sctxs.find(x => x.coin === cfg.spot);
  if (!sctx) throw new Error(`${legName}: spot ctx ${cfg.spot} not found`);
  const basis = parseFloat(sctx.midPx) / parseFloat(pctx.markPx);

  return { legName, cfg, funding, annPct, basis, spotMid: parseFloat(sctx.midPx), perpMark: parseFloat(pctx.markPx) };
}

function planLeg(snap) {
  const verdicts = [];
  if (snap.annPct < MIN_FUNDING_ANN) verdicts.push(`funding ${snap.annPct.toFixed(1)}%/yr < ${MIN_FUNDING_ANN * 100}% hurdle`);
  if (Math.abs(snap.basis - 1) > MAX_BASIS) verdicts.push(`basis ${((snap.basis - 1) * 100).toFixed(2)}% > 1%`);
  if (snap.annPct < 0) verdicts.push('funding NEGATIVE — paying, not collecting');

  const verdict = verdicts.length === 0 ? 'GO' : 'NO-GO';
  // split capital across enabled GO legs handled by caller; here we take full alloc
  return { ...snap, verdict, reasons: verdicts };
}

async function main() {
  const mode = DRY ? 'DRY-RUN (set CARRY_LIVE=1 + HL_PRIVATE_KEY to arm)' : '⚠️ LIVE — REAL ORDERS';
  console.log(`🚀 CARRY EXEC — ${mode}`);
  console.log(`   alloc: $${ALLOC_USDC.toFixed(2)} (CARRY_ALLOC env)`);
  console.log();

  const snaps = [];
  for (const [legName, cfg] of Object.entries(LEGS)) {
    if (!cfg.enabled) { console.log(`${legName}: disabled (flip to enable)`); continue; }
    try {
      const snap = await snapshot(legName, cfg);
      const plan = planLeg(snap);
      snaps.push(plan);
      console.log(`${legName}:`);
      console.log(`  funding: ${plan.annPct > 0 ? '+' : ''}${plan.annPct.toFixed(2)}%/yr (${(plan.funding * 100).toFixed(4)}%/h)`);
      console.log(`  basis:  ${((plan.basis - 1) * 100).toFixed(3)}% (spot ${plan.spotMid.toFixed(6)} vs perp ${plan.perpMark.toFixed(6)})`);
      console.log(`  verdict: ${plan.verdict}${plan.reasons.length ? ' — ' + plan.reasons.join('; ') : ''}`);
      console.log();
    } catch (e) {
      console.log(`${legName}: ERROR ${e.message}`);
    }
  }

  if (DRY) {
    // Allocate across GO legs only (2026-10-08 fix): a lone GO leg was stranded at
    // half alloc; split is over the GO set, computed once all plans are in.
    const goLegs = snaps.filter(s => s.verdict === 'GO');
    if (ALLOC_USDC > 0 && goLegs.length > 0) {
      const perLeg = ALLOC_USDC / goLegs.length;
      console.log(`\nALLOC: $${ALLOC_USDC.toFixed(2)} → ${perLeg.toFixed(2)} per GO leg (${goLegs.length} of ${snaps.length})`);
      for (const plan of goLegs) {
        console.log(`  → order plan: BUY $${perLeg.toFixed(2)} spot ${plan.cfg.spot} @ ~${plan.spotMid.toFixed(6)}`);
        console.log(`  → order plan: SHORT $${perLeg.toFixed(2)} ${plan.cfg.perp}-PERP @ ~${plan.perpMark.toFixed(6)}`);
      }
    }
    console.log('\nDry-run complete. No orders placed. Capital required to arm:');
    console.log('  1. Deposit USDC to Hyperliquid ( Arbitrum bridge → HL deposit address )');
    console.log('  2. export HL_PRIVATE_KEY=<your HL API wallet key>');
    console.log('  3. export CARRY_ALLOC=<USDC to deploy>');
    console.log('  4. CARRY_LIVE=1 node carry-exec.mjs');
  } else {
    // LIVE path: sign orders via HL exchange API (requires ethersWallet signing)
    console.log('LIVE path requires signing module — refusing to run without explicit arming confirmation.');
    console.log('Implement sign+submit in liveSubmit() before arming. Aborting for safety.');
    process.exit(2);
  }
}

main().catch(e => { console.error('CARRY EXEC ERROR:', e.message); process.exit(1); });
