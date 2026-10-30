import "server-only";

// Server-side API access for public pages. Uses the internal backend URL.
const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Params = Record<string, string | number | boolean | undefined | null | string[]>;

export function toQuery(params: Params = {}): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    qs.set(k, Array.isArray(v) ? (v[0] ?? "") : String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

/**
 * Content is fetched fresh on every request so admin changes are visible immediately
 * (the API is local and fast). Pass `revalidate` (seconds) for rarely-changing data.
 */
export async function apiGet<T>(path: string, params?: Params, revalidate?: number): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1${path}${toQuery(params)}`, {
      ...(revalidate ? { next: { revalidate } } : { cache: "no-store" as const }),
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new ApiError(503, "The department server is unreachable.");
  }
  if (!res.ok) {
    throw new ApiError(res.status, res.status === 404 ? "Not found" : "Request failed");
  }
  return res.json() as Promise<T>;
}

/** Like apiGet but returns null on 404 (for optional content and detail pages). */
export async function apiGetOrNull<T>(path: string, params?: Params): Promise<T | null> {
  try {
    return await apiGet<T>(path, params);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 422)) return null;
    throw e;
  }
}

/** Pick only the given keys from Next.js searchParams (as plain strings). */
export function pickParams(
  sp: Record<string, string | string[] | undefined>,
  keys: string[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = sp[k];
    const s = Array.isArray(v) ? v[0] : v;
    if (s) out[k] = s.slice(0, 120);
  }
  return out;
}
