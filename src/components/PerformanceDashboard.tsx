"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowsClockwise,
  Check,
  CopySimple,
  DownloadSimple,
  FilePdf,
  Info,
  WarningCircle,
} from "@phosphor-icons/react";
import { useDashboardMotion } from "@/lib/use-dashboard-motion";
import { ChartsPanel } from "@/components/ChartsPanel";
import { ConversionMatrix } from "@/components/ConversionMatrix";
import { ThemeToggle } from "@/components/ThemeToggle";
import { INDONESIA_ENTITIES } from "@/lib/entities";
import { buildLcSummaryText, downloadCsvReport } from "@/lib/export-report";
import {
  findPrimaryBottleneck,
  formatRate,
  getPresetDateRange,
} from "@/lib/metrics";
import {
  STAGES,
  type DatePresetKey,
  type PerformancePayload,
  type ProductCode,
  type StreamFilter,
} from "@/lib/types";

interface PerformanceDashboardProps {
  defaultOfficeId: number;
}

const PRESETS: { key: Exclude<DatePresetKey, "custom">; label: string }[] = [
  { key: "mc_term", label: "MC Term" },
  { key: "lc_term", label: "LC Term" },
  { key: "this_quarter", label: "This Quarter" },
  { key: "this_month", label: "This Month" },
  { key: "prev_month", label: "Prev Month" },
];

function isEmptyPayload(data: PerformancePayload | null) {
  return !data || STAGES.every(({ key }) => data.totals.all[key] === 0);
}

export function PerformanceDashboard({
  defaultOfficeId,
}: PerformanceDashboardProps) {
  const initialRange = getPresetDateRange("mc_term");
  const [activePreset, setActivePreset] = useState<DatePresetKey>("mc_term");
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);
  const [officeId, setOfficeId] = useState<number>(defaultOfficeId);
  const [customOfficeInput, setCustomOfficeInput] = useState<string>("");
  const [stream, setStream] = useState<StreamFilter>("all");
  const [selectedProduct, setSelectedProduct] = useState<ProductCode | null>(null);

  const [data, setData] = useState<PerformancePayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const motionRoot = useDashboardMotion(Boolean(data) && !isEmptyPayload(data));

  const fetchPerformance = useCallback(
    async (start: string, end: string, targetOfficeId: number) => {
      if (start > end) {
        setDateError("Start date must be earlier than or equal to end date.");
        return;
      }
      setDateError(null);
      setLoading(true);
      setErrorMsg(null);

      try {
        const params = new URLSearchParams({
          start,
          end,
          officeId: String(targetOfficeId),
        });
        const res = await fetch(`/api/performance?${params.toString()}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || `Request failed (${res.status})`);
        }
        setData(json as PerformancePayload);
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : "Failed to load performance data."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchPerformance(initialRange.start, initialRange.end, defaultOfficeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePresetClick(preset: Exclude<DatePresetKey, "custom">) {
    const range = getPresetDateRange(preset);
    setActivePreset(preset);
    setStartDate(range.start);
    setEndDate(range.end);
    fetchPerformance(range.start, range.end, officeId);
  }

  function handleApplyCustom(e: React.FormEvent) {
    e.preventDefault();
    setActivePreset("custom");
    const parsedCustom = customOfficeInput.trim()
      ? Number(customOfficeInput.trim())
      : officeId;
    const targetId =
      Number.isInteger(parsedCustom) && parsedCustom > 0 ? parsedCustom : officeId;
    setOfficeId(targetId);
    fetchPerformance(startDate, endDate, targetId);
  }

  function handleEntitySelect(nextId: number) {
    setOfficeId(nextId);
    setCustomOfficeInput("");
    fetchPerformance(startDate, endDate, nextId);
  }

  async function handleCopySummary() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(buildLcSummaryText(data));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErrorMsg("Clipboard permission denied. Use CSV or PDF export instead.");
    }
  }

  const activeTotals = data
    ? stream === "ogx"
      ? data.totals.ogx
      : stream === "icx"
        ? data.totals.icx
        : data.totals.all
    : null;

  const isAllZero =
    activeTotals !== null &&
    STAGES.every(({ key }) => activeTotals[key] === 0);

  const bottleneck = data ? findPrimaryBottleneck(data.stepConversions) : null;

  return (
    <div ref={motionRoot} className="dashboard-shell min-h-screen">
      {/* Sticky Matte Header */}
      <header className="dashboard-header sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <p className="brand-label">AIESEC · INDONESIA</p>
            <h1 className="text-lg font-bold tracking-tight text-[var(--text-primary)] sm:text-[21px]">
              {data?.office.name || "AIESEC in UNS"} — Performance Dashboard
            </h1>
            <p className="font-mono-num text-xs text-[var(--text-secondary)]">
              Office ID #{officeId} · oGX &amp; iCX Funnel (SU–CO) · Performance workspace
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Real State Badge (solid dot, zero glow/pulse) */}
            {data && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                  data.source === "live"
                    ? "border-[var(--color-emerald)] bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]"
                    : "border-[var(--border-strong)] bg-[var(--color-amber-soft)] text-[var(--color-amber-text)]"
                }`}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor:
                      data.source === "live"
                        ? "var(--color-emerald)"
                        : "var(--color-amber-text)",
                  }}
                  aria-hidden="true"
                />
                {data.source === "live" ? "Live EXPA API" : "UNS Baseline Fallback"}
              </span>
            )}

            {/* 3-Way Export Toolbar */}
            <div className="no-print flex items-center gap-1.5">
              <button
                type="button"
                disabled={!data}
                onClick={() => window.print()}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md bg-[var(--color-primary)] px-3 text-xs font-semibold text-white transition-colors duration-150 hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FilePdf size={16} weight="regular" aria-hidden="true" />
                <span>Export PDF</span>
              </button>

              <button
                type="button"
                disabled={!data}
                onClick={() => data && downloadCsvReport(data)}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-primary)] transition-colors duration-150 hover:bg-[var(--bg-subtle)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <DownloadSimple size={16} weight="regular" aria-hidden="true" />
                <span>CSV</span>
              </button>

              <button
                type="button"
                disabled={!data}
                onClick={handleCopySummary}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 text-xs font-medium text-[var(--text-primary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copied ? (
                  <>
                    <Check size={16} weight="bold" aria-hidden="true" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <CopySimple size={16} weight="regular" aria-hidden="true" />
                    <span className="hidden sm:inline">Copy Summary</span>
                  </>
                )}
              </button>
            </div>

            <ThemeToggle />
          </div>
        </div>
      </header>

      <main aria-busy={loading} className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <section className="dashboard-hero" aria-label="Performance overview">
          <div>
            <h2>Your progress.<br /><em>A clearer perspective.</em></h2>
            <p>Explore exchange performance, compare products, and take the next step with your team.</p>
          </div>
          <div className="period-label" role="status" aria-live="polite">
            {loading ? "Updating performance…" : "Showing performance for"}
            <strong>{data ? `${data.period.start} — ${data.period.end}` : "Loading selected period"}</strong>
            <span>{data?.office.name || "AIESEC in UNS"}</span>
          </div>
        </section>
        <p className="report-scope">Exports include all products and both streams for the loaded entity and period.</p>
        {/* Print-Only Executive Summary Banner */}
        {data && (
          <div className="print-only hidden rounded-[8px] border border-[var(--border-strong)] bg-[var(--bg-subtle)] p-3 text-xs">
            <div className="flex justify-between font-semibold">
              <span>Executive Performance Brief — {data.office.name} (ID #{data.office.id})</span>
              <span>Period: {data.period.start} to {data.period.end}</span>
            </div>
            {bottleneck && (
              <p className="mt-1 text-[var(--text-secondary)]">
                Lowest Period Step Ratio (heuristic): {bottleneck.label} ({bottleneck.rate.toFixed(1)}%).
              </p>
            )}
          </div>
        )}

        {/* Zone 1: Filter & Command Bar */}
        <section
          aria-label="Dashboard filters"
          className="filter-panel no-print rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
            {/* AIESEC-Native Date Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-medium text-[var(--text-secondary)]">
                Term / Period:
              </span>
              {PRESETS.map((preset) => {
                const isActive = activePreset === preset.key;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => handlePresetClick(preset.key)}
                    className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors duration-150 ${
                      isActive
                        ? "bg-[var(--color-primary)] text-white"
                        : "border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Stream Toggle */}
            <div
              role="group"
              aria-label="Exchange stream filter"
              className="inline-flex rounded-md border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-0.5"
            >
              {(["all", "ogx", "icx"] as StreamFilter[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={stream === item}
                  onClick={() => {
                    setStream(item);
                    setSelectedProduct(null);
                  }}
                  className={`cursor-pointer rounded px-3 py-1 text-xs font-semibold uppercase transition-colors duration-150 ${
                    stream === item
                      ? "bg-[var(--bg-surface)] text-[var(--color-primary)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {item === "all" ? "All" : item}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Range + Flexible Entity Selector (for UNS or higher-permission token) */}
          <form
            onSubmit={handleApplyCustom}
            className="mt-3 flex flex-wrap items-end gap-3"
          >
            <div>
              <label
                htmlFor="start-date"
                className="block text-[11px] font-medium text-[var(--text-secondary)]"
              >
                Start Date
              </label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActivePreset("custom");
                }}
                className="font-mono-num mt-1 h-9 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 text-xs text-[var(--text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="end-date"
                className="block text-[11px] font-medium text-[var(--text-secondary)]"
              >
                End Date
              </label>
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActivePreset("custom");
                }}
                className="font-mono-num mt-1 h-9 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 text-xs text-[var(--text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="entity-select"
                className="block text-[11px] font-medium text-[var(--text-secondary)]"
              >
                Entity / LC Scope
              </label>
              <select
                id="entity-select"
                value={
                  INDONESIA_ENTITIES.some((e) => e.id === officeId)
                    ? String(officeId)
                    : "custom"
                }
                onChange={(e) => {
                  if (e.target.value !== "custom") {
                    handleEntitySelect(Number(e.target.value));
                  }
                }}
                className="mt-1 h-9 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 text-xs text-[var(--text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
              >
                {INDONESIA_ENTITIES.map((ent) => (
                  <option key={ent.id} value={ent.id}>
                    {ent.name} (#{ent.id})
                  </option>
                ))}
                {!INDONESIA_ENTITIES.some((e) => e.id === officeId) && (
                  <option value="custom">Custom Office (#{officeId})</option>
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="custom-office"
                className="block text-[11px] font-medium text-[var(--text-secondary)]"
              >
                Custom Office ID (optional)
              </label>
              <input
                id="custom-office"
                type="number"
                min={1}
                placeholder="e.g. 6 or 1539"
                value={customOfficeInput}
                onChange={(e) => setCustomOfficeInput(e.target.value)}
                className="font-mono-num mt-1 h-9 w-32 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--color-primary)] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md bg-[var(--color-primary)] px-4 text-xs font-semibold text-white transition-colors duration-150 hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
            >
              <ArrowsClockwise
                size={15}
                weight="bold"
                className={loading ? "animate-spin" : ""}
                aria-hidden="true"
              />
              <span>Apply</span>
            </button>
          </form>

          {dateError && (
            <p role="alert" className="mt-2 text-xs font-medium text-[var(--color-primary)]">
              {dateError}
            </p>
          )}
        </section>

        {/* Transparent Snapshot Notice Banner */}
        {data?.source === "snapshot" && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-[8px] border border-[var(--border-strong)] bg-[var(--color-amber-soft)] px-3.5 py-2.5 text-xs text-[var(--color-amber-text)]"
          >
            <Info size={18} weight="regular" className="mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <span className="font-semibold">UNS Baseline Fallback Active:</span>{" "}
              {data.fallbackReason} Showing baseline figures for{" "}
              <span className="font-semibold">{data.office.name} (#{data.office.id})</span>.
              Set a valid server-side{" "}
              <code className="font-mono-num font-semibold">EXPA_ACCESS_TOKEN</code> to pull
              live EXPA performance data.
            </div>
          </div>
        )}

        {/* Error State */}
        {errorMsg && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-[8px] border border-[var(--color-primary)] bg-[var(--color-primary-soft)] px-4 py-3 text-xs text-[var(--color-primary)]"
          >
            <span className="inline-flex items-center gap-2 font-medium">
              <WarningCircle size={18} weight="regular" aria-hidden="true" />
              {errorMsg}
            </span>
            <button
              type="button"
              onClick={() => fetchPerformance(startDate, endDate, officeId)}
              className="cursor-pointer rounded-md border border-[var(--color-primary)] px-2.5 py-1 font-semibold hover:bg-[var(--color-primary)] hover:text-white"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State (fixed-height skeleton preventing CLS) */}
        {loading && !data && (
          <div className="space-y-4" aria-live="polite">
            <p className="text-xs font-medium text-[var(--text-secondary)]">
              Fetching AIESEC performance data for Office #{officeId} ({startDate} to{" "}
              {endDate})...
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {STAGES.map((st) => (
                <div
                  key={st.key}
                  className="h-[104px] rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-subtle)]"
                />
              ))}
            </div>
          </div>
        )}

        {/* Honest Empty State */}
        {!loading && data && isAllZero && (
          <div className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 text-center">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              No recorded {stream === "all" ? "oGX/iCX" : stream.toUpperCase()} activity for{" "}
              {data.office.name} between {data.period.start} and {data.period.end}.
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Try widening the date range or switching back to the full MC Term.
            </p>
            <button
              type="button"
              onClick={() => handlePresetClick("mc_term")}
              className="mt-3 cursor-pointer rounded-md bg-[var(--color-primary)] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-primary-hover)]"
            >
              Switch to MC Term
            </button>
          </div>
        )}

        {/* Zone 2: 7-Stage Horizontal Funnel KPI Strip (SU -> CO) */}
        {data && activeTotals && !isAllZero && (
          <>
            <section aria-label="7-stage funnel summary" className="print-break-avoid">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                {STAGES.map((stage, idx) => {
                  const count = activeTotals[stage.key];
                  const prevStep = idx > 0 ? data.stepConversions[idx - 1] : null;
                  const stepRate = prevStep
                    ? stream === "ogx"
                      ? prevStep.ogxRate
                      : stream === "icx"
                        ? prevStep.icxRate
                        : prevStep.totalRate
                    : null;
                  const isOutcomeAnchor = stage.key === "APD" || stage.key === "CO";

                  return (
                    <div
                      key={stage.key}
                      data-kpi data-outcome={isOutcomeAnchor} className={`kpi-card flex flex-col justify-between rounded-[10px] border p-3.5 ${
                        isOutcomeAnchor
                          ? "border-[var(--border-strong)] bg-[var(--bg-surface)]"
                          : "border-[var(--border-subtle)] bg-[var(--bg-surface)]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[var(--text-secondary)]">
                          {stage.shortLabel}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)]">
                          {stage.label}
                        </span>
                      </div>

                      <div
                        className={`tabular-nums mt-2 text-[26px] font-bold leading-none tracking-tight ${
                          stage.key === "CO"
                            ? "text-[var(--color-accent)]"
                            : stage.key === "APD"
                              ? "text-[var(--color-primary)]"
                              : "text-[var(--text-primary)]"
                        }`}
                      >
                        {stage.key === "SU" && stream === "icx" ? "N/A" : count.toLocaleString()}
                      </div>

                      <div className="mt-2.5 flex items-center justify-between border-t border-[var(--border-subtle)] pt-2 text-[11px]">
                        {stage.key === "SU" ? (
                          <span className="text-[var(--text-muted)]">oGX only</span>
                        ) : (
                          <>
                            <span className="text-[var(--text-muted)]">
                              from {STAGES[idx - 1].shortLabel}
                            </span>
                            <span className="font-mono-num font-semibold text-[var(--text-primary)]">
                              {formatRate(stepRate)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Zone 3: Asymmetric 7:5 Chart & 6-Product Nusantara Scorecard */}
            <ChartsPanel
              data={data}
              stream={stream}
              selectedProduct={selectedProduct}
              onSelectProduct={setSelectedProduct}
            />

            {/* Zone 4: CORE-Style Tabbed Conversion Rates Matrix */}
            <ConversionMatrix data={data} stream={stream} />
          </>
        )}

        {/* Zone 5: Transparent Methodology Footer */}
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-4 text-[11.5px] text-[var(--text-muted)]">
          <p>
            <strong>Methodology note:</strong> Counts reflect period-based activity within the
            selected date range (not a locked cohort), so ratios above 100% can legitimately occur
            in narrow windows when prior-period applications convert.
          </p>
          <p className="font-mono-num">
            {data ? `Synced ${new Date(data.fetchedAt).toLocaleString("en-GB")} · ` : ""}
            AIESEC GIS + Analytics · Server-side integration
          </p>
        </footer>
      </main>
    </div>
  );
}
