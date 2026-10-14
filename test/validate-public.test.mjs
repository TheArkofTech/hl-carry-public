import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, cp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFile(path.join(ROOT, file), 'utf8');

test('public validation permits the next daily digest', async () => {
  const dir = await mkdtemp(path.join(process.env.TMPDIR || os.tmpdir(), 'public-growth-test-'));
  try {
    await mkdir(path.join(dir, 'scripts'));
    await mkdir(path.join(dir, 'docs'));
    await mkdir(path.join(dir, 'clawhub-skill'));
    for (const file of ['README.md','aum-ledger.json','carry-exec.mjs','docs/vault-pitch.md','scripts/validate-public.mjs','clawhub-skill/SKILL.md']) {
      await cp(path.join(ROOT,file), path.join(dir,file));
    }
    await cp(path.join(ROOT,'reports'), path.join(dir,'reports'), {recursive:true});
    await writeFile(path.join(dir,'reports/2026-10-14.md'), '# Next-day test fixture\nFunding rates are not returns.');
    const result=spawnSync(process.execPath,[path.join(dir,'scripts/validate-public.mjs')],{encoding:'utf8',timeout:10000});
    assert.equal(result.status,0,result.stderr);
    assert.equal(JSON.parse(result.stdout).ok,true);
  } finally { await rm(dir,{recursive:true,force:true}); }
});

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

test('public README and ClawHub skill document the read-only Console MCP App consistently', async () => {
  const readme = await read('README.md');
  const skill = await read('clawhub-skill/SKILL.md');
  for (const content of [readme, skill]) {
    assert.match(content, /\/mcp\/carry-console/);
    assert.match(content, /carry_opportunities_ui/);
    assert.match(content, /\$0\.50/);
    assert.match(content, /ui_refresh/);
    assert.match(content, /PAYMENT-SIGNATURE/);
    assert.match(content, /never tool arguments/i);
    assert.match(content, /does not sign payments or execute trades/i);
  }
});
