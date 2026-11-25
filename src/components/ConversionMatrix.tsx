"use client";

import { useRef, useState } from "react";
import { buildDownstreamRates, formatRate } from "@/lib/metrics";
import {
  STAGES,
  type PerformancePayload,
  type StageCounts,
  type StageKey,
  type StreamFilter,
} from "@/lib/types";

interface ConversionMatrixProps {
  data: PerformancePayload;
  stream: StreamFilter;
}

const BASE_STAGE_TABS: { key: StageKey; label: string }[] = [
  { key: "SU", label: "From Signup (oGX)" },
  { key: "APP", label: "From Applicant" },
  { key: "ACC", label: "From Accepted" },
  { key: "APD", label: "From Approved" },
  { key: "RE", label: "From Realized" },
  { key: "FI", label: "From Finished" },
];

export function ConversionMatrix({ data, stream }: ConversionMatrixProps) {
  const [baseStage, setBaseStage] = useState<StageKey>("APP");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const baseIdx = STAGES.findIndex((s) => s.key === baseStage);
  const downstreamStages = STAGES.slice(baseIdx + 1);

  interface MatrixRow {
    id: string;
    label: string;
    color?: string;
    counts: StageCounts;
    isIcxOnly: boolean;
    highlight?: boolean;
  }

  const rows: MatrixRow[] = [];
  if (stream === "all") {
    // SU applies to oGX only; keep Total row consistent with KPI SU->APP ratio
    rows.push({
      id: "total",
      label: baseStage === "SU" ? "Total (oGX only for SU)" : "Total (All)",
      counts: baseStage === "SU" ? data.totals.ogx : data.totals.all,
      isIcxOnly: false,
      highlight: true,
    });
  }
  if (stream === "all" || stream === "ogx") {
    rows.push({
      id: "ogx",
      label: "oGX Total",
      counts: data.totals.ogx,
      isIcxOnly: false,
    });
  }
  if (stream === "all" || stream === "icx") {
    rows.push({
      id: "icx",
      label: "iCX Total",
      counts: data.totals.icx,
      isIcxOnly: true,
    });
  }

  for (const product of data.products) {
    if (stream !== "all" && product.stream !== stream) continue;
    rows.push({
      id: product.code,
      label: product.code,
      color: product.color,
      counts: product.counts,
      isIcxOnly: product.stream === "icx",
    });
  }

  function handleTabKeyDown(e: React.KeyboardEvent, idx: number) {
    let nextIdx = idx;
    if (e.key === "ArrowRight") nextIdx = (idx + 1) % BASE_STAGE_TABS.length;
    else if (e.key === "ArrowLeft")
      nextIdx = (idx - 1 + BASE_STAGE_TABS.length) % BASE_STAGE_TABS.length;
    else if (e.key === "Home") nextIdx = 0;
    else if (e.key === "End") nextIdx = BASE_STAGE_TABS.length - 1;
    else return;

    e.preventDefault();
    const nextTab = BASE_STAGE_TABS[nextIdx];
    setBaseStage(nextTab.key);
    tabRefs.current[nextIdx]?.focus();
    tabRefs.current[nextIdx]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  return (
    <section data-reveal className="analytics-panel rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5 print-break-avoid">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 id="conversion-matrix-title" className="text-[15px] font-semibold text-[var(--text-primary)]">
            Conversion Rates Matrix (Downstream % by Base Stage)
          </h2>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            Select a starting stage to inspect downstream conversion across oGX, iCX, and all 6 products.
          </p>
        </div>
      </div>

      {/* Single-row horizontal tablist (Modern Web Guidance: tabs) */}
      <div
        role="tablist"
        aria-label="Base stage for conversion matrix"
        className="no-print mb-4 flex overflow-x-auto border-b border-[var(--border-subtle)]"
      >
        {BASE_STAGE_TABS.map((tab, idx) => {
          const isSelected = baseStage === tab.key;
          return (
            <button
              key={tab.key}
              ref={(el) => {
                tabRefs.current[idx] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${tab.key}`}
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => setBaseStage(tab.key)}
              onKeyDown={(e) => handleTabKeyDown(e, idx)}
              className="tab-trigger cursor-pointer px-3.5 py-2.5 text-xs font-medium text-[var(--text-secondary)] transition-colors duration-150 hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-primary)]"
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Keyboard-scrollable semantic responsive table (Modern Web Guidance: responsive-table) */}
      <div
        role="tabpanel"
        aria-labelledby={`tab-${baseStage}`}
        className="w-full"
      >
        <div
          tabIndex={0}
          role="region"
          aria-labelledby="conversion-matrix-title"
          className="table-wrapper rounded-[8px] border border-[var(--border-subtle)]"
        >
          <table className="matrix-table text-left text-xs">
            <caption className="sr-only">
              Downstream conversion percentages starting from {baseStage}
            </caption>
            <thead>
              <tr className="bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
                <th
                  scope="col"
                  className="sticky left-0 z-10 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3.5 py-2.5 font-semibold"
                >
                  Stream / Product
                </th>
                <th
                  scope="col"
                  className="border-b border-[var(--border-subtle)] px-3 py-2.5 text-right font-semibold"
                >
                  Base ({baseStage})
                </th>
                {downstreamStages.map((st) => (
                  <th
                    key={st.key}
                    scope="col"
                    className="border-b border-[var(--border-subtle)] px-3 py-2.5 text-right font-semibold whitespace-nowrap"
                  >
                    → {st.shortLabel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const rates = buildDownstreamRates(row.counts, baseStage, row.isIcxOnly);
                const baseCount =
                  row.isIcxOnly && baseStage === "SU" ? null : row.counts[baseStage];

                return (
                  <tr
                    key={row.id}
                    className={`border-b border-[var(--border-subtle)] last:border-b-0 ${
                      row.highlight ? "font-semibold" : ""
                    }`}
                  >
                    <th
                      scope="row"
                      className="border-b border-[var(--border-subtle)] px-3.5 py-2.5 font-medium text-[var(--text-primary)] whitespace-nowrap"
                    >
                      <span className="inline-flex items-center gap-2">
                        {row.color && (
                          <span
                            className="h-2 w-2 rounded-sm"
                            style={{ backgroundColor: row.color }}
                            aria-hidden="true"
                          />
                        )}
                        {row.label}
                      </span>
                    </th>
                    <td className="font-mono-num border-b border-[var(--border-subtle)] px-3 py-2.5 text-right text-[var(--text-primary)]">
                      {baseCount === null ? "N/A" : baseCount}
                    </td>
                    {downstreamStages.map((st) => {
                      const rate = rates[st.key];
                      const isStrong = rate !== null && rate >= 50;
                      return (
                        <td
                          key={st.key}
                          className={`font-mono-num border-b border-[var(--border-subtle)] px-3 py-2.5 text-right whitespace-nowrap ${
                            isStrong
                              ? "bg-[var(--color-emerald-soft)] font-semibold text-[var(--color-emerald)]"
                              : "text-[var(--text-secondary)]"
                          }`}
                        >
                          {formatRate(rate)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
