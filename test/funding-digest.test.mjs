import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseSettledPrintLines } from '../scripts/verify-settled-prints.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('a failed HTTP fetch cannot overwrite the published report', async () => {
  const dir = await mkdtemp(path.join(process.env.TMPDIR || os.tmpdir(), 'digest-http-test-'));
  try {
    await mkdir(path.join(dir, 'scripts'));
    await mkdir(path.join(dir, 'reports'));
    await writeFile(path.join(dir, 'scripts/verify-settled-prints.mjs'), await readFile(path.join(ROOT, 'scripts/verify-settled-prints.mjs')));
    await writeFile(path.join(dir, 'funding-digest.mjs'), await readFile(path.join(ROOT, 'funding-digest.mjs')));
    const preload = path.join(dir, 'fetch.mjs');
    await writeFile(preload, `globalThis.fetch = async (_, options) => {
      const q=JSON.parse(options.body);
      return new Response(JSON.stringify([{time:q.startTime,fundingRate:'0.0000125'}]), {status:503});
    };`);
    const reportPath = path.join(dir, 'reports/2026-10-13.md');
    await writeFile(reportPath, 'prior verified report');
    const result = spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, path.join(dir, 'funding-digest.mjs'), '2026-10-13'], {
      encoding:'utf8', env:{...process.env,CARRY_STATE_FILE:'',CARRY_REPORTS_DIR:path.join(dir,'reports')}, timeout:10000,
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /HTTP 503/);
    assert.equal(await readFile(reportPath, 'utf8'), 'prior verified report');
  } finally { await rm(dir, {recursive:true,force:true}); }
});

test('an incomplete settled day cannot create a report', async () => {
  const dir = await mkdtemp(path.join(process.env.TMPDIR || os.tmpdir(), 'digest-partial-test-'));
  try {
    await mkdir(path.join(dir, 'scripts'));
    await writeFile(path.join(dir, 'scripts/verify-settled-prints.mjs'), await readFile(path.join(ROOT, 'scripts/verify-settled-prints.mjs')));
    await writeFile(path.join(dir, 'funding-digest.mjs'), await readFile(path.join(ROOT, 'funding-digest.mjs')));
    const preload = path.join(dir, 'fetch.mjs');
    await writeFile(preload, `globalThis.fetch = async (_, options) => {
      const q=JSON.parse(options.body);
      return new Response(JSON.stringify(Array.from({length:23},(_,i)=>({time:q.startTime+i*3600000+5,fundingRate:'0.0000125'}))), {status:200});
    };`);
    const result = spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, path.join(dir, 'funding-digest.mjs'), '2026-10-13'], {
      encoding:'utf8', env:{...process.env,CARRY_REPORTS_DIR:path.join(dir,'reports')}, timeout:10000,
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /incomplete settled day/);
    await assert.rejects(readFile(path.join(dir,'reports/2026-10-13.md')), {code:'ENOENT'});
  } finally { await rm(dir, {recursive:true,force:true}); }
});

test('generated digest is settled-only and excludes the next UTC midnight', async () => {
  const dir = await mkdtemp(path.join(process.env.TMPDIR || os.tmpdir(), 'digest-test-'));
  try {
    const preload = path.join(dir, 'fetch.mjs');
    // Synthetic boundary fixture; never published or claimed as market data.
    await writeFile(preload, `globalThis.fetch = async (_, options) => {
      const q = JSON.parse(options.body);
      const rows = Array.from({length:24}, (_,i) => ({coin:q.coin,time:q.startTime+i*3600000+5,fundingRate:'0.0000125'}));
      rows.push({coin:q.coin,time:q.endTime,fundingRate:'-0.1'});
      return new Response(JSON.stringify(rows), {status:200});
    };`);
    const state = path.join(dir, 'private.json');
    await writeFile(state, JSON.stringify({legs:Object.fromEntries(['PURR','HYPE','PUMP','MON'].map(c=>[c,{hist:[{t:Date.parse('2026-10-13T12:00:00Z'),r:0.1}]}]))}));
    await mkdir(path.join(dir, 'scripts'));
    await writeFile(path.join(dir, 'scripts/verify-settled-prints.mjs'), await readFile(path.join(ROOT, 'scripts/verify-settled-prints.mjs')));
    await writeFile(path.join(dir, 'funding-digest.mjs'), await readFile(path.join(ROOT, 'funding-digest.mjs')));
    const result = spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, path.join(dir, 'funding-digest.mjs'), '2026-10-13'], {
      encoding:'utf8', env:{...process.env,CARRY_STATE_FILE:state,CARRY_REPORTS_DIR:path.join(dir,'reports')}, timeout:10000,
    });
    assert.equal(result.status, 0, result.stderr);
    const report = await readFile(path.join(dir, 'reports/2026-10-13.md'), 'utf8');
    const rows = parseSettledPrintLines(report);
    assert.equal(rows.length, 4);
    for (const row of rows) assert.deepEqual({prints:row.prints,neg:row.negativePrints,ann:row.annualizedPct}, {prints:24,neg:0,ann:11});
    assert.doesNotMatch(report, /watchdog samples|operator-sampled|sampled funding pace|\*\*watch\*\*|screen-pass|size entry per/i);
    assert.match(report, /does not claim executed trades, open positions, or realized strategy P&L/i);
  } finally { await rm(dir, {recursive:true,force:true}); }
});
