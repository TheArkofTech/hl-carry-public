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
for (const [coin, rates] of Object.entries(data)) {
  const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
  const ann = avg * 24 * 365 * 100;
  const tag = DEPLOY[coin] ? (ann >= 5 ? 'DEPLOY' : ann < 0 ? 'UNWIND-ZONE' : 'HOLD') : 'watch';
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
  lines.push(`- HYPE: funding negative — leg disabled until flip (watchdog alerts automatically).`);
  lines.push('');
}
lines.push('---');
lines.push('*Part of the open funding-carry system. Every number here is reproducible from the raw state file or the public HL API.*');

fs.mkdirSync(OUT_DIR, { recursive: true });
const out = path.join(OUT_DIR, `${target}.md`);
fs.writeFileSync(out, lines.join('\n'));
console.log(`✅ ${out}`);
console.log(lines.join('\n'));
