import type {
  PublicDistrictList,
  PublicFacilityList,
  PublicGuideEnvelope,
  PublicGuideList,
} from "../types/public";

/** Base for the /api/v1/public seam. In docker the Vite proxy rewrites /api
 * to the API service; local host checks override it to the exposed port. */
const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "/api/v1/public";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`public api ${res.status}`);
  return (await res.json()) as T;
}

export function getPublicGuides(
  filter?: { category?: string; severity?: string }
): Promise<PublicGuideList> {
  const q = new URLSearchParams();
  if (filter?.category) q.set("category", filter.category);
  if (filter?.severity) q.set("severity", filter.severity);
  const qs = q.toString();
  return getJson<PublicGuideList>(`/guides${qs ? `?${qs}` : ""}`);
}

export function getPublicGuide(guideId: string): Promise<PublicGuideEnvelope> {
  return getJson<PublicGuideEnvelope>(`/guides/${encodeURIComponent(guideId)}`);
}

export function getPublicDistricts(): Promise<PublicDistrictList> {
  return getJson<PublicDistrictList>("/districts");
}

export function getPublicFacilities(): Promise<PublicFacilityList> {
  return getJson<PublicFacilityList>("/facilities");
}