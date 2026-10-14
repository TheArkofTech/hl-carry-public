#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checks = [];

async function text(relative) {
  return readFile(path.join(ROOT, relative), 'utf8');
}

async function sensitiveFileNames(directory = ROOT, relative = '') {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const child = path.join(directory, entry.name);
    const rel = path.join(relative, entry.name);
    if (entry.isDirectory()) found.push(...await sensitiveFileNames(child, rel));
    else if (entry.isFile() && /^(?:\.env(?:\..*)?|wallet\.json|id_(?:rsa|ed25519)|credentials.*\.json|secrets.*\.json|service-account.*\.json|[^/]+\.(?:pem|key|p12|pfx))$/i.test(entry.name)
      && !['.env.example', '.env.sample'].includes(entry.name)) found.push(rel);
  }
  return found;
}

async function credentialPatternFindings(directory = ROOT, relative = '') {
  const findings = [];
  const patterns = [
    ['PEM private-key marker', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i],
    ['GitHub token format', /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/],
    ['Slack token format', /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
    ['AWS access-key format', /\bAKIA[0-9A-Z]{16}\b/],
    ['Stripe secret-key format', /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/],
    ['OpenAI secret-key format', /\bsk-[A-Za-z0-9_-]{20,}\b/],
    ['npm token format', /\bnpm_[A-Za-z0-9]{30,}\b/],
  ];
  const textExtensions = new Set(['.cjs', '.js', '.json', '.md', '.mjs', '.sh', '.toml', '.txt', '.yaml', '.yml']);
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const child = path.join(directory, entry.name);
    const rel = path.join(relative, entry.name);
    if (entry.isDirectory()) findings.push(...await credentialPatternFindings(child, rel));
    else if (entry.isFile() && textExtensions.has(path.extname(entry.name).toLowerCase())) {
      const contents = await readFile(child, 'utf8');
      for (const [label, pattern] of patterns) {
        if (pattern.test(contents)) findings.push(`${rel}: ${label}`);
      }
    }
  }
  return findings;
}

function check(name, condition, detail) {
  checks.push({ name, ok: Boolean(condition), detail });
  if (!condition) throw new Error(`${name}: ${detail}`);
}

async function main() {
  const ledger = JSON.parse(await text('aum-ledger.json'));
  const readme = await text('README.md');
  const pitch = await text('docs/vault-pitch.md');
  const errata = await text('reports/errata-2026-10-13.md');
  const execSource = await text('carry-exec.mjs');
  const files = await readdir(path.join(ROOT, 'reports'));
  const dailyReports = files.filter((name) => /^\d{4}-\d{2}-\d{2}\.md$/.test(name));
  const reserves = files.filter((name) => /^reserves-\d{4}-\d{2}-\d{2}\.md$/.test(name));
  const secretLikeFiles = await sensitiveFileNames();
  const credentialFindings = await credentialPatternFindings();

  check('fund intake paused', ledger.intake_status === 'paused', 'aum-ledger.json must state intake_status=paused');
  check('no recorded customer deposits', ledger.total_deposited === 0 && Array.isArray(ledger.depositors) && ledger.depositors.length === 0,
    'ledger must show zero deposits and an empty depositor list');
  check('no active deposit rail', typeof ledger.policy?.deposit_rail === 'string' && /paused|no active|do not send/i.test(ledger.policy.deposit_rail),
    'the old deposit address must not be presented as an active rail');
  check('no secret-like files', secretLikeFiles.length === 0, `prohibited filename count=${secretLikeFiles.length}`);
  check('no high-confidence credential patterns', credentialFindings.length === 0,
    `credential pattern finding count=${credentialFindings.length}${credentialFindings.length ? ` (${credentialFindings.join('; ')})` : ''}`);
  check('README distinguishes rates from returns', /funding rates are not returns/i.test(readme), 'README must not imply annualized rates are realized P&L');
  check('README discloses contradictory live status', /At `\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z`, the live \[`\/verify` response\]/.test(readme)
    && /live_now\.perp_positions/.test(readme) && /contradicts itself/i.test(readme),
  'README must state the dated empty position list and the conflicting live claim');
  check('README labels marketplace billing separately', /direct x402/i.test(readme) && /12%/i.test(readme), 'README must distinguish MCPRush fees from direct x402 charges');
  check('vault pitch withdrawn', /do not send funds/i.test(pitch) && /paused/i.test(pitch) && !/Live AUM:/i.test(pitch),
    'vault-pitch.md must not solicit deposits or show stale AUM');
  check('fund execution fail-closed', /live order submission is disabled/i.test(execSource) && /process\.exit\(2\)/.test(execSource),
    'carry-exec must accurately document and retain its live-submit abort');
  check('dated evidence and errata', dailyReports.length >= 10 && /fourteen rows/i.test(errata),
    'at least ten daily reports and the verified 2026-10-13 errata must be present');

  for (const name of dailyReports) {
    const report = await text(`reports/${name}`);
    check(`${name} excludes unsupported history and trade calls`,
      !/\b180d avg\s+\d|\*\*?(?:DEPLOY|HOLD|watch)\*\*?|size entry per|pace from \d+ samples|sampled funding pace|watchdog samples/i.test(report),
      'daily digests must not publish withdrawn history, private sample rates, or execution instructions');
  }

  for (const name of reserves) {
    const report = await text(`reports/${name}`);
    check(`${name} classification`, /not client AUM/i.test(report) && /not an independent proof of reserves/i.test(report),
      'balance snapshots must not be represented as client AUM or an independent audit');
    check(`${name} title`, /account snapshot/i.test(report) && !/^# Proof of Reserves/im.test(report),
      'reserve-style reports must use the account-snapshot title');
  }

  console.log(JSON.stringify({ ok: true, checks }, null, 2));
}

main().catch((error) => {
  console.error(`public-repo validation failed: ${error.message}`);
  process.exitCode = 1;
});
