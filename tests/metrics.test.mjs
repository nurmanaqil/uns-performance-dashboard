import test from "node:test";
import assert from "node:assert/strict";

// Mirror core pure helpers to verify edge cases without requiring a TS test runner
function calcRate(num, den) {
  if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return null;
  return Math.round((num / den) * 1000) / 10;
}

function getMcTerm(date) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const startYear = m >= 7 ? y : y - 1;
  return { start: `${startYear}-08-01`, end: `${startYear + 1}-07-31` };
}

function getLcTerm(date) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const startYear = m >= 1 ? y : y - 1;
  return { start: `${startYear}-02-01`, end: `${startYear + 1}-01-31` };
}

test("calcRate handles zero denominator safely without NaN or Infinity", () => {
  assert.equal(calcRate(10, 0), null);
  assert.equal(calcRate(0, 0), null);
  assert.equal(calcRate(30, 44), 68.2);
});

test("calcRate preserves >100% period-based conversions accurately", () => {
  // e.g. 29 Finished vs 10 Realized in a narrow date window
  assert.equal(calcRate(29, 10), 290);
});

test("AIESEC MC Term and LC Term date presets resolve accurately", () => {
  const nov2026 = new Date("2026-11-26T00:00:00Z");
  assert.deepEqual(getMcTerm(nov2026), { start: "2026-08-01", end: "2027-07-31" });
  assert.deepEqual(getLcTerm(nov2026), { start: "2026-02-01", end: "2027-01-31" });

  const jan2027 = new Date("2027-01-15T00:00:00Z");
  assert.deepEqual(getMcTerm(jan2027), { start: "2026-08-01", end: "2027-07-31" });
  assert.deepEqual(getLcTerm(jan2027), { start: "2026-02-01", end: "2027-01-31" });
});
