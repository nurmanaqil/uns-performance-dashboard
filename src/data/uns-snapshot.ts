import { resolveEntity } from "@/lib/entities";
import { aggregateProducts, buildStepConversions } from "@/lib/metrics";
import {
  PRODUCT_META,
  type PerformancePayload,
  type ProductCode,
  type ProductMetrics,
  type StageCounts,
} from "@/lib/types";

const BASELINES: Record<number, Record<ProductCode, StageCounts>> = {
  6: {
    oGV: { SU: 218, APP: 64, ACC: 24, APD: 17, RE: 6, FI: 16, CO: 12 },
    oGTa: { SU: 109, APP: 22, ACC: 8, APD: 5, RE: 2, FI: 6, CO: 4 },
    oGTe: { SU: 44, APP: 8, ACC: 3, APD: 2, RE: 0, FI: 2, CO: 1 },
    iGV: { SU: 0, APP: 14, ACC: 7, APD: 5, RE: 2, FI: 4, CO: 3 },
    iGTa: { SU: 0, APP: 3, ACC: 2, APD: 1, RE: 0, FI: 1, CO: 0 },
    iGTe: { SU: 0, APP: 1, ACC: 0, APD: 0, RE: 0, FI: 0, CO: 0 },
  },
  1539: {
    oGV: { SU: 4820, APP: 1420, ACC: 540, APD: 390, RE: 185, FI: 310, CO: 245 },
    oGTa: { SU: 2150, APP: 460, ACC: 165, APD: 105, RE: 48, FI: 92, CO: 68 },
    oGTe: { SU: 890, APP: 180, ACC: 64, APD: 42, RE: 18, FI: 35, CO: 24 },
    iGV: { SU: 0, APP: 1180, ACC: 495, APD: 340, RE: 160, FI: 275, CO: 210 },
    iGTa: { SU: 0, APP: 210, ACC: 78, APD: 46, RE: 22, FI: 38, CO: 26 },
    iGTe: { SU: 0, APP: 95, ACC: 34, APD: 20, RE: 9, FI: 16, CO: 11 },
  },
};

function computeWindowRatio(start: string, end: string): number {
  const s = Date.parse(`${start}T00:00:00Z`);
  const e = Date.parse(`${end}T00:00:00Z`);
  const days = Math.max(1, Math.round((e - s) / 86_400_000) + 1);
  if (days >= 115) return 1;
  return Math.max(0.08, Math.min(1, days / 118));
}

export function getSnapshotPerformance(
  officeId: number,
  start: string,
  end: string,
  _fallbackReason: string
): PerformancePayload {
  const ratio = computeWindowRatio(start, end);
  const resolvedId = officeId in BASELINES ? officeId : 6;
  const entity = resolveEntity(resolvedId);
  const baseline = BASELINES[resolvedId];
  const label = resolvedId === 1539 ? "AIESEC in Indonesia" : "UNS";

  const products: ProductMetrics[] = (Object.keys(PRODUCT_META) as ProductCode[]).map(
    (code) => {
      const meta = PRODUCT_META[code];
      const base = baseline[code];
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
  const stepConversions = buildStepConversions(totals);

  return {
    office: entity,
    period: { start, end },
    source: "snapshot",
    fallbackReason: `EXPA token expired — displaying ${label} Fallback data.`,
    fetchedAt: new Date().toISOString(),
    totals,
    products,
    stepConversions,
  };
}
