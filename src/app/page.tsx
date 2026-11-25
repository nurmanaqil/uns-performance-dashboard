import { PerformanceDashboard } from "@/components/PerformanceDashboard";

export default function HomePage() {
  const defaultOfficeId = Number(process.env.DEFAULT_OFFICE_ID || "6") || 6;
  return <PerformanceDashboard defaultOfficeId={defaultOfficeId} />;
}
