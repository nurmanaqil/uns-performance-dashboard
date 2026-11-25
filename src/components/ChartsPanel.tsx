"use client";

import { useState, type CSSProperties } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { calcRate, formatRate } from "@/lib/metrics";
import {
  STAGES,
  type PerformancePayload,
  type ProductCode,
  type StreamFilter,
} from "@/lib/types";

interface ChartsPanelProps {
  data: PerformancePayload;
  stream: StreamFilter;
  selectedProduct: ProductCode | null;
  onSelectProduct: (code: ProductCode | null) => void;
}

export function ChartsPanel({
  data,
  stream,
  selectedProduct,
  onSelectProduct,
}: ChartsPanelProps) {
  const [chartMode, setChartMode] = useState<"funnel" | "product">("funnel");

  const activeProduct = selectedProduct
    ? data.products.find((p) => p.code === selectedProduct) ?? null
    : null;

  const funnelChartData = STAGES.map(({ key, shortLabel }) => {
    if (activeProduct) {
      return {
        stage: shortLabel,
        [activeProduct.code]:
          activeProduct.stream === "icx" && key === "SU" ? 0 : activeProduct.counts[key],
      };
    }
    return {
      stage: shortLabel,
      oGX: data.totals.ogx[key],
      iCX: key === "SU" ? 0 : data.totals.icx[key],
    };
  });

  const visibleProducts = data.products.filter(
    (p) => stream === "all" || p.stream === stream
  );

  const productChartData = visibleProducts.map((p) => ({
    product: p.code,
    Approvals: p.counts.APD,
    Realizations: p.counts.RE,
    Completions: p.counts.CO,
  }));

  return (
    <section data-reveal className="grid grid-cols-1 gap-6 lg:grid-cols-12 print-break-avoid">
      {/* Left 7 columns: Question-driven interactive chart */}
      <div className="analytics-panel rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5 lg:col-span-7">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold leading-snug text-[var(--text-primary)]">
              {chartMode === "funnel"
                ? activeProduct
                  ? `${activeProduct.code} performance, from SU to CO`
                  : "Exchange performance, from SU to CO"
                : "Which exchange products drive the most Approvals, Realizations & Completions?"}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              {activeProduct
                ? `Filtered to ${activeProduct.label} (${activeProduct.code}). Click tile again to reset.`
                : "Sign-Ups (SU) apply to oGX only; iCX funnel starts at Applicants (APP)."}
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Chart view"
            className="no-print inline-flex rounded-md border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-0.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={chartMode === "funnel"}
              onClick={() => setChartMode("funnel")}
              className={`cursor-pointer rounded px-2.5 py-1 text-xs font-medium transition-colors duration-150 ${
                chartMode === "funnel"
                  ? "bg-[var(--bg-surface)] text-[var(--color-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Funnel SU–CO
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={chartMode === "product"}
              onClick={() => setChartMode("product")}
              className={`cursor-pointer rounded px-2.5 py-1 text-xs font-medium transition-colors duration-150 ${
                chartMode === "product"
                  ? "bg-[var(--bg-surface)] text-[var(--color-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              APD vs RE vs CO
            </button>
          </div>
        </div>

        <div className="h-[290px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartMode === "funnel" ? (
              <BarChart data={funnelChartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis
                  dataKey="stage"
                  tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                  axisLine={{ stroke: "var(--border-subtle)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--border-strong)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "var(--text-primary)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                {activeProduct && <Bar isAnimationActive={false} dataKey={activeProduct.code} fill={activeProduct.color} radius={[4,4,0,0]} maxBarSize={42} />}
                {!activeProduct && (stream === "all" || stream === "ogx") && <Bar isAnimationActive={false} dataKey="oGX" fill="#bf0820" radius={[4,4,0,0]} maxBarSize={28} />}
                {!activeProduct && (stream === "all" || stream === "icx") && <Bar isAnimationActive={false} dataKey="iCX" fill="#0cb9c1" radius={[4,4,0,0]} maxBarSize={28} />}
              </BarChart>
            ) : (
              <BarChart data={productChartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis
                  dataKey="product"
                  tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                  axisLine={{ stroke: "var(--border-subtle)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--border-strong)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "var(--text-primary)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                <Bar isAnimationActive={false} dataKey="Approvals" fill="#bf0820" radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Bar isAnimationActive={false} dataKey="Realizations" fill="#f48924" radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Bar isAnimationActive={false} dataKey="Completions" fill="#216b55" radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Right 5 columns: 6-Product Nusantara Scorecard (adapted from CORE MC Analytics tiles) */}
      <div className="analytics-panel rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-5 lg:col-span-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
              6-Product Scorecard
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Click a product tile to isolate its funnel
            </p>
          </div>
          {selectedProduct && (
            <button
              type="button"
              onClick={() => onSelectProduct(null)}
              className="no-print cursor-pointer rounded-md border border-[var(--border-strong)] px-2 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
            >
              Reset
            </button>
          )}
        </div>

        <div className="product-grid grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-2">
          {visibleProducts.map((product) => {
            const isSelected = selectedProduct === product.code;
            const rePerApd = calcRate(product.counts.RE, product.counts.APD);
            return (
              <button
                key={product.code}
                type="button"
                aria-pressed={isSelected}
                onClick={() =>
                  onSelectProduct(isSelected ? null : product.code)
                }
                style={{ "--product-accent": product.color } as CSSProperties}
                className={`product-tile group flex cursor-pointer flex-col rounded-[8px] border p-3 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${
                  isSelected
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                    : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] hover:border-[var(--border-strong)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--text-primary)]">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: product.color }}
                      aria-hidden="true"
                    />
                    {product.code}
                  </span>
                  <span className="font-mono-num text-[11px] font-medium uppercase text-[var(--text-muted)]">
                    {product.stream}
                  </span>
                </div>

                <div className="mt-2.5 grid grid-cols-3 gap-1 border-t border-[var(--border-subtle)] pt-2">
                  <div>
                    <div className="text-[10px] font-medium text-[var(--text-muted)]">APD</div>
                    <div className="tabular-nums text-sm font-bold text-[var(--text-primary)]">
                      {product.counts.APD}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-medium text-[var(--text-muted)]">RE</div>
                    <div className="tabular-nums text-sm font-bold text-[var(--text-primary)]">
                      {product.counts.RE}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-medium text-[var(--text-muted)]">CO</div>
                    <div className="tabular-nums text-sm font-bold text-[var(--color-accent)]">
                      {product.counts.CO}
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                  <span>RE / APD</span>
                  <span className="font-mono-num font-medium">{formatRate(rePerApd)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
