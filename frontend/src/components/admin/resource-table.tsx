"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Archive, ArchiveRestore, Check, ChevronLeft, ChevronRight, EyeOff, FileSpreadsheet, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, ClientApiError, toQuery } from "@/lib/client-api";
import type { Column, ResourceConfig } from "@/lib/admin/resources";
import { formatDate, formatDateTime, formatLpa, humanize, imageUrl, isSafeUrl } from "@/lib/format";
import type { Page } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAdmin } from "./admin-context";
import { inputCls } from "./fields";
import { StatusBadge } from "./status-badge";

type Row = Record<string, unknown> & { id: number; status: string };

const STATUS_TABS = [
  { value: "", label: "Active" },
  { value: "PUBLISHED", label: "Published" },
  { value: "DRAFT", label: "Drafts" },
  { value: "ARCHIVED", label: "Archived" },
  { value: "ALL", label: "All" },
];

function Cell({ row, col }: { row: Row; col: Column }) {
  const v = row[col.field];
  switch (col.render) {
    case "status":
      return <StatusBadge status={String(v)} />;
    case "date":
      return <>{formatDate(v as string) || "—"}</>;
    case "datetime":
      return <>{formatDateTime(v as string) || "—"}</>;
    case "lpa":
      return <>{formatLpa(v as number | null)}</>;
    case "bool":
      return v ? <Check className="size-4 text-emerald-700" aria-label="Yes" /> : <span className="text-muted-foreground">—</span>;
    case "ref":
      return <>{(v as { name?: string } | null)?.name ?? "—"}</>;
    case "image":
      return isSafeUrl(v as string) ? (
        <img src={imageUrl(v as string, 80)} alt="" className="size-10 rounded object-cover" loading="lazy" />
      ) : (
        <span className="block size-10 rounded bg-muted" aria-hidden />
      );
    default:
      if (v === null || v === undefined || v === "") return <span className="text-muted-foreground">—</span>;
      return <>{humanize(String(v))}</>;
  }
}

export function ResourceTable({ cfg }: { cfg: ResourceConfig }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { options, confirm } = useAdmin();
  const [data, setData] = useState<Page<Row> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState(sp.get("q") ?? "");

  const params: Record<string, string> = {};
  sp.forEach((v, k) => (params[k] = v));
  const page = Number(params.page ?? 1);
  const queryString = toQuery({ ...params, page_size: 20 });

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await api<Page<Row>>(`/admin/${cfg.key}${queryString}`));
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Could not load records.");
    }
  }, [cfg.key, queryString]);

  useEffect(() => {
    load();
  }, [load]);

  function setParams(next: Record<string, string | undefined>) {
    const merged: Record<string, string | undefined> = { ...params, ...next };
    if (!("page" in next)) delete merged.page;
    router.push(`${pathname}${toQuery(merged)}`);
  }

  async function bulk(action: "publish" | "draft" | "archive" | "restore" | "delete", ids: number[]) {
    if (!ids.length) return;
    const n = ids.length === 1 ? `this ${cfg.singular.toLowerCase()}` : `${ids.length} records`;
    if (action === "delete") {
      const ok = await confirm({
        title: `Permanently delete ${n}?`,
        description: "This cannot be undone. Archiving keeps the record but hides it from the website; consider archiving instead.",
        confirmLabel: "Delete permanently",
        destructive: true,
      });
      if (!ok) return;
    }
    if (action === "archive") {
      const ok = await confirm({ title: `Archive ${n}?`, description: "Archived records are hidden from the website. You can restore them later.", confirmLabel: "Archive" });
      if (!ok) return;
    }
    setBusy(true);
    try {
      await api(`/admin/${cfg.key}/bulk`, { body: { ids, action, confirm: action === "delete" } });
      toast.success(
        { publish: "Published", draft: "Moved to drafts", archive: "Archived", restore: "Restored as draft", delete: "Deleted" }[action],
      );
      await load();
    } catch (e) {
      toast.error(e instanceof ClientApiError ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  const items = data?.items ?? [];
  const allChecked = items.length > 0 && items.every((r) => selected.has(r.id));
  const status = params.status ?? "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">{cfg.label}</h1>
          {data && <p className="text-sm text-muted-foreground">{data.total} records</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {cfg.excelEntity && (
            <Link href={`/admin/excel/import?entity=${cfg.excelEntity}`} className="inline-flex h-10 items-center gap-1.5 rounded-md border bg-background px-3 text-sm hover:bg-muted">
              <FileSpreadsheet className="size-4" aria-hidden /> Import / Export
            </Link>
          )}
          <Link href={`/admin/${cfg.key}/new`} className="inline-flex h-10 items-center gap-1.5 rounded-md bg-cta px-4 text-sm font-medium text-cta-foreground hover:bg-cta-hover hover:text-cta-hover-foreground">
            <Plus className="size-4" aria-hidden /> Add {cfg.singular.toLowerCase()}
          </Link>
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <div className="flex flex-wrap gap-1 border-b px-3 pt-3" role="tablist" aria-label="Filter by status">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={status === t.value}
              onClick={() => setParams({ status: t.value || undefined })}
              className={cn("-mb-px border-b-2 px-3 py-2 text-sm", status === t.value ? "border-primary font-medium text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3 p-3">
          <form
            role="search"
            className="relative min-w-56 flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              setParams({ q: q || undefined });
            }}
          >
            <label htmlFor="admin-search" className="sr-only">Search {cfg.label}</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input id="admin-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={cfg.searchPlaceholder ?? "Search…"} className={cn(inputCls, "pl-9")} />
          </form>
          {cfg.filters?.map((f) => {
            const opts = f.options ?? (f.optionsKey ? options[f.optionsKey] : []) ?? [];
            return (
              <div key={f.name}>
                <label htmlFor={`flt-${f.name}`} className="sr-only">{f.label}</label>
                <select id={`flt-${f.name}`} value={params[f.name] ?? ""} onChange={(e) => setParams({ [f.name]: e.target.value || undefined })} className={cn(inputCls, "w-auto")}>
                  <option value="">{f.label}: All</option>
                  {opts.map((o) => (
                    <option key={o} value={o}>{humanize(o)}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-y bg-secondary/40 px-3 py-2 text-sm" role="region" aria-label="Bulk actions">
            <span className="font-medium">{selected.size} selected</span>
            <button type="button" disabled={busy} onClick={() => bulk("publish", [...selected])} className="inline-flex items-center gap-1 rounded-md border bg-background px-2.5 py-1 hover:bg-muted">
              <Check className="size-3.5" aria-hidden /> Publish
            </button>
            <button type="button" disabled={busy} onClick={() => bulk("draft", [...selected])} className="inline-flex items-center gap-1 rounded-md border bg-background px-2.5 py-1 hover:bg-muted">
              <EyeOff className="size-3.5" aria-hidden /> Unpublish
            </button>
            {status === "ARCHIVED" ? (
              <button type="button" disabled={busy} onClick={() => bulk("restore", [...selected])} className="inline-flex items-center gap-1 rounded-md border bg-background px-2.5 py-1 hover:bg-muted">
                <ArchiveRestore className="size-3.5" aria-hidden /> Restore
              </button>
            ) : (
              <button type="button" disabled={busy} onClick={() => bulk("archive", [...selected])} className="inline-flex items-center gap-1 rounded-md border bg-background px-2.5 py-1 hover:bg-muted">
                <Archive className="size-3.5" aria-hidden /> Archive
              </button>
            )}
            <button type="button" disabled={busy} onClick={() => bulk("delete", [...selected])} className="inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-background px-2.5 py-1 text-destructive hover:bg-destructive/5">
              <Trash2 className="size-3.5" aria-hidden /> Delete
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-y bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    aria-label="Select all on this page"
                    checked={allChecked}
                    onChange={(e) => setSelected(e.target.checked ? new Set(items.map((r) => r.id)) : new Set())}
                    className="size-4 accent-primary"
                  />
                </th>
                {cfg.columns.map((c) => (
                  <th key={c.field} scope="col" className={cn("px-3 py-2.5 font-medium", c.className)}>
                    {c.label || <span className="sr-only">Image</span>}
                  </th>
                ))}
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {!data && !error && (
                <tr>
                  <td colSpan={cfg.columns.length + 2} className="px-3 py-10 text-center text-muted-foreground">
                    <Loader2 className="mx-auto size-5 animate-spin" aria-label="Loading" />
                  </td>
                </tr>
              )}
              {error && (
                <tr>
                  <td colSpan={cfg.columns.length + 2} className="px-3 py-10 text-center text-destructive">
                    {error}{" "}
                    <button type="button" onClick={load} className="underline">Retry</button>
                  </td>
                </tr>
              )}
              {data && items.length === 0 && (
                <tr>
                  <td colSpan={cfg.columns.length + 2} className="px-3 py-12 text-center">
                    <p className="font-medium">No records found.</p>
                    <p className="mt-1 text-muted-foreground">Try changing the search or status filter, or add a new {cfg.singular.toLowerCase()}.</p>
                  </td>
                </tr>
              )}
              {items.map((row) => (
                <tr key={row.id} className={cn("hover:bg-muted/40", selected.has(row.id) && "bg-secondary/40")}>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label={`Select ${String(row[cfg.titleField] ?? row.id)}`}
                      checked={selected.has(row.id)}
                      onChange={(e) => {
                        const next = new Set(selected);
                        if (e.target.checked) next.add(row.id);
                        else next.delete(row.id);
                        setSelected(next);
                      }}
                      className="size-4 accent-primary"
                    />
                  </td>
                  {cfg.columns.map((c, i) => (
                    <td key={c.field} className={cn("max-w-xs truncate px-3 py-2", c.className)}>
                      {i === 0 || (cfg.columns[0].render === "image" && i === 1) ? (
                        <Link href={`/admin/${cfg.key}/${row.id}`} className="font-medium hover:text-primary hover:underline">
                          <Cell row={row} col={c} />
                        </Link>
                      ) : (
                        <Cell row={row} col={c} />
                      )}
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <Link href={`/admin/${cfg.key}/${row.id}`} className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted" aria-label={`Edit ${String(row[cfg.titleField] ?? "")}`}>
                      <Pencil className="size-4" />
                    </Link>
                    {row.status === "ARCHIVED" ? (
                      <button type="button" onClick={() => bulk("restore", [row.id])} className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted" aria-label="Restore">
                        <ArchiveRestore className="size-4" />
                      </button>
                    ) : (
                      <button type="button" onClick={() => bulk("archive", [row.id])} className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted" aria-label="Archive">
                        <Archive className="size-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data && data.pages > 1 && (
          <nav aria-label="Pagination" className="flex items-center justify-between border-t px-3 py-2 text-sm">
            <span className="text-muted-foreground">Page {data.page} of {data.pages}</span>
            <div className="flex gap-1">
              <button type="button" disabled={page <= 1} onClick={() => setParams({ page: String(page - 1) })} className="inline-flex h-8 items-center gap-1 rounded-md border px-2.5 hover:bg-muted disabled:opacity-50">
                <ChevronLeft className="size-4" aria-hidden /> Previous
              </button>
              <button type="button" disabled={page >= data.pages} onClick={() => setParams({ page: String(page + 1) })} className="inline-flex h-8 items-center gap-1 rounded-md border px-2.5 hover:bg-muted disabled:opacity-50">
                Next <ChevronRight className="size-4" aria-hidden />
              </button>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
