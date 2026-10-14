/**
 * Settled-only daily funding observations, not strategy P&L.
 * Usage: node funding-digest.mjs [YYYY-MM-DD] (default: yesterday UTC).
 * CARRY_REPORTS_DIR overrides output for isolated verification runs.
 * No private state, wallet, payment, signer, or trading route is accessed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { summarizeFundingHistory, utcDayBounds } from './scripts/verify-settled-prints.mjs';

const HL = 'https://api.hyperliquid.xyz/info';
const OUT_DIR = process.env.CARRY_REPORTS_DIR || path.resolve(import.meta.dirname, 'reports');
const COINS = ['PURR', 'HYPE', 'PUMP', 'MON'];
const target = process.argv[2] || new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
const { startTime, endTime } = utcDayBounds(target);

const settled = await Promise.all(COINS.map(async (coin) => {
  const response = await fetch(HL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'fundingHistory', coin, startTime, endTime }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Hyperliquid HTTP ${response.status} for ${coin} ${target}`);
  const rows = await response.json();
  const filtered = rows.filter(row => Number(row.time) >= startTime && Number(row.time) < endTime);
  const hours = new Set(filtered.map(row => Math.floor((Number(row.time) - startTime) / 3_600_000)));
  if (filtered.length !== 24 || hours.size !== 24) throw new Error(`incomplete settled day for ${coin} ${target}: ${filtered.length} prints / ${hours.size} hours`);
  return { coin, ...summarizeFundingHistory(filtered) };
}));

const lines = [
  `# Hyperliquid Funding Digest — ${target}`, '',
  `Generated ${new Date().toISOString()} from public Hyperliquid fundingHistory. Window: ${new Date(startTime).toISOString()} <= time < ${new Date(endTime).toISOString()}.`, '',
  '## Measured funding (UTC day, annualized)', '',
  '> HL default interest of 0.01% per 8h corresponds to **+10.95%/yr** when expressed as an annualized funding rate. Funding rates are not returns.', '',
  ...settled.map(s => `- **${s.coin} settled prints** — ${s.annualizedPct >= 0 ? '+' : ''}${s.annualizedPct.toFixed(1)}%/yr over ${s.prints} hourly prints${s.negativePrints ? ` ⚠️ ${s.negativePrints} NEGATIVE hour${s.negativePrints > 1 ? 's' : ''} (paid rate)` : ''}`), '',
  '---',
  `*Recheck settled-print figures with \`node scripts/verify-settled-prints.mjs ${target}\`. This report does not claim executed trades, open positions, or realized strategy P&L.*`,
];
fs.mkdirSync(OUT_DIR, { recursive: true });
const out = path.join(OUT_DIR, `${target}.md`);
fs.writeFileSync(out, lines.join('\n'));
console.log(`Generated ${out}`);
console.log(lines.join('\n'));
