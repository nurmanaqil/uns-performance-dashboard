import { NextRequest, NextResponse } from "next/server";
import { getSnapshotPerformance } from "@/data/uns-snapshot";
import { ExpaApiError, fetchExpaPerformance } from "@/lib/expa-graphql";
import { getPresetDateRange, isValidIsoDate } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const defaults = getPresetDateRange("mc_term");

  const start = searchParams.get("start") || defaults.start;
  const end = searchParams.get("end") || defaults.end;
  const defaultOfficeId = Number(process.env.DEFAULT_OFFICE_ID || "6") || 6;
  const officeIdParam = searchParams.get("officeId");
  const officeId = officeIdParam ? Number(officeIdParam) : defaultOfficeId;

  if (!isValidIsoDate(start) || !isValidIsoDate(end)) {
    return NextResponse.json(
      { error: "Invalid date format. Use YYYY-MM-DD for start and end." },
      { status: 400 }
    );
  }

  if (start > end) {
    return NextResponse.json(
      { error: "Start date must be earlier than or equal to end date." },
      { status: 400 }
    );
  }

  if (!Number.isInteger(officeId) || officeId <= 0) {
    return NextResponse.json(
      { error: "Invalid officeId. Must be a positive integer." },
      { status: 400 }
    );
  }

  try {
    const liveData = await fetchExpaPerformance(officeId, start, end);
    return NextResponse.json(liveData, {
      status: 200,
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch (err) {
    const reason =
      err instanceof ExpaApiError
        ? err.message
        : "Unable to reach AIESEC GIS GraphQL API.";

    const snapshot = getSnapshotPerformance(officeId, start, end, reason);
    return NextResponse.json(snapshot, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
