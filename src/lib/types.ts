export type StageKey = "SU" | "APP" | "ACC" | "APD" | "RE" | "FI" | "CO";

export type StreamFilter = "all" | "ogx" | "icx";

export type ProductCode = "oGV" | "oGTa" | "oGTe" | "iGV" | "iGTa" | "iGTe";

export type DatePresetKey =
  | "mc_term"
  | "lc_term"
  | "this_quarter"
  | "this_month"
  | "prev_month"
  | "custom";

export interface EntityOption {
  id: number;
  name: string;
  type: "LC" | "MC";
  parentMcId: number;
}

export type StageCounts = Record<StageKey, number>;

export interface ProductMetrics {
  code: ProductCode;
  label: string;
  stream: "ogx" | "icx";
  programmeId: 7 | 8 | 9;
  color: string;
  counts: StageCounts;
}

export interface StepConversion {
  from: StageKey;
  to: StageKey;
  label: string;
  ogxRate: number | null;
  icxRate: number | null;
  totalRate: number | null;
}

export interface PerformancePayload {
  office: EntityOption;
  period: {
    start: string;
    end: string;
  };
  source: "live" | "snapshot";
  fallbackReason?: string;
  fetchedAt: string;
  totals: {
    all: StageCounts;
    ogx: StageCounts;
    icx: StageCounts;
  };
  products: ProductMetrics[];
  stepConversions: StepConversion[];
}

export const STAGES: { key: StageKey; label: string; shortLabel: string }[] = [
  { key: "SU", label: "Sign-Ups", shortLabel: "SU" },
  { key: "APP", label: "Applicants", shortLabel: "APP" },
  { key: "ACC", label: "Accepted", shortLabel: "ACC" },
  { key: "APD", label: "Approved", shortLabel: "APD" },
  { key: "RE", label: "Realized", shortLabel: "RE" },
  { key: "FI", label: "Finished", shortLabel: "FI" },
  { key: "CO", label: "Completed", shortLabel: "CO" },
];

export const PRODUCT_META: Record<
  ProductCode,
  { label: string; stream: "ogx" | "icx"; programmeId: 7 | 8 | 9; color: string }
> = {
  oGV: { label: "Outgoing Global Volunteer", stream: "ogx", programmeId: 7, color: "#F85A40" },
  oGTa: { label: "Outgoing Global Talent", stream: "ogx", programmeId: 8, color: "#0CB9C1" },
  oGTe: { label: "Outgoing Global Teacher", stream: "ogx", programmeId: 9, color: "#F48924" },
  iGV: { label: "Incoming Global Volunteer", stream: "icx", programmeId: 7, color: "#F85A40" },
  iGTa: { label: "Incoming Global Talent", stream: "icx", programmeId: 8, color: "#0CB9C1" },
  iGTe: { label: "Incoming Global Teacher", stream: "icx", programmeId: 9, color: "#F48924" },
};
