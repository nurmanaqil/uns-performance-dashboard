import test from "node:test";
import assert from "node:assert/strict";
import {
  calcRate,
  getPresetDateRange,
  isValidIsoDate,
} from "../src/lib/metrics.ts";
import { getSnapshotPerformance } from "../src/data/uns-snapshot.ts";

test("calcRate handles zero denominator safely without NaN or Infinity", () => {
  assert.equal(calcRate(10, 0), null);
  assert.equal(calcRate(0, 0), null);
  assert.equal(calcRate(30, 44), 68.2);
});

test("calcRate preserves >100% period-based conversions accurately", () => {
  assert.equal(calcRate(29, 10), 290);
});

test("isValidIsoDate rejects impossible calendar dates like Feb 31", () => {
  assert.equal(isValidIsoDate("2026-02-28"), true);
  assert.equal(isValidIsoDate("2026-02-31"), false);
  assert.equal(isValidIsoDate("2026-13-01"), false);
});

test("AIESEC MC Term and LC Term date presets resolve accurately", () => {
  const nov2026 = new Date("2026-11-26T00:00:00Z");
  assert.deepEqual(getPresetDateRange("mc_term", nov2026), {
    start: "2026-08-01",
    end: "2027-07-31",
  });
  assert.deepEqual(getPresetDateRange("lc_term", nov2026), {
    start: "2026-02-01",
    end: "2027-01-31",
  });
});

test("Fallback returns distinct counts for LC Term vs MC Term and UNS vs Indonesia", () => {
  const nowMs = Date.parse("2026-11-27T00:00:00Z");
  const mc = getSnapshotPerformance(6, "2026-08-01", "2027-07-31", "expired", nowMs);
  const lc = getSnapshotPerformance(6, "2026-02-01", "2027-01-31", "expired", nowMs);
  const idn = getSnapshotPerformance(1539, "2026-08-01", "2027-07-31", "expired", nowMs);

  assert.notEqual(lc.totals.all.SU, mc.totals.all.SU);
  assert.ok(lc.totals.all.SU > mc.totals.all.SU);
  assert.equal(idn.office.id, 1539);
  assert.ok(idn.totals.all.SU > mc.totals.all.SU);
});
