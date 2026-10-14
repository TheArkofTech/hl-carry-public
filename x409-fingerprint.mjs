/**
 * x409-fingerprint — the SENSE stage of the x409 loop.
 *
 * Monitor-mode source script: runs before the agent every tick. Output MUST be
 * stable (no timestamps, no raw drift) — identical bytes suppress the agent run
 * entirely. The fingerprint fires the agent ONLY on state-class transitions:
 *   - a tracked screen's class changes (SCREEN-PASS / SCREEN-WATCH / NEGATIVE)
 *   - a leg's basis class changes (OK / DRIFT>1%)
 *   - a new UTC day rolls over (daily digest due)
 *   - the public repo has uncommitted changes
 * Funding values are deliberately bucketed; classes are market-data labels, not
 * trade instructions. A dirty tree requests review and does not authorize commit.
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const STATE = process.env.CARRY_STATE_FILE;
if (!STATE) {
  console.error('Set CARRY_STATE_FILE to a private operator state file; none is bundled in this repository.');
  process.exit(2);
}
const REPO = process.env.CARRY_PUBLIC_REPO || ROOT;

const SCREEN_LEGS = ['PURR', 'HYPE'];

const classify = (annPct, streak = 0) =>
  annPct < 0 ? 'NEGATIVE' : annPct < 5 ? 'SCREEN-WATCH' : (streak >= 3 ? 'SCREEN-PASS' : 'SCREEN-WATCH');

const state = JSON.parse(fs.readFileSync(STATE, 'utf8'));
const now = Date.now();
const DAY = 24 * 3600 * 1000;

const parts = [];
for (const coin of SCREEN_LEGS) {
  const leg = state.legs[coin];
  if (!leg?.hist?.length) { parts.push(`${coin}:NODATA`); continue; }
  const recent = leg.hist.filter(h => h.t > now - DAY);
  const rates = recent.length >= 3 ? recent : leg.hist.slice(-3);
  const avg = rates.reduce((a, h) => a + h.r, 0) / rates.length;
  const ann = avg * 24 * 365 * 100;
  // Persistence gate: screen-pass requires 3+ consecutive positive samples.
  // It is a data-class transition only; no order or position is implied.
  let streak = 0;
  for (let i = rates.length - 1; i >= 0; i--) { if (rates[i].r > 0) streak++; else break; }
  const verdict = classify(ann, streak);
  const basis = leg.lastBasis ?? 1;
  const basisClass = Math.abs(basis - 1) > 0.01 ? 'DRIFT' : 'OK';
  parts.push(`${coin}:${verdict}|basis-${basisClass}`);
}

// digest due day (UTC) — changes once per day, wakes the agent to publish
parts.push(`digest:${new Date().toISOString().slice(0, 10)}`);

// Repo cleanliness — dirty requests review; it never authorizes an automatic commit.
try {
  const dirty = execSync('git status --porcelain', { cwd: REPO, encoding: 'utf8' }).trim();
  parts.push(dirty ? 'repo:dirty' : 'repo:clean');
} catch {
  parts.push('repo:unknown');
}

console.log(parts.join(' '));
