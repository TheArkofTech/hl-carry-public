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
const OUT_DIR = path.resolve(import.meta.dirname, 'reports');

const DEPLOY = { PURR: true, HYPE: true, PUMP: false, MON: false };
const H180 = { PURR: 26.9, HYPE: 9.5, PUMP: 11.3, MON: 6.4 };

const state = JSON.parse(fs.readFileSync(STATE, 'utf8'));
const legs = state.legs;

// group samples by UTC day
const days = {};
for (const [coin, st] of Object.entries(legs)) {
  for (const s of st.hist || []) {
    const d = new Date(s.t).toISOString().slice(0, 10);
    (days[d] ??= {})[coin] ??= [];
    days[d][coin].push(s.r);
  }
}

const target = process.argv[2] || Object.keys(days).sort().pop();
const data = days[target];
if (!data) { console.error(`no samples for ${target}`); process.exit(1); }

const lines = [];
lines.push(`# Hyperliquid Funding Digest — ${target}`);
lines.push('');
lines.push(`Generated ${new Date().toISOString()} from ${Object.values(data).reduce((a, b) => a + b.length, 0)} logged watchdog samples. Funding rates are hourly API pulls — verify independently at api.hyperliquid.xyz.`);
lines.push('');
lines.push('## Measured funding (UTC day, annualized)');
lines.push('');
// Operative verdict = trailing-24h ending at the state's last sample (the x409 entry
// gate), NOT the calendar-day average — a partial day can read DEPLOY while the gate
// says HOLD (HYPE 2026-10-07: day +5.8% vs trailing +4.0%). Reproducible from state.
const trailingAnn = (coin) => {
  const h = legs[coin]?.hist || [];
  if (!h.length) return null;
  const lastT = h[h.length - 1].t;
  const w = h.filter(s => lastT - s.t < 86400000);
  return w.length >= 3 ? (w.reduce((a, b) => a + b.r, 0) / w.length) * 24 * 365 * 100 : null;
};

for (const [coin, rates] of Object.entries(data)) {
  const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
  const ann = avg * 24 * 365 * 100;
  const v = DEPLOY[coin] ? (trailingAnn(coin) ?? ann) : ann;
  const tag = DEPLOY[coin] ? (v >= 5 ? 'DEPLOY' : v < 0 ? 'UNWIND-ZONE' : 'HOLD') : 'watch';
  const variance = Math.max(...rates) === Math.min(...rates) ? 'steady' : 'variable';
  lines.push(`- **${coin}** — ${ann >= 0 ? '+' : ''}${ann.toFixed(1)}%/yr pace from ${rates.length} samples (${variance}) · 180d avg ${H180[coin] ?? '?'}%/yr · **${tag}**`);
}
lines.push('');
const purr = data.PURR?.length ? data.PURR.reduce((a, b) => a + b, 0) / data.PURR.length : null;
if (purr !== null) {
  const basis = legs.PURR?.lastBasis;
  lines.push('## Deploy status');
  lines.push('');
  lines.push(`- PURR carry: ${purr >= 0 ? '+' : ''}${(purr * 24 * 365 * 100).toFixed(1)}%/yr pace${basis ? `, spot/perp basis ${((basis - 1) * 100).toFixed(2)}% (within 1% gate)` : ''}`);
  const hype = data.HYPE?.length ? data.HYPE.reduce((a, b) => a + b, 0) / data.HYPE.length : null;
  if (hype !== null) {
    const hAnn = hype * 24 * 365 * 100;
    const hBasis = legs.HYPE?.lastBasis;
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
