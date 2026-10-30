"use client";

// Browser-side API client for the admin dashboard. Same-origin (/api/v1 is proxied to FastAPI),
// HTTP-only auth cookie is sent automatically; the CSRF token cookie is mirrored into a header.

export class ClientApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fieldErrors: Record<string, string> = {},
  ) {
    super(message);
  }
}

function csrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

async function parseError(res: Response, path = ""): Promise<ClientApiError> {
  let message = "Something went wrong. Please try again.";
  const fieldErrors: Record<string, string> = {};
  try {
    const body = await res.json();
    if (typeof body.detail === "string") message = body.detail;
    if (Array.isArray(body.errors)) {
      for (const e of body.errors) if (e.field) fieldErrors[e.field.split(".")[0]] = e.message;
      const general = body.errors.find((e: { field: string }) => !e.field);
      if (general) message = general.message;
    }
  } catch {
    /* non-JSON error */
  }
  if (res.status === 401 && !path.startsWith("/auth/login")) message = "Your session has expired. Please sign in again.";
  if (res.status === 403 && message.startsWith("CSRF")) message = "Security check failed. Please reload the page.";
  return new ClientApiError(res.status, message, fieldErrors);
}

export async function api<T = unknown>(
  path: string,
  init: { method?: string; body?: unknown; form?: FormData; signal?: AbortSignal } = {},
): Promise<T> {
  const method = init.method ?? (init.body !== undefined || init.form ? "POST" : "GET");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (method !== "GET") headers["X-CSRF-Token"] = csrfToken();
  let body: BodyInit | undefined;
  if (init.form) body = init.form;
  else if (init.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.body);
  }
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, { method, headers, body, credentials: "same-origin", signal: init.signal });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ClientApiError(0, "Cannot reach the server. Check your connection.");
  }
  if (!res.ok) {
    const err = await parseError(res, path);
    if (res.status === 401 && !path.startsWith("/auth/login") && typeof window !== "undefined") {
      window.location.href = `/admin/login?next=${encodeURIComponent(window.location.pathname)}`;
    }
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Download a file (e.g. Excel) from an authenticated endpoint. */
export async function download(path: string, fallbackName: string): Promise<void> {
  const res = await fetch(`/api/v1${path}`, { credentials: "same-origin" });
  if (!res.ok) throw await parseError(res);
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") ?? "";
  const name = /filename="?([^"]+)"?/.exec(cd)?.[1] ?? fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function toQuery(params: Record<string, string | number | undefined | null>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  const s = qs.toString();
  return s ? `?${s}` : "";
}
