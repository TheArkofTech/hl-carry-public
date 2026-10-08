/**
 * x409-fingerprint — the SENSE stage of the x409 loop.
 *
 * Monitor-mode source script: runs before the agent every tick. Output MUST be
 * stable (no timestamps, no raw drift) — identical bytes suppress the agent run
 * entirely. The fingerprint fires the agent ONLY on state-class transitions:
 *   - a deploy leg's verdict changes (DEPLOY / WEAK / NEG)
 *   - a leg's basis class changes (OK / DRIFT>1%)
 *   - a new UTC day rolls over (daily digest due)
 *   - the public repo has uncommitted changes
 * Funding values are deliberately bucketed — 11.0% → 10.9% drift is noise,
 * verdict-class transitions are signal.
 */
import fs from 'fs';
import { execSync } from 'child_process';

const STATE = 'C:/HermesVault/.hermes/scripts/carry-state.json';
const REPO = 'C:/Users/franc/dev/hl-carry-public';

const DEPLOY_LEGS = ['PURR', 'HYPE'];

const classify = (annPct, streak = 0) =>
  annPct < 0 ? 'NEG' : annPct < 5 ? 'WEAK' : (streak >= 3 ? 'DEPLOY' : 'WEAK');

const state = JSON.parse(fs.readFileSync(STATE, 'utf8'));
const now = Date.now();
const DAY = 24 * 3600 * 1000;

const parts = [];
for (const coin of DEPLOY_LEGS) {
  const leg = state.legs[coin];
  if (!leg?.hist?.length) { parts.push(`${coin}:NODATA`); continue; }
  const recent = leg.hist.filter(h => h.t > now - DAY);
  const rates = recent.length >= 3 ? recent : leg.hist.slice(-3);
  const avg = rates.reduce((a, h) => a + h.r, 0) / rates.length;
  const ann = avg * 24 * 365 * 100;
  // Persistence gate (2026-10-08): DEPLOY additionally requires 3+ consecutive
  // positive samples at the live tail. A hair-margin avg flip (HYPE 5.32%/yr on
  // a 2-sample streak, 5 negatives in-window) is entry noise, not deployable
  // state — matches the entry gate and stops single-sample wake oscillation.
  let streak = 0;
  for (let i = rates.length - 1; i >= 0; i--) { if (rates[i].r > 0) streak++; else break; }
  const verdict = classify(ann, streak);
  const basis = leg.lastBasis ?? 1;
  const basisClass = Math.abs(basis - 1) > 0.01 ? 'DRIFT' : 'OK';
  parts.push(`${coin}:${verdict}|basis-${basisClass}`);
}

// digest due day (UTC) — changes once per day, wakes the agent to publish
parts.push(`digest:${new Date().toISOString().slice(0, 10)}`);

// repo cleanliness — dirty wakes the agent to commit
try {
  const dirty = execSync('git status --porcelain', { cwd: REPO, encoding: 'utf8' }).trim();
  parts.push(dirty ? 'repo:dirty' : 'repo:clean');
} catch {
  parts.push('repo:unknown');
}

console.log(parts.join(' '));
