import { findPrimaryBottleneck, formatRate } from "@/lib/metrics";
import { STAGES, type PerformancePayload } from "@/lib/types";

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsvContent(data: PerformancePayload): string {
  const lines: string[] = [];

  lines.push(["AIESEC Performance Report", data.office.name].map(escapeCsvCell).join(","));
  lines.push(["Office ID", data.office.id].map(escapeCsvCell).join(","));
  lines.push(["Period", `${data.period.start} to ${data.period.end}`].map(escapeCsvCell).join(","));
  lines.push(["Export Scope", "All products & both streams (oGX + iCX)"].map(escapeCsvCell).join(","));
  lines.push([
    "Data Source",
    data.source === "live"
      ? "Live AIESEC Analytics API + GIS GraphQL (office metadata)"
      : "Estimated Fallback (UNS MC26 baseline)",
  ].map(escapeCsvCell).join(","));
  lines.push(["Generated At", data.fetchedAt].map(escapeCsvCell).join(","));
  lines.push("");

  lines.push(["Section 1: Funnel Counts (SU - CO)"].join(","));
  lines.push(["Stream / Product", ...STAGES.map((s) => s.shortLabel)].join(","));
  lines.push(
    ["Total (All)", ...STAGES.map((s) => data.totals.all[s.key])].map(escapeCsvCell).join(",")
  );
  lines.push(
    ["oGX Total", ...STAGES.map((s) => data.totals.ogx[s.key])].map(escapeCsvCell).join(",")
  );
  lines.push(
    [
      "iCX Total",
      ...STAGES.map((s) => (s.key === "SU" ? "N/A" : data.totals.icx[s.key])),
    ]
      .map(escapeCsvCell)
      .join(",")
  );

  for (const p of data.products) {
    lines.push(
      [
        p.code,
        ...STAGES.map((s) => (p.stream === "icx" && s.key === "SU" ? "N/A" : p.counts[s.key])),
      ]
        .map(escapeCsvCell)
        .join(",")
    );
  }

  lines.push("");
  lines.push(["Section 2: Step-by-Step Conversion Rates"].join(","));
  lines.push(["Transition", "oGX Rate", "iCX Rate", "Combined Rate"].join(","));
  for (const step of data.stepConversions) {
    lines.push(
      [
        step.label,
        formatRate(step.ogxRate),
        formatRate(step.icxRate),
        formatRate(step.totalRate),
      ]
        .map(escapeCsvCell)
        .join(",")
    );
  }

  // UTF-8 BOM ensures Excel opens Indonesian/UTF-8 characters cleanly
  return "\uFEFF" + lines.join("\r\n");
}

export function downloadCsvReport(data: PerformancePayload): void {
  const csv = buildCsvContent(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const slug = data.office.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  a.href = url;
  a.download = `${slug}-performance-${data.period.start}_to_${data.period.end}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function buildLcSummaryText(data: PerformancePayload): string {
  const { all, ogx, icx } = data.totals;
  const bottleneck = findPrimaryBottleneck(data.stepConversions);
  const modeLabel =
    data.source === "live"
      ? "Live AIESEC Analytics API + GIS GraphQL (office metadata)"
      : "Estimated Fallback (UNS MC26 baseline — EXPA token unavailable)";

  const lines = [
    `[${data.office.name} | Performance Summary]`,
    `Period: ${data.period.start} to ${data.period.end}`,
    `Scope: All products & both streams (oGX + iCX)`,
    `Source: ${modeLabel}`,
    "",
    `Funnel (Total | oGX / iCX):`,
    `- SU: ${all.SU} (oGX only)`,
    `- APP: ${all.APP} (${ogx.APP} / ${icx.APP})`,
    `- ACC: ${all.ACC} (${ogx.ACC} / ${icx.ACC})`,
    `- APD: ${all.APD} (${ogx.APD} / ${icx.APD})`,
    `- RE: ${all.RE} (${ogx.RE} / ${icx.RE})`,
    `- FI: ${all.FI} (${ogx.FI} / ${icx.FI})`,
    `- CO: ${all.CO} (${ogx.CO} / ${icx.CO})`,
    "",
    `Key Conversions:`,
    ...data.stepConversions.map(
      (s) => `- ${s.label}: ${formatRate(s.totalRate)} (oGX ${formatRate(s.ogxRate)} | iCX ${formatRate(s.icxRate)})`
    ),
  ];

  if (bottleneck) {
    lines.push("", `Lowest Step Ratio (period heuristic): ${bottleneck.label} (${bottleneck.rate.toFixed(1)}%)`);
  }

  return lines.join("\n");
}
