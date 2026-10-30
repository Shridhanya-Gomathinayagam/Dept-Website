const DATE_FMT = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const TIME_FMT = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" });

function parse(value: string): Date {
  // Plain dates (YYYY-MM-DD) are calendar dates; avoid timezone shifts.
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
}

export function formatDate(value?: string | null): string {
  if (!value) return "";
  const d = parse(value);
  return Number.isNaN(d.getTime()) ? "" : DATE_FMT.format(d);
}

export function formatTime(value?: string | null): string {
  if (!value) return "";
  const d = parse(value);
  return Number.isNaN(d.getTime()) ? "" : TIME_FMT.format(d);
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "";
  return `${formatDate(value)}, ${formatTime(value)}`;
}

export function dateParts(value: string): { day: string; month: string; year: string } {
  const d = parse(value);
  return {
    day: String(d.getDate()),
    month: d.toLocaleString("en-IN", { month: "short" }),
    year: String(d.getFullYear()),
  };
}

export function humanize(value?: string | null): string {
  if (!value) return "";
  // Only enum-style codes (e.g. "BOOK_CHAPTER", "ONLINE"); keep short acronyms like "IV", "FDP".
  if (/^[A-Z_]{4,}$/.test(value)) {
    return value
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return value;
}

export function formatLpa(value?: number | null): string {
  if (value === null || value === undefined) return "—";
  return `${Number.isInteger(value) ? value : value.toFixed(1)} LPA`;
}

export function initials(name: string): string {
  return name
    .replace(/^(dr|mr|mrs|ms|prof)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** Cloudinary delivery with automatic format/quality and a target width. */
export function imageUrl(url: string, width?: number): string {
  if (!url.includes("res.cloudinary.com") || !url.includes("/image/upload/")) return url;
  const t = ["f_auto", "q_auto", width ? `w_${width}` : null, width ? "c_limit" : null].filter(Boolean).join(",");
  return url.replace("/image/upload/", `/image/upload/${t}/`);
}

export function isSafeUrl(url?: string | null): url is string {
  return !!url && (/^https?:\/\//i.test(url) || url.startsWith("/media/"));
}
