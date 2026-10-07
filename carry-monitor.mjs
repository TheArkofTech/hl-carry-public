/**
 * CARRY MONITOR v2 — watchdog for the validated HL funding-carry edge.
 * Deploy legs (real spot hedges, verified Oct 4 2026):
 *   PURR — spot PURR/USDC ($1.6M/day, canonical, ctx keyed by NAME)
 *   HYPE — spot @107 ($32M/day, non-canonical, ctx keyed by @idx)
 * Rejected hedges (verified fake): PUMP @20 (mid = 1.4% of perp mark — different coin), MON @129 ($0/day, mid = 11% of perp).
 * Watchdog pattern: state logs EVERY run; stdout prints ONLY actionable events
 * (funding spike >=5bps/h, negative funding on deploy leg, |basis| > 1%).
 * Empty stdout = silent = nothing to do. Cron delivers stdout (alerts) to Telegram.
 */
import fs from 'fs';

const STATE_FILE = 'C:/HermesVault/.hermes/scripts/carry-state.json';
const HL = 'https://api.hyperliquid.xyz/info';
const SPIKE = 0.0005; // 5bps/h ~= 43.8%/yr pace

const LEGS = {
  PURR: { spot: 'PURR/USDC', deploy: true,  hist180: 26.9 },
  HYPE: { spot: '@107',      deploy: true,  hist180: 9.5  },
  PUMP: { spot: null,        deploy: false, hist180: 11.3, note: 'fake hedge @20 — perp signal only' },
  MON:  { spot: null,        deploy: false, hist180: 6.4,  note: 'spot dead $0/day' },
};

async function hl(type, extra = {}) {
  const r = await fetch(HL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, ...extra }) });
  if (!r.ok) throw new Error(`HL ${type} HTTP ${r.status}`);
  const j = await r.json();
  if (j?.error) throw new Error(`HL ${type}: ${j.error}`);
  return j;
}

async function main() {
  const t = Date.now();
  let state = { legs: {} };
  if (fs.existsSync(STATE_FILE)) { try { state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { state = { legs: {} }; } }
  if (!state.legs) state.legs = {};
  const alerts = [];
  if (process.env.CARRY_TEST_ALERT) alerts.push('🧪 TEST — alert pipeline verification, no action needed.');

  const [perp, spot] = await Promise.all([hl('metaAndAssetCtxs'), hl('spotMetaAndAssetCtxs')]);
  const [pmeta, pctxs] = perp;
  const [smeta, sctxs] = spot;

  for (const [coin, cfg] of Object.entries(LEGS)) {
    if (!state.legs[coin]) state.legs[coin] = { samples: 0, sumFunding: 0, lastSpike: null, hist: [] };
    const st = state.legs[coin];
    const idx = pmeta.universe.findIndex(u => u.name === coin);
    if (idx < 0) { alerts.push(`${coin}: dropped from perp universe`); continue; }
    const c = pctxs[idx];
    const funding = parseFloat(c.funding);
    const annPct = funding * 24 * 365 * 100;
    st.samples += 1;
    st.sumFunding += funding;
    st.lastAnnPct = +annPct.toFixed(1);
    st.hist.push({ t, r: funding });
    if (st.hist.length > 3000) st.hist = st.hist.slice(-3000);
    if (funding >= SPIKE) st.lastSpike = t;

    // hedge basis check for deploy legs
    if (cfg.deploy && cfg.spot) {
      const sc = sctxs.find(x => x.coin === cfg.spot);
      if (sc && sc.midPx) {
        const basis = parseFloat(sc.midPx) / parseFloat(c.markPx);
        st.lastBasis = +basis.toFixed(4);
        if (Math.abs(basis - 1) > 0.01) alerts.push(`⚠️ ${coin} basis ${(basis - 1) > 0 ? '+' : ''}${((basis - 1) * 100).toFixed(2)}% (spot ${cfg.spot} vs perp) — hedge slippage risk`);
      } else {
        alerts.push(`⚠️ ${coin} spot ctx ${cfg.spot} missing — hedge pair may be delisted`);
      }
    }

    if (funding >= SPIKE) alerts.push(`⚡ ${coin} FUNDING SPIKE ${(funding * 100).toFixed(3)}%/h = ${annPct.toFixed(0)}%/yr pace — carry entry window (${cfg.deploy ? 'DEPLOY LEG' : 'watch'})`);
    if (cfg.deploy && funding < 0) alerts.push(`❄️ DEPLOY LEG ${coin} funding NEGATIVE ${(funding * 100).toFixed(4)}%/h — unwind candidate`);
  }

  state.lastRun = new Date(t).toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state));

  if (alerts.length) {
    console.log(`📊 CARRY WATCHDOG ${state.lastRun.slice(0, 16)}Z`);
    for (const a of alerts) console.log(a);
  }
  // else: silent — nothing actionable
}

main().catch(e => { console.error('CARRY MONITOR ERROR:', e.message); process.exit(1); });
