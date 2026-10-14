import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFile(path.join(ROOT, file), 'utf8');

test('published reserve reports do not claim client AUM or an independent audit', async () => {
  for (const file of ['reports/reserves-2026-10-11.md', 'reports/reserves-2026-10-12.md']) {
    const content = await read(file);
    assert.match(content, /not client AUM/i, file);
    assert.match(content, /not an independent proof of reserves/i, file);
    assert.doesNotMatch(content, /^# Proof of Reserves/im, file);
    assert.doesNotMatch(content, /TOTAL AUM/i, file);
  }
});

test('the public ledger and retired pitch clearly pause intake', async () => {
  const ledger = JSON.parse(await read('aum-ledger.json'));
  const pitch = await read('docs/vault-pitch.md');
  assert.equal(ledger.intake_status, 'paused');
  assert.equal(ledger.total_deposited, 0);
  assert.deepEqual(ledger.depositors, []);
  assert.match(ledger.policy.deposit_rail, /paused|do not send/i);
  assert.match(pitch, /do not send funds/i);
});

test('the 2026-10-13 digest reports reproducible prints, not withdrawn strategy claims', async () => {
  const report = await read('reports/2026-10-13.md');
  assert.match(report, /verify-settled-prints\.mjs 2026-10-13/);
  assert.match(report, /does not claim executed trades, open positions, or realized strategy P&L/i);
  assert.doesNotMatch(report, /\b180d avg\s+\d|\*\*?(?:DEPLOY|HOLD|watch)\*\*?|size entry per|pace from \d+ samples|sampled funding pace|watchdog samples/i);
});
