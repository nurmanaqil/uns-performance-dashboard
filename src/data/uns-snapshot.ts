import { resolveEntity } from "@/lib/entities";
import { aggregateProducts, buildStepConversions } from "@/lib/metrics";
import {
  PRODUCT_META,
  type PerformancePayload,
  type ProductCode,
  type ProductMetrics,
  type StageCounts,
} from "@/lib/types";

/**
 * Baseline snapshot for AIESEC in UNS (Office ID: 6) during MC26 Term
 * (cross-checked against AIESEC Analytics API / CORE MC26 on 2026-11-26:
 *  371 SU, 112 APP, 44 ACC, 30 APD, 10 RE, 29 FI, 20 CO).
 *
 * shortcut: Scales UNS baseline proportionally for narrower date windows when
 * EXPA_ACCESS_TOKEN is expired/unset; upgrade to OAuth 2.0 refresh_token for
 * permanent live queries. Never relabels UNS counts as another office.
 */
const UNS_MC26_BASELINE: Record<ProductCode, StageCounts> = {
  oGV: { SU: 218, APP: 64, ACC: 24, APD: 17, RE: 6, FI: 16, CO: 12 },
  oGTa: { SU: 109, APP: 22, ACC: 8, APD: 5, RE: 2, FI: 6, CO: 4 },
  oGTe: { SU: 44, APP: 8, ACC: 3, APD: 2, RE: 0, FI: 2, CO: 1 },
  iGV: { SU: 0, APP: 14, ACC: 7, APD: 5, RE: 2, FI: 4, CO: 3 },
  iGTa: { SU: 0, APP: 3, ACC: 2, APD: 1, RE: 0, FI: 1, CO: 0 },
  iGTe: { SU: 0, APP: 1, ACC: 0, APD: 0, RE: 0, FI: 0, CO: 0 },
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
  fallbackReason: string
): PerformancePayload {
  const ratio = computeWindowRatio(start, end);
  // Never mislabel UNS baseline numbers as another office
  const entity = resolveEntity(6);
  const officeNote =
    officeId !== 6
      ? ` Requested Office #${officeId} unavailable offline; showing UNS (#6) baseline instead.`
      : "";
  const estimateNote =
    ratio < 1
      ? " Narrow date window values are proportionally estimated from the UNS MC26 baseline."
      : "";

  const products: ProductMetrics[] = (Object.keys(PRODUCT_META) as ProductCode[]).map(
    (code) => {
      const meta = PRODUCT_META[code];
      const base = UNS_MC26_BASELINE[code];
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
    fallbackReason: `${fallbackReason}${officeNote}${estimateNote}`,
    fetchedAt: new Date().toISOString(),
    totals,
    products,
    stepConversions,
  };
}
