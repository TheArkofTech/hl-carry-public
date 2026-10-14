#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPORTS_DIR = path.join(ROOT, 'reports');
const HL_INFO = 'https://api.hyperliquid.xyz/info';
const DAY_MS = 86_400_000;

export function utcDayBounds(day) {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new TypeError('date must be YYYY-MM-DD');
  }
  const startTime = Date.parse(`${day}T00:00:00.000Z`);
  if (!Number.isFinite(startTime) || new Date(startTime).toISOString().slice(0, 10) !== day) {
    throw new TypeError('date is not a valid UTC calendar day');
  }
  return { startTime, endTime: startTime + DAY_MS };
}

export function parseSettledPrintLines(markdown) {
  const rows = [];
  const pattern = /^- \*\*([A-Z0-9]+) settled prints\*\*\s+—\s+([+-]?\d+(?:\.\d+)?)%\/yr over (\d+) hourly prints(?:\s+⚠️\s+(\d+) NEGATIVE hour(?:s)? \(paid rate\))?$/gm;
  for (const match of markdown.matchAll(pattern)) {
    rows.push({
      coin: match[1],
      annualizedPct: Number(match[2]),
      prints: Number(match[3]),
      negativePrints: Number(match[4] || 0),
    });
  }
  return rows;
}

export function summarizeFundingHistory(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new TypeError('fundingHistory response must contain at least one print');
  }
  const parsed = rows.map((row) => {
    const match = /^([+-]?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(String(row?.fundingRate ?? '').trim());
    if (!match) throw new TypeError('fundingHistory contains a non-numeric fundingRate');
    const fraction = match[3] || '';
    let scale = fraction.length - Number(match[4] || 0);
    let numerator = BigInt(`${match[2]}${fraction}` || '0');
    if (match[1] === '-') numerator = -numerator;
    if (scale < 0) {
      numerator *= 10n ** BigInt(-scale);
      scale = 0;
    }
    if (scale > 40) throw new TypeError('fundingRate precision is out of range');
    return { numerator, scale };
  });
  const scale = Math.max(...parsed.map((rate) => rate.scale));
  const scaledSum = parsed.reduce((sum, rate) => sum + rate.numerator * (10n ** BigInt(scale - rate.scale)), 0n);
  const denominator = BigInt(parsed.length) * (10n ** BigInt(scale));
  // Convert annualized percent to tenths exactly, then round half away from zero.
  // This avoids binary floating-point turning the exact 10.95% protocol floor into 10.9.
  const tenthsNumerator = scaledSum * 8_760_000n;
  const sign = tenthsNumerator < 0n ? -1n : 1n;
  const absNumerator = tenthsNumerator < 0n ? -tenthsNumerator : tenthsNumerator;
  const quotient = absNumerator / denominator;
  const remainder = absNumerator % denominator;
  const roundedTenths = quotient + (remainder * 2n >= denominator ? 1n : 0n);
  const annualizedPct = Number(sign * roundedTenths) / 10;
  const mean = Number(scaledSum) / Number(denominator);
  return {
    prints: parsed.length,
    negativePrints: parsed.filter((rate) => rate.numerator < 0n).length,
    annualizedPct,
    unroundedAnnualizedPct: mean * 876_000,
  };
}

export function matchesPublished(expected, actual) {
  return expected.prints === actual.prints
    && expected.negativePrints === actual.negativePrints
    && expected.annualizedPct === actual.annualizedPct;
}

async function fetchFundingHistory(coin, day) {
  const { startTime, endTime } = utcDayBounds(day);
  const response = await fetch(HL_INFO, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'fundingHistory', coin, startTime, endTime }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Hyperliquid HTTP ${response.status} for ${coin} ${day}`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new TypeError(`Hyperliquid returned a non-array for ${coin} ${day}`);
  return rows.filter((row) => Number.isFinite(Number(row?.time))
    && Number(row.time) >= startTime && Number(row.time) < endTime);
}

async function verifyReport(day) {
  const file = path.join(REPORTS_DIR, `${day}.md`);
  const markdown = await readFile(file, 'utf8');
  const expectedRows = parseSettledPrintLines(markdown);
  if (expectedRows.length === 0) throw new Error(`no settled-print rows in reports/${day}.md`);

  const results = [];
  for (const expected of expectedRows) {
    const sourceRows = await fetchFundingHistory(expected.coin, day);
    const actual = summarizeFundingHistory(sourceRows);
    results.push({ day, coin: expected.coin, expected, actual, ok: matchesPublished(expected, actual) });
    await new Promise((resolve) => setTimeout(resolve, 75));
  }
  return results;
}

async function reportDays() {
  return (await readdir(REPORTS_DIR, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && /^\d{4}-\d{2}-\d{2}\.md$/.test(entry.name))
    .map((entry) => entry.name.slice(0, -3))
    .sort();
}

async function main(args) {
  let days;
  if (args.length === 1 && args[0] === '--all') days = await reportDays();
  else if (args.length === 1) days = [args[0]];
  else {
    console.error('usage: node scripts/verify-settled-prints.mjs YYYY-MM-DD | --all');
    process.exitCode = 2;
    return;
  }

  const results = [];
  for (const day of days) results.push(...await verifyReport(day));
  const mismatches = results.filter((row) => !row.ok);
  console.log(JSON.stringify({
    source: HL_INFO,
    method: 'public fundingHistory only; no wallet, payment, signing, or trade action',
    report_lines_checked: results.length,
    matched: results.length - mismatches.length,
    mismatches,
  }, null, 2));
  if (mismatches.length) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  void main(process.argv.slice(2)).catch((error) => {
    console.error(`verification failed: ${error.message}`);
    process.exitCode = 1;
  });
}
