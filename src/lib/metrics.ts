import {
  STAGES,
  type DatePresetKey,
  type ProductMetrics,
  type StageCounts,
  type StageKey,
  type StepConversion,
} from "./types";

export function emptyStageCounts(): StageCounts {
  return { SU: 0, APP: 0, ACC: 0, APD: 0, RE: 0, FI: 0, CO: 0 };
}

/** Safe percentage calculation; returns null when denominator is 0. */
export function calcRate(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function formatRate(rate: number | null): string {
  if (rate === null) return "—";
  return `${rate.toFixed(1)}%`;
}

/** Aggregates 6 products into oGX, iCX, and combined totals. SU applies to oGX only (AIESEC/CORE convention). */
export function aggregateProducts(products: ProductMetrics[]): {
  all: StageCounts;
  ogx: StageCounts;
  icx: StageCounts;
} {
  const ogx = emptyStageCounts();
  const icx = emptyStageCounts();
  const all = emptyStageCounts();

  for (const product of products) {
    const bucket = product.stream === "ogx" ? ogx : icx;
    for (const { key } of STAGES) {
      const value = product.stream === "icx" && key === "SU" ? 0 : Math.max(0, product.counts[key] || 0);
      bucket[key] += value;
      all[key] += value;
    }
  }

  return { all, ogx, icx };
}

export function buildStepConversions(totals: {
  all: StageCounts;
  ogx: StageCounts;
  icx: StageCounts;
}): StepConversion[] {
  const pairs: [StageKey, StageKey][] = [
    ["SU", "APP"],
    ["APP", "ACC"],
    ["ACC", "APD"],
    ["APD", "RE"],
    ["RE", "FI"],
    ["FI", "CO"],
  ];

  return pairs.map(([from, to]) => ({
    from,
    to,
    label: `${from} → ${to}`,
    ogxRate: calcRate(totals.ogx[to], totals.ogx[from]),
    // iCX has no Sign-Up stage, so SU -> APP is always null for iCX
    icxRate: from === "SU" ? null : calcRate(totals.icx[to], totals.icx[from]),
    totalRate:
      from === "SU"
        ? calcRate(totals.ogx[to], totals.ogx[from])
        : calcRate(totals.all[to], totals.all[from]),
  }));
}

/** Downstream conversion rates from a chosen baseStage to every later stage (CORE-style matrix). */
export function buildDownstreamRates(
  counts: StageCounts,
  baseStage: StageKey,
  isIcxOnly = false
): Record<StageKey, number | null> {
  const baseIndex = STAGES.findIndex((s) => s.key === baseStage);
  const result: Record<StageKey, number | null> = {
    SU: null,
    APP: null,
    ACC: null,
    APD: null,
    RE: null,
    FI: null,
    CO: null,
  };

  if (isIcxOnly && baseStage === "SU") return result;

  const baseValue = counts[baseStage];
  for (let i = baseIndex + 1; i < STAGES.length; i++) {
    const target = STAGES[i].key;
    result[target] = calcRate(counts[target], baseValue);
  }
  return result;
}

/** Finds the largest conversion drop-off step for executive report insights. */
export function findPrimaryBottleneck(steps: StepConversion[]): {
  label: string;
  rate: number;
} | null {
  let worst: { label: string; rate: number } | null = null;
  for (const step of steps) {
    if (step.totalRate === null) continue;
    if (!worst || step.totalRate < worst.rate) {
      worst = { label: step.label, rate: step.totalRate };
    }
  }
  return worst;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** AIESEC-native date presets (MC Term: Aug 1–Jul 31, LC Term: Feb 1–Jan 31). */
export function getPresetDateRange(
  preset: Exclude<DatePresetKey, "custom">,
  now: Date = new Date()
): { start: string; end: string } {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  switch (preset) {
    case "mc_term": {
      const startYear = month >= 7 ? year : year - 1;
      return {
        start: `${startYear}-08-01`,
        end: `${startYear + 1}-07-31`,
      };
    }
    case "lc_term": {
      const startYear = month >= 1 ? year : year - 1;
      return {
        start: `${startYear}-02-01`,
        end: `${startYear + 1}-01-31`,
      };
    }
    case "this_quarter": {
      const qStartMonth = Math.floor(month / 3) * 3;
      const start = new Date(year, qStartMonth, 1);
      const end = new Date(year, qStartMonth + 3, 0);
      return { start: toIsoDate(start), end: toIsoDate(end) };
    }
    case "this_month": {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      return { start: toIsoDate(start), end: toIsoDate(end) };
    }
    case "prev_month": {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      return { start: toIsoDate(start), end: toIsoDate(end) };
    }
  }
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed);
}
