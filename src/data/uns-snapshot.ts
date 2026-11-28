import { resolveEntity } from "../lib/entities.ts";
import { aggregateProducts, buildStepConversions } from "../lib/metrics.ts";
import {
  PRODUCT_META,
  type PerformancePayload,
  type ProductCode,
  type ProductMetrics,
  type StageCounts,
} from "../lib/types.ts";

interface OfficeBaseline {
  openOgx: number;
  products: Record<ProductCode, StageCounts>;
}

const BASELINES: Record<number, OfficeBaseline> = {
  6: {
    openOgx: 374,
    products: {
      oGV: { SU: 254, APP: 33, ACC: 21, APD: 20, RE: 0, FI: 10, CO: 8 },
      oGTa: { SU: 68, APP: 18, ACC: 1, APD: 0, RE: 0, FI: 0, CO: 0 },
      oGTe: { SU: 0, APP: 0, ACC: 0, APD: 0, RE: 0, FI: 0, CO: 0 },
      iGV: { SU: 0, APP: 64, ACC: 26, APD: 20, RE: 10, FI: 19, CO: 12 },
      iGTa: { SU: 0, APP: 0, ACC: 0, APD: 0, RE: 0, FI: 0, CO: 0 },
      iGTe: { SU: 0, APP: 0, ACC: 0, APD: 0, RE: 0, FI: 0, CO: 0 },
    },
  },
  1539: {
    openOgx: 7885,
    products: {
      oGV: { SU: 3757, APP: 443, ACC: 253, APD: 209, RE: 61, FI: 210, CO: 136 },
      oGTa: { SU: 1032, APP: 546, ACC: 20, APD: 9, RE: 3, FI: 16, CO: 3 },
      oGTe: { SU: 243, APP: 110, ACC: 17, APD: 9, RE: 7, FI: 10, CO: 1 },
      iGV: { SU: 0, APP: 818, ACC: 375, APD: 145, RE: 99, FI: 230, CO: 131 },
      iGTa: { SU: 0, APP: 0, ACC: 0, APD: 0, RE: 0, FI: 0, CO: 0 },
      iGTe: { SU: 0, APP: 0, ACC: 0, APD: 0, RE: 0, FI: 0, CO: 0 },
    },
  },
};

function computeWindowRatio(start: string, end: string, nowMs: number = Date.now()): number {
  const startMs = Date.parse(`${start}T00:00:00Z`);
  const endMs = Date.parse(`${end}T23:59:59Z`);
  if (startMs > nowMs) return 0;
  const effectiveEnd = Math.min(endMs, nowMs);
  const elapsedDays = Math.max(1, Math.round((effectiveEnd - startMs) / 86_400_000) + 1);
  return Math.max(0.08, Math.min(2.2, elapsedDays / 120));
}

export function getSnapshotPerformance(
  officeId: number,
  start: string,
  end: string,
  _fallbackReason: string,
  nowMs: number = Date.now()
): PerformancePayload {
  const ratio = computeWindowRatio(start, end, nowMs);
  const resolvedId = officeId in BASELINES ? officeId : 6;
  const entity = resolveEntity(resolvedId);
  const baseline = BASELINES[resolvedId];
  const label = resolvedId === 1539 ? "AIESEC in Indonesia" : "UNS";

  const products: ProductMetrics[] = (Object.keys(PRODUCT_META) as ProductCode[]).map(
    (code) => {
      const meta = PRODUCT_META[code];
      const base = baseline.products[code];
      const counts: StageCounts = {
        SU: Math.round(base.SU * ratio),
        APP: Math.round(base.APP * ratio),
        ACC: Math.round(base.ACC * ratio),
        APD: Math.round(base.APD * ratio),
        RE: Math.round(base.RE * ratio),
        FI: Math.round(base.FI * ratio),
        CO: Math.round(base.CO * ratio),
      };
      return {
        code,
        label: meta.label,
        stream: meta.stream,
        programmeId: meta.programmeId,
        color: meta.color,
        counts,
      };
    }
  );

  const totals = aggregateProducts(products);
  const scaledOpenOgx = Math.round(baseline.openOgx * ratio);
  if (scaledOpenOgx > totals.ogx.SU) {
    totals.ogx.SU = scaledOpenOgx;
    totals.all.SU = scaledOpenOgx;
  }

  const stepConversions = buildStepConversions(totals);

  return {
    office: entity,
    period: { start, end },
    source: "snapshot",
    fallbackReason: `EXPA token expired — displaying ${label} Fallback data.`,
    fetchedAt: new Date(nowMs).toISOString(),
    totals,
    products,
    stepConversions,
  };
}
