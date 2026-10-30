import { z } from "zod";
import type { FieldDef } from "./resources";

export type FormValues = Record<string, unknown>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isUrl = (v: string) => /^https?:\/\/[^\s]+\.[^\s]+/i.test(v) || v.startsWith("/media/");

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Client-side validation mirroring the backend rules (the backend re-validates everything). */
export function buildSchema(fields: FieldDef[]) {
  const shape: Record<string, z.ZodTypeAny> = { status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]) };
  for (const f of fields) {
    let s: z.ZodTypeAny;
    switch (f.type) {
      case "checkbox":
        s = z.boolean();
        break;
      case "images":
        s = z.array(z.string().refine(isUrl, "Invalid image URL")).max(20, "At most 20 images");
        break;
      case "number": {
        s = z
          .string()
          .trim()
          .refine((v) => v === "" || !Number.isNaN(Number(v)), "Enter a number")
          .refine((v) => v === "" || f.min === undefined || Number(v) >= f.min, `Must be at least ${f.min}`)
          .refine((v) => v === "" || f.max === undefined || Number(v) <= f.max, `Must be at most ${f.max}`)
          .refine((v) => v === "" || f.step !== undefined || Number.isInteger(Number(v)), "Enter a whole number");
        if (f.required) s = (s as z.ZodString).refine((v) => v !== "", "Required");
        break;
      }
      default: {
        let str = z.string().trim();
        if (f.max) str = str.max(f.max, `Maximum ${f.max} characters`);
        if (f.required) str = str.min(1, "Required");
        const checks: [(v: string) => boolean, string][] = [];
        if (f.type === "email") checks.push([(v) => !v || EMAIL_RE.test(v), "Enter a valid email address"]);
        if (f.type === "url" || f.type === "image" || f.type === "document")
          checks.push([(v) => !v || isUrl(v), "Enter a full URL starting with https://"]);
        if (f.pattern) {
          const { regex, message } = f.pattern;
          checks.push([(v) => !v || regex.test(v), message]);
        }
        s = checks.reduce<z.ZodType<string>>((acc, [fn, msg]) => acc.refine(fn, msg), str);
      }
    }
    shape[f.name] = s;
  }
  return z.object(shape);
}

function toLocalDateTime(iso: string): string {
  // "2026-10-05T10:30:00" -> "2026-10-05T10:30" (datetime-local input value)
  return iso.slice(0, 16);
}

export function toFormValues(fields: FieldDef[], record?: Record<string, unknown> | null): FormValues {
  const values: FormValues = { status: (record?.status as string) ?? "DRAFT" };
  for (const f of fields) {
    const raw = record ? record[f.name] : f.defaultValue === "today" ? todayIso() : f.defaultValue;
    switch (f.type) {
      case "checkbox":
        values[f.name] = Boolean(raw);
        break;
      case "images":
        values[f.name] = Array.isArray(raw) ? raw : [];
        break;
      case "list":
        values[f.name] = Array.isArray(raw) ? raw.join("\n") : ((raw as string) ?? "");
        break;
      case "datetime":
        values[f.name] = raw ? toLocalDateTime(String(raw)) : "";
        break;
      default:
        values[f.name] = raw === null || raw === undefined ? "" : String(raw);
    }
  }
  return values;
}

/** Convert form values to the JSON payload the API expects (blank -> null, numbers, lists). */
export function toPayload(fields: FieldDef[], values: FormValues): Record<string, unknown> {
  const out: Record<string, unknown> = { status: values.status };
  for (const f of fields) {
    const v = values[f.name];
    switch (f.type) {
      case "checkbox":
      case "images":
        out[f.name] = v;
        break;
      case "number":
      case "faculty":
      case "student":
        out[f.name] = v === "" || v === undefined ? null : Number(v);
        break;
      case "list":
        out[f.name] = String(v ?? "")
          .split(/\n|,|;/)
          .map((s) => s.trim())
          .filter(Boolean);
        break;
      case "datetime":
        out[f.name] = v ? `${v}:00` : null;
        break;
      default:
        out[f.name] = typeof v === "string" && v.trim() === "" ? null : v;
    }
  }
  return out;
}
