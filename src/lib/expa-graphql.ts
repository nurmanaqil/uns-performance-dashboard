import { resolveEntity } from "@/lib/entities";
import { aggregateProducts, buildStepConversions } from "@/lib/metrics";
import {
  PRODUCT_META,
  type EntityOption,
  type PerformancePayload,
  type ProductCode,
  type ProductMetrics,
  type StageCounts,
} from "@/lib/types";

interface AnalyticsBucket {
  doc_count?: number;
  applicants?: { value?: number };
}

interface AnalyticsApiResponse {
  response?: Record<string, AnalyticsBucket | unknown>;
  [key: string]: unknown;
}

interface CommitteeGraphQLResponse {
  data?: {
    committee?: {
      id: string;
      name: string;
      tag?: string;
    } | null;
  };
}

export class ExpaApiError extends Error {
  constructor(
    message: string,
    public readonly code: "missing_token" | "auth_error" | "graphql_error" | "network_error"
  ) {
    super(message);
    this.name = "ExpaApiError";
  }
}

const CACHE_TTL_MS = 60_000;
const MAX_CACHE_ENTRIES = 100;
const responseCache = new Map<string, { expiresAt: number; payload: PerformancePayload }>();
const inflightRequests = new Map<string, Promise<PerformancePayload>>();

function readDocCount(
  raw: Record<string, AnalyticsBucket | unknown>,
  key: string
): number {
  const bucket = raw[key] as AnalyticsBucket | undefined;
  return typeof bucket?.doc_count === "number" ? bucket.doc_count : 0;
}

function readApplicantsCount(
  raw: Record<string, AnalyticsBucket | unknown>,
  key: string
): number {
  const bucket = raw[key] as AnalyticsBucket | undefined;
  if (typeof bucket?.applicants?.value === "number") {
    return bucket.applicants.value;
  }
  return typeof bucket?.doc_count === "number" ? bucket.doc_count : 0;
}

/** Resolves live official office name & type via GIS GraphQL (supports any Office ID). */
async function resolveLiveEntityViaGraphQL(
  graphqlEndpoint: string,
  token: string,
  officeId: number
): Promise<EntityOption> {
  const fallback = resolveEntity(officeId);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    const res = await fetch(graphqlEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({
        query: `query OfficeMeta($id: ID!) { committee(id: $id) { id name tag } }`,
        variables: { id: String(officeId) },
      }),
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return fallback;
    const json = (await res.json()) as CommitteeGraphQLResponse;
    const c = json.data?.committee;
    if (!c?.name) return fallback;
    return {
      id: officeId,
      name: c.name.startsWith("AIESEC") ? c.name : `AIESEC in ${c.name}`,
      type: c.tag?.toUpperCase() === "MC" ? "MC" : fallback.type,
      parentMcId: fallback.parentMcId,
    };
  } catch {
    return fallback;
  }
}

async function fetchExpaPerformanceUncached(
  officeId: number,
  start: string,
  end: string
): Promise<PerformancePayload> {
  const token = process.env.EXPA_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new ExpaApiError(
      "EXPA_ACCESS_TOKEN is not configured on the server yet.",
      "missing_token"
    );
  }

  const graphqlEndpoint =
    process.env.EXPA_GRAPHQL_URL?.trim() || "https://gis-api.aiesec.org/graphql";
  const analyticsBase =
    process.env.EXPA_ANALYTICS_URL?.trim() ||
    "https://analytics.api.aiesec.org/v2/applications/analyze.json";

  const analyticsUrl = new URL(analyticsBase);
  analyticsUrl.searchParams.set("access_token", token);
  analyticsUrl.searchParams.set("start_date", start);
  analyticsUrl.searchParams.set("end_date", end);
  analyticsUrl.searchParams.set("performance_v3[office_id]", String(officeId));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  let analyticsRes: Response;
  let entity: EntityOption;
  try {
    [analyticsRes, entity] = await Promise.all([
      fetch(analyticsUrl.toString(), {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      }),
      resolveLiveEntityViaGraphQL(graphqlEndpoint, token, officeId),
    ]);
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "AbortError";
    throw new ExpaApiError(
      isTimeout
        ? "AIESEC Analytics API timed out after 20 seconds."
        : err instanceof Error
          ? err.message
          : "Network error reaching AIESEC API.",
      "network_error"
    );
  } finally {
    clearTimeout(timeout);
  }

  if (analyticsRes.status === 401 || analyticsRes.status === 403) {
    throw new ExpaApiError(
      `EXPA token rejected (HTTP ${analyticsRes.status}). Temporary EXPA tokens expire after ~2 hours or lack access to Office #${officeId}.`,
      "auth_error"
    );
  }

  if (!analyticsRes.ok) {
    throw new ExpaApiError(
      `AIESEC Analytics API returned HTTP ${analyticsRes.status}.`,
      "network_error"
    );
  }

  const json = (await analyticsRes.json()) as AnalyticsApiResponse;
  const raw = (json.response ?? json) as Record<string, AnalyticsBucket | unknown>;

  const products: ProductMetrics[] = (Object.keys(PRODUCT_META) as ProductCode[]).map(
    (code) => {
      const meta = PRODUCT_META[code];
      const prefix = meta.stream === "ogx" ? "o" : "i";
      const pid = meta.programmeId;

      const counts: StageCounts = {
        SU: meta.stream === "ogx" ? readDocCount(raw, `open_o_programme_${pid}`) : 0,
        APP: readApplicantsCount(raw, `${prefix}_applied_${pid}`),
        ACC: readDocCount(raw, `${prefix}_matched_${pid}`),
        APD: readDocCount(raw, `${prefix}_approved_${pid}`),
        RE: readDocCount(raw, `${prefix}_realized_${pid}`),
        FI: readDocCount(raw, `${prefix}_finished_${pid}`),
        CO: readDocCount(raw, `${prefix}_completed_${pid}`),
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

  // EXPA open_ogx includes sign-ups who have not selected a specific programme yet
  const totalOpenOgx = readDocCount(raw, "open_ogx");
  if (totalOpenOgx > totals.ogx.SU) {
    totals.ogx.SU = totalOpenOgx;
    totals.all.SU = totalOpenOgx;
  }

  const stepConversions = buildStepConversions(totals);

  return {
    office: entity,
    period: { start, end },
    source: "live",
    fetchedAt: new Date().toISOString(),
    totals,
    products,
    stepConversions,
  };
}

export async function fetchExpaPerformance(
  officeId: number,
  start: string,
  end: string
): Promise<PerformancePayload> {
  const token = process.env.EXPA_ACCESS_TOKEN?.trim() || "";
  const cacheKey = `${officeId}|${start}|${end}|${token.slice(-6)}`;

  const cached = responseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }

  const inflight = inflightRequests.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  const promise = fetchExpaPerformanceUncached(officeId, start, end)
    .then((payload) => {
      if (responseCache.size >= MAX_CACHE_ENTRIES) {
        const now = Date.now();
        for (const [k, v] of responseCache) {
          if (v.expiresAt <= now) responseCache.delete(k);
        }
        if (responseCache.size >= MAX_CACHE_ENTRIES) responseCache.clear();
      }
      responseCache.set(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        payload,
      });
      return payload;
    })
    .finally(() => {
      inflightRequests.delete(cacheKey);
    });

  inflightRequests.set(cacheKey, promise);
  return promise;
}
