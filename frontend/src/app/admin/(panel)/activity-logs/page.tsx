"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { api, toQuery } from "@/lib/client-api";
import { formatDateTime } from "@/lib/format";
import type { Page } from "@/lib/types";
import { inputCls } from "@/components/admin/fields";

interface Log {
  id: number;
  admin_name: string | null;
  action: string;
  module: string;
  record_id: number | null;
  record_label: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

const ACTIONS = ["CREATE", "UPDATE", "PUBLISH", "UNPUBLISH", "ARCHIVE", "RESTORE", "DELETE", "IMPORT", "EXPORT", "UPLOAD", "LOGIN", "LOGOUT", "LOGIN_FAILED"];
const MODULES = [
  "auth", "department", "faculty", "students", "faculty-achievements", "student-achievements", "events", "opportunities",
  "placement-years", "placements", "recruiters", "internships", "publications", "patents", "research-projects",
  "laboratories", "projects", "alumni", "news", "gallery", "highlights", "admins",
];

function detailText(d: Record<string, unknown> | null): string {
  if (!d) return "";
  if (Array.isArray(d.changed)) return d.changed.length ? `Changed: ${(d.changed as string[]).join(", ")}` : "No field changes";
  if ("created" in d) return `Created ${d.created}, updated ${d.updated}`;
  if ("rows" in d) return `${d.rows} rows`;
  return "";
}

export default function ActivityLogsPage() {
  const [filters, setFilters] = useState({ module: "", action: "", q: "", date_from: "", date_to: "" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<Log> | null>(null);

  const load = useCallback(() => {
    setData(null);
    api<Page<Log>>(`/admin/activity-logs${toQuery({ ...filters, page, page_size: 30 })}`).then(setData);
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (k: keyof typeof filters, v: string) => {
    setPage(1);
    setFilters({ ...filters, [k]: v });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Activity logs</h1>
        <p className="text-sm text-muted-foreground">Every sign-in, change, import and export made in the admin panel.</p>
      </div>
      <div className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label htmlFor="lg-module" className="mb-1 block text-xs font-medium text-muted-foreground">Module</label>
          <select id="lg-module" value={filters.module} onChange={(e) => set("module", e.target.value)} className={inputCls}>
            <option value="">All</option>
            {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="lg-action" className="mb-1 block text-xs font-medium text-muted-foreground">Action</label>
          <select id="lg-action" value={filters.action} onChange={(e) => set("action", e.target.value)} className={inputCls}>
            <option value="">All</option>
            {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="lg-q" className="mb-1 block text-xs font-medium text-muted-foreground">Record</label>
          <input id="lg-q" type="search" value={filters.q} onChange={(e) => set("q", e.target.value)} className={inputCls} placeholder="Name or title" />
        </div>
        <div>
          <label htmlFor="lg-from" className="mb-1 block text-xs font-medium text-muted-foreground">From</label>
          <input id="lg-from" type="date" value={filters.date_from} onChange={(e) => set("date_from", e.target.value)} className={inputCls} />
        </div>
        <div>
          <label htmlFor="lg-to" className="mb-1 block text-xs font-medium text-muted-foreground">To</label>
          <input id="lg-to" type="date" value={filters.date_to} onChange={(e) => set("date_to", e.target.value)} className={inputCls} />
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {["When", "Admin", "Action", "Module", "Record", "Details", "IP"].map((h) => <th key={h} scope="col" className="px-3 py-2.5 font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y">
            {!data ? (
              <tr><td colSpan={7} className="py-10 text-center"><Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" aria-label="Loading" /></td></tr>
            ) : data.items.length === 0 ? (
              <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">No activity matches these filters.</td></tr>
            ) : (
              data.items.map((l) => (
                <tr key={l.id}>
                  <td className="whitespace-nowrap px-3 py-2">{formatDateTime(l.created_at)}</td>
                  <td className="px-3 py-2">{l.admin_name ?? "—"}</td>
                  <td className="px-3 py-2 font-medium">{l.action}</td>
                  <td className="px-3 py-2">{l.module}</td>
                  <td className="max-w-xs truncate px-3 py-2">{l.record_label ?? (l.record_id ? `#${l.record_id}` : "—")}</td>
                  <td className="max-w-xs truncate px-3 py-2 text-muted-foreground">{detailText(l.details)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{l.ip_address ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {data && data.pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-end gap-2 text-sm">
          <span className="text-muted-foreground">Page {data.page} of {data.pages}</span>
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="inline-flex h-8 items-center rounded-md border px-2 disabled:opacity-50" aria-label="Previous page"><ChevronLeft className="size-4" /></button>
          <button type="button" disabled={page >= data.pages} onClick={() => setPage(page + 1)} className="inline-flex h-8 items-center rounded-md border px-2 disabled:opacity-50" aria-label="Next page"><ChevronRight className="size-4" /></button>
        </nav>
      )}
    </div>
  );
}
