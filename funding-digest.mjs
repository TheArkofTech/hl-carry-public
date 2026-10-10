/**
 * FUNDING DIGEST — turns carry-state.json (raw watchdog samples) into a shareable
 * daily markdown report. This is the track record: one file per day, timestamped,
 * generated only from actually-logged samples. No projections, no vibes.
 *
 * Usage: node funding-digest.mjs [YYYY-MM-DD]   (default: today, or last covered day)
 */
import fs from 'fs';
import path from 'path';

const STATE = 'C:/HermesVault/.hermes/scripts/carry-state.json';
const HL = 'https://api.hyperliquid.xyz/info';
const OUT_DIR = path.resolve(import.meta.dirname, 'reports');

const DEPLOY = { PURR: true, HYPE: true, PUMP: false, MON: false };
const H180 = { PURR: 26.9, HYPE: 9.5, PUMP: 11.3, MON: 6.4 };

const state = JSON.parse(fs.readFileSync(STATE, 'utf8'));
const legs = state.legs;

// group samples by UTC day (keep whole sample: rate + provenance)
const days = {};
for (const [coin, st] of Object.entries(legs)) {
  for (const s of st.hist || []) {
    const d = new Date(s.t).toISOString().slice(0, 10);
    (days[d] ??= {})[coin] ??= [];
    days[d][coin].push(s);
  }
}

// Publish the most recently COMPLETED UTC day (T+1): at rollover the new day
// has only 1-2 samples — a digest of it would be a junk fragment, and the
// completed day would never get its final numbers into the track record.
// Explicit argv (e.g. a partial-day snapshot) still wins.
// Backfill mode: explicit argv can name ANY historical day (e.g. after an
// outage recovery, digest day 2026-10-08 after the fact).
const today = new Date().toISOString().slice(0, 10);
const dayKeys = Object.keys(days).sort();
const priorDays = dayKeys.filter(d => d < today);
const target = process.argv[2] || (priorDays.length ? priorDays[priorDays.length - 1] : dayKeys[dayKeys.length - 1]);
const data = days[target];
if (!data) { console.error(`no samples for ${target}`); process.exit(1); }

// Anchor trailing-24h at the END of the target day (T+0 23:59Z), not the live
// tail: after backfill, a historical digest's verdict must reflect funding at
// that day's close — never today's rates smeared over the past.
const dayEnd = Date.parse(target + 'T23:59:59.999Z');
const trailingAnn = (coin) => {
  const h = (legs[coin]?.hist || []).filter(s => s.t <= dayEnd);
  if (!h.length) return null;
  const lastT = h[h.length - 1].t;
  const w = h.filter(s => lastT - s.t < 86400000);
  return w.length >= 3 ? (w.reduce((a, b) => a + b.r, 0) / w.length) * 24 * 365 * 100 : null;
};

const lines = [];
lines.push(`# Hyperliquid Funding Digest — ${target}`);
lines.push('');
lines.push(`Generated ${new Date().toISOString()} from ${Object.values(data).reduce((a, b) => a + b.length, 0)} logged watchdog samples. Funding rates are hourly API pulls — verify independently at api.hyperliquid.xyz.`);
lines.push('');
lines.push('## Measured funding (UTC day, annualized)');
lines.push('');

// Settled-prints cross-check: the watchdog samples PREDICTED funding at random
// minute-of-hour; positions PAY the settled hourly print. One negative settled
// hour can sit inside a "steady" sampled day (PURR 2026-10-08: settled 00:00Z
// -3.8e-5 vs sampled day +10.6%/yr) — publish both so the track record never
// overstates carry income.
const ds = Date.parse(target + 'T00:00:00Z');
const de = ds + 86400000;
const settled = await Promise.all(Object.keys(data).map(async (coin) => {
  try {
    const r = await fetch(HL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'fundingHistory', coin, startTime: ds, endTime: de }) });
    const j = await r.json();
    if (!Array.isArray(j)) return [coin, null];
    const rates = j.map(x => parseFloat(x.fundingRate));
    return [coin, { n: rates.length, neg: rates.filter(x => x < 0).length, ann: (rates.reduce((a, b) => a + b, 0) / rates.length) * 24 * 365 * 100 }];
  } catch { return [coin, null]; }
}));
for (const [coin, si] of settled) {
  if (!si) continue;
  lines.push(`- **${coin} settled prints** — ${si.ann >= 0 ? '+' : ''}${si.ann.toFixed(1)}%/yr over ${si.n} hourly prints${si.neg ? ` ⚠️ ${si.neg} NEGATIVE hour${si.neg > 1 ? 's' : ''} (paid rate)` : ''}`);
}
lines.push('');

for (const [coin, samples] of Object.entries(data)) {
  const rates = samples.map(s => s.r);
  const nBackfilled = samples.filter(s => s.src === 'api').length;
  const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
  const ann = avg * 24 * 365 * 100;
  const v = DEPLOY[coin] ? (trailingAnn(coin) ?? ann) : ann;
  const tag = DEPLOY[coin] ? (v >= 5 ? 'DEPLOY' : v < 0 ? 'UNWIND-ZONE' : 'HOLD') : 'watch';
  const variance = Math.max(...rates) === Math.min(...rates) ? 'steady' : 'variable';
  const prov = nBackfilled ? ` (${nBackfilled} backfilled from HL API after watchdog outage)` : '';
  lines.push(`- **${coin}** — ${ann >= 0 ? '+' : ''}${ann.toFixed(1)}%/yr pace from ${rates.length} samples${prov} (${variance}) · 180d avg ${H180[coin] ?? '?'}%/yr · **${tag}**`);
}
lines.push('');
const purrRates = data.PURR?.map(s => s.r) ?? [];
const purr = purrRates.length ? purrRates.reduce((a, b) => a + b, 0) / purrRates.length : null;
// basis is a point-in-time snapshot of the LAST watchdog run — it is only
// truthful on a digest generated at the target day's rollover. On historical
// backfills it would silently show TODAY's basis as that day's. Suppress it.
const isHistorical = target < new Date(state.legs.PURR?.hist?.at(-1)?.t ?? 0).toISOString().slice(0, 10);
if (purr !== null) {
  const basis = isHistorical ? null : legs.PURR?.lastBasis;
  lines.push('## Deploy status');
  lines.push('');
  lines.push(`- PURR carry: ${purr >= 0 ? '+' : ''}${(purr * 24 * 365 * 100).toFixed(1)}%/yr pace${basis ? `, spot/perp basis ${((basis - 1) * 100).toFixed(2)}% (within 1% gate)` : ''}`);
  const hypeRates = data.HYPE?.map(s => s.r) ?? [];
  const hype = hypeRates.length ? hypeRates.reduce((a, b) => a + b, 0) / hypeRates.length : null;
  if (hype !== null) {
    const hAnn = hype * 24 * 365 * 100;
    const hBasis = isHistorical ? null : legs.HYPE?.lastBasis;
    const tAnn = trailingAnn('HYPE');
    const gate = tAnn === null ? 'insufficient trailing samples' : tAnn < 5 ? `trailing-24h ${tAnn >= 0 ? '+' : ''}${tAnn.toFixed(1)}%/yr below 5% hurdle — leg stays disabled` : `trailing-24h ${tAnn >= 0 ? '+' : ''}${tAnn.toFixed(1)}%/yr clears hurdle — size entry per carry-exec rules`;
    lines.push(`- HYPE: ${hAnn >= 0 ? '+' : ''}${hAnn.toFixed(1)}%/yr day pace from ${data.HYPE.length} samples${hBasis ? `, basis ${((hBasis - 1) * 100).toFixed(2)}%` : ''} — ${gate} (entry gate is trailing-24h, never a single sample).`);
  }
  lines.push('');
}
lines.push('---');
lines.push('*Part of the open funding-carry system. Every number here is reproducible from the raw state file or the public HL API.*');

fs.mkdirSync(OUT_DIR, { recursive: true });
const out = path.join(OUT_DIR, `${target}.md`);
fs.writeFileSync(out, lines.join('\n'));
console.log(`✅ ${out}`);
console.log(lines.join('\n'));
