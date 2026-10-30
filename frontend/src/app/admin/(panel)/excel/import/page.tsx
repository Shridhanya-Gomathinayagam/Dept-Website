"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { api, ClientApiError, download } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { useAdmin } from "@/components/admin/admin-context";
import { inputCls } from "@/components/admin/fields";

interface Entity {
  entity: string;
  label: string;
  resource: string;
  columns: string[];
}
interface PreviewRow {
  row: number;
  action: "new" | "update" | "unchanged" | "invalid" | "duplicate";
  label: string;
  errors: string[];
  changes: string[];
}
interface Preview {
  import_id: number;
  filename: string;
  summary: Record<"new" | "update" | "unchanged" | "invalid" | "duplicate" | "total", number>;
  warnings: string[];
  rows: PreviewRow[];
}

const ACTIONS: { key: PreviewRow["action"]; label: string; cls: string }[] = [
  { key: "new", label: "New records", cls: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  { key: "update", label: "Updated records", cls: "bg-blue-50 text-blue-800 ring-blue-200" },
  { key: "unchanged", label: "Unchanged", cls: "bg-slate-50 text-slate-700 ring-slate-200" },
  { key: "invalid", label: "Invalid", cls: "bg-red-50 text-red-800 ring-red-200" },
  { key: "duplicate", label: "Duplicates in file", cls: "bg-amber-50 text-amber-800 ring-amber-200" },
];

function ImportInner() {
  const sp = useSearchParams();
  const { confirm } = useAdmin();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [entity, setEntity] = useState(sp.get("entity") ?? "");
  const [defaultStatus, setDefaultStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [filter, setFilter] = useState<PreviewRow["action"] | "all">("all");
  const [busy, setBusy] = useState<"preview" | "commit" | null>(null);
  const [result, setResult] = useState<{ created: number; updated: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<Entity[]>("/admin/excel/entities").then((list) => {
      setEntities(list);
      setEntity((e) => e || list[0]?.entity || "");
    });
  }, []);

  const current = entities.find((e) => e.entity === entity);

  async function runPreview() {
    if (!file || !entity) return;
    setBusy("preview");
    setPreview(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("default_status", defaultStatus);
      setPreview(await api<Preview>(`/admin/excel/${entity}/preview`, { form }));
    } catch (e) {
      toast.error(e instanceof ClientApiError ? e.message : "Could not read the file");
    } finally {
      setBusy(null);
    }
  }

  async function commit() {
    if (!preview) return;
    const { new: n, update: u } = preview.summary;
    const ok = await confirm({
      title: "Apply this import?",
      description: `${n} new record(s) will be created and ${u} existing record(s) updated. Invalid, duplicate and unchanged rows are skipped.`,
      confirmLabel: "Apply changes",
    });
    if (!ok) return;
    setBusy("commit");
    try {
      const r = await api<{ created: number; updated: number }>(`/admin/excel/imports/${preview.import_id}/commit`, { method: "POST" });
      setResult(r);
      setPreview(null);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Import applied");
    } catch (e) {
      toast.error(e instanceof ClientApiError ? e.message : "Import failed. No changes were made.");
    } finally {
      setBusy(null);
    }
  }

  const rows = preview?.rows.filter((r) => filter === "all" || r.action === filter) ?? [];
  const canCommit = preview && preview.summary.new + preview.summary.update > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Excel import</h1>
          <p className="text-sm text-muted-foreground">Upload → review the preview → confirm. Nothing changes until you confirm.</p>
        </div>
        <Link href="/admin/excel/export" className="text-sm text-primary hover:underline">Go to export →</Link>
      </div>

      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <ol className="grid gap-5 md:grid-cols-3">
          <li>
            <label htmlFor="entity" className="mb-1.5 block text-sm font-medium">1. What are you importing?</label>
            <select id="entity" value={entity} onChange={(e) => { setEntity(e.target.value); setPreview(null); }} className={inputCls}>
              {entities.map((e) => (
                <option key={e.entity} value={e.entity}>{e.label}</option>
              ))}
            </select>
            {current && (
              <button type="button" onClick={() => download(`/admin/excel/templates/${entity}`, `${entity}.xlsx`).catch(() => toast.error("Download failed"))} className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                <Download className="size-4" aria-hidden /> Download {entity}.xlsx template
              </button>
            )}
          </li>
          <li>
            <label htmlFor="file" className="mb-1.5 block text-sm font-medium">2. Choose the completed .xlsx file</label>
            <input id="file" ref={fileRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); }} className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-2 file:text-sm hover:file:bg-muted" />
            <p className="mt-1 text-xs text-muted-foreground">Max 10 MB, 5,000 rows. The first sheet is read.</p>
          </li>
          <li>
            <label htmlFor="default-status" className="mb-1.5 block text-sm font-medium">3. New records should be</label>
            <select id="default-status" value={defaultStatus} onChange={(e) => setDefaultStatus(e.target.value as "DRAFT" | "PUBLISHED")} className={inputCls}>
              <option value="DRAFT">Drafts (review before publishing)</option>
              <option value="PUBLISHED">Published immediately</option>
            </select>
            <p className="mt-1 text-xs text-muted-foreground">A “Status” column in the sheet overrides this.</p>
          </li>
        </ol>
        <button type="button" onClick={runPreview} disabled={!file || !entity || !!busy} className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-cta px-5 text-sm font-medium text-cta-foreground hover:bg-cta-hover hover:text-cta-hover-foreground disabled:opacity-50">
          {busy === "preview" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />} Validate & preview
        </button>
      </section>

      {result && (
        <div role="status" className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <CheckCircle2 className="size-5" aria-hidden />
          <p>Import complete: {result.created} created, {result.updated} updated.{" "}
            {current && <Link href={`/admin/${current.resource}`} className="font-medium underline">View records</Link>}
          </p>
        </div>
      )}

      {preview && (
        <section className="space-y-4 rounded-lg border bg-card p-5 shadow-sm" aria-labelledby="preview-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="preview-heading" className="flex items-center gap-2 text-lg font-semibold">
              <FileSpreadsheet className="size-5 text-primary" aria-hidden /> Preview of {preview.filename} ({preview.summary.total} rows)
            </h2>
            <button type="button" onClick={commit} disabled={!canCommit || !!busy} className="inline-flex h-10 items-center gap-2 rounded-md bg-cta px-5 text-sm font-medium text-cta-foreground hover:bg-cta-hover hover:text-cta-hover-foreground disabled:opacity-50">
              {busy === "commit" && <Loader2 className="size-4 animate-spin" aria-hidden />} Confirm & apply {preview.summary.new + preview.summary.update} change(s)
            </button>
          </div>
          {preview.warnings.map((w) => (
            <p key={w} className="text-sm text-amber-800">⚠ {w}</p>
          ))}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter preview rows">
            <button type="button" onClick={() => setFilter("all")} aria-pressed={filter === "all"} className={cn("rounded-full px-3 py-1 text-sm ring-1 ring-border", filter === "all" && "bg-primary text-primary-foreground ring-primary")}>
              All {preview.summary.total}
            </button>
            {ACTIONS.map((a) => (
              <button key={a.key} type="button" onClick={() => setFilter(a.key)} aria-pressed={filter === a.key} className={cn("rounded-full px-3 py-1 text-sm ring-1", a.cls, filter === a.key && "ring-2 ring-primary")}>
                {a.label}: {preview.summary[a.key]}
              </button>
            ))}
          </div>
          <div className="max-h-[480px] overflow-auto rounded-md border">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="sticky top-0 bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2">Row</th>
                  <th scope="col" className="px-3 py-2">Record</th>
                  <th scope="col" className="px-3 py-2">Result</th>
                  <th scope="col" className="px-3 py-2">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => {
                  const meta = ACTIONS.find((a) => a.key === r.action)!;
                  return (
                    <tr key={r.row}>
                      <td className="px-3 py-2 text-muted-foreground">{r.row}</td>
                      <td className="px-3 py-2 font-medium">{r.label}</td>
                      <td className="px-3 py-2">
                        <span className={cn("rounded-full px-2 py-0.5 text-xs ring-1", meta.cls)}>{meta.label.replace(" records", "")}</span>
                      </td>
                      <td className="px-3 py-2">
                        {r.errors.length > 0 && <ul className="list-disc pl-4 text-destructive">{r.errors.map((e) => <li key={e}>{e}</li>)}</ul>}
                        {r.changes.length > 0 && <span className="text-muted-foreground">Changed: {r.changes.join(", ")}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

export default function ImportPage() {
  return (
    <Suspense>
      <ImportInner />
    </Suspense>
  );
}
