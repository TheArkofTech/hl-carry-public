import test from 'node:test';
import assert from 'node:assert/strict';
import {
  matchesPublished,
  parseSettledPrintLines,
  summarizeFundingHistory,
  utcDayBounds,
} from '../scripts/verify-settled-prints.mjs';

test('parses settled prints, including negative-hour counts', () => {
  const rows = parseSettledPrintLines([
    '- **PURR settled prints** — +12.2%/yr over 24 hourly prints',
    '- **HYPE settled prints** — +8.2%/yr over 24 hourly prints ⚠️ 2 NEGATIVE hours (paid rate)',
  ].join('\n'));
  assert.deepEqual(rows, [
    { coin: 'PURR', annualizedPct: 12.2, prints: 24, negativePrints: 0 },
    { coin: 'HYPE', annualizedPct: 8.2, prints: 24, negativePrints: 2 },
  ]);
});

test('annualizes the mean rate and rounds the protocol floor to 11.0%/yr', () => {
  const result = summarizeFundingHistory(Array.from({ length: 24 }, () => ({ fundingRate: '0.0000125' })));
  assert.equal(result.prints, 24);
  assert.equal(result.negativePrints, 0);
  assert.equal(result.annualizedPct, 11.0);
  assert.equal(matchesPublished(
    { prints: 24, negativePrints: 0, annualizedPct: 11.0 },
    result,
  ), true);
});

test('rejects empty and malformed public API responses', () => {
  assert.throws(() => summarizeFundingHistory([]), /at least one print/);
  assert.throws(() => summarizeFundingHistory([{ fundingRate: 'not-a-rate' }]), /non-numeric/);
});

test('uses UTC day boundaries and rejects impossible dates', () => {
  const bounds = utcDayBounds('2026-10-12');
  assert.equal(new Date(bounds.startTime).toISOString(), '2026-10-12T00:00:00.000Z');
  assert.equal(new Date(bounds.endTime).toISOString(), '2026-10-13T00:00:00.000Z');
  assert.throws(() => utcDayBounds('2026-02-30'), /valid UTC/);
  assert.throws(() => utcDayBounds('2026/10/12'), /YYYY-MM-DD/);
});

test('published comparison includes print counts, negative counts, and displayed rate', () => {
  const actual = { prints: 24, negativePrints: 2, annualizedPct: 8.2 };
  assert.equal(matchesPublished({ prints: 24, negativePrints: 2, annualizedPct: 8.2 }, actual), true);
  assert.equal(matchesPublished({ prints: 24, negativePrints: 1, annualizedPct: 8.2 }, actual), false);
  assert.equal(matchesPublished({ prints: 24, negativePrints: 2, annualizedPct: 8.1 }, actual), false);
});
