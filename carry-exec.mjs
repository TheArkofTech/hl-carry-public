/**
 * CARRY EXEC v1 — read-only funding-carry dry-run planner.
 * The live order-submission implementation is absent and intentionally disabled.
 * Candidate legs below are screening inputs, not evidence of open positions.
 *
 * MODE:
 *   DRY-RUN: reads public market data and prints a plan; places no orders.
 *   CARRY_LIVE=1: deliberately aborts with exit code 2; no live signer exists.
 *
 * Usage:
 *   node carry-exec.mjs                 # read-only dry-run quote
 */

const HL_INFO = 'https://api.hyperliquid.xyz/info';
const HL_EXCHANGE = 'https://api.hyperliquid.xyz/exchange';
const DRY = !process.env.CARRY_LIVE || process.env.CARRY_LIVE !== '1';

// --- config ---
const LEGS = {
  PURR: { spot: 'PURR/USDC', perp: 'PURR', enabled: true },
  HYPE: { spot: '@107',      perp: 'HYPE', enabled: true }, // market mapping for screening; not an open position
};
const ALLOC_USDC = parseFloat(process.env.CARRY_ALLOC || '0'); // hypothetical sizing only; never transmitted
const MAX_BASIS = 0.01;   // screen out spot/perp mid ratios that differ by >1%
const MIN_FUNDING_ANN = 5; // annualized percentage points; screen threshold, not an order gate

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
  if (snap.annPct < MIN_FUNDING_ANN) verdicts.push(`funding ${snap.annPct.toFixed(1)}%/yr < ${MIN_FUNDING_ANN}% screen threshold`);
  if (Math.abs(snap.basis - 1) > MAX_BASIS) verdicts.push(`basis ${((snap.basis - 1) * 100).toFixed(2)}% exceeds 1% screen threshold`);
  if (snap.annPct < 0) verdicts.push('funding is negative');

  const verdict = verdicts.length === 0 ? 'SCREEN-PASS' : 'SCREEN-FAIL';
  // A passing screen is data only; this module does not create or submit orders.
  return { ...snap, verdict, reasons: verdicts };
}

async function main() {
  const mode = DRY ? 'DRY-RUN — NO ORDERS' : 'LIVE REQUEST — SUBMISSION DISABLED';
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
    // Optional sizing math is a hypothetical illustration; it never creates orders.
    const screenPassLegs = snaps.filter(s => s.verdict === 'SCREEN-PASS');
    if (ALLOC_USDC > 0 && screenPassLegs.length > 0) {
      const perLeg = ALLOC_USDC / screenPassLegs.length;
      console.log(`\nHypothetical sizing only: $${ALLOC_USDC.toFixed(2)} → $${perLeg.toFixed(2)} per passing screen (${screenPassLegs.length} of ${snaps.length})`);
      for (const plan of screenPassLegs) {
        console.log(`  → hypothetical pair: spot ${plan.cfg.spot} + short ${plan.cfg.perp}-PERP; no orders will be sent`);
      }
    }
    console.log('\nDry-run complete. No orders placed. Live order submission is not implemented.');
  } else {
    // Fail closed: no signer or order-submission implementation is present.
    console.log('Live order submission is disabled; no orders were sent.');
    process.exit(2);
  }
}

main().catch(e => { console.error('CARRY EXEC ERROR:', e.message); process.exit(1); });
