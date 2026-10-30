"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, ClientApiError, download, toQuery } from "@/lib/client-api";
import { RESOURCE_MAP } from "@/lib/admin/resources";
import { humanize } from "@/lib/format";
import { useAdmin } from "@/components/admin/admin-context";
import { inputCls } from "@/components/admin/fields";

interface Entity {
  entity: string;
  label: string;
  resource: string;
  filters: string[];
}

// How to present each backend filter parameter in the export form.
const FILTER_UI: Record<string, { label: string; optionsKey?: string; type?: "text" | "number" | "date" }> = {
  year: { label: "Year", type: "number" },
  category: { label: "Category" },
  level: { label: "Level", optionsKey: "levels" },
  batch: { label: "Batch", type: "text" },
  academic_year: { label: "Academic year", type: "text" },
  section: { label: "Section", type: "text" },
  skill: { label: "Skill", type: "text" },
  designation: { label: "Designation", type: "text" },
  event_type: { label: "Event type", optionsKey: "event_types" },
  event_status: { label: "Event status", optionsKey: "event_statuses" },
  pub_type: { label: "Publication type", optionsKey: "publication_types" },
  domain: { label: "Domain", type: "text" },
  graduation_year: { label: "Graduation year", type: "number" },
  company: { label: "Company", type: "text" },
  state: { label: "State", type: "text" },
  mode: { label: "Mode", optionsKey: "modes" },
  from: { label: "From date", type: "date" },
  to: { label: "To date", type: "date" },
};
const CATEGORY_KEY: Record<string, string> = {
  student_achievements: "student_achievement_categories",
  faculty_achievements: "faculty_achievement_categories",
  opportunities: "opportunity_categories",
};

export default function ExportPage() {
  const { options } = useAdmin();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [entity, setEntity] = useState("");
  const [status, setStatus] = useState("ALL");
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Entity[]>("/admin/excel/entities").then((list) => {
      setEntities(list);
      setEntity(list[0]?.entity ?? "");
    });
  }, []);

  const current = entities.find((e) => e.entity === entity);
  const filters = (current?.filters ?? []).filter((f) => FILTER_UI[f]);

  async function run() {
    setBusy(true);
    try {
      await download(`/admin/excel/${entity}/export${toQuery({ ...values, status })}`, `${entity}.xlsx`);
      toast.success("Export downloaded");
    } catch (e) {
      toast.error(e instanceof ClientApiError ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Excel export</h1>
          <p className="text-sm text-muted-foreground">Download records as .xlsx. Exported files use the same columns as the import templates.</p>
        </div>
        <Link href="/admin/excel/import" className="text-sm text-primary hover:underline">Go to import →</Link>
      </div>
      <section className="space-y-5 rounded-lg border bg-card p-5 shadow-sm">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="entity" className="mb-1.5 block text-sm font-medium">Records</label>
            <select id="entity" value={entity} onChange={(e) => { setEntity(e.target.value); setValues({}); }} className={inputCls}>
              {entities.map((e) => <option key={e.entity} value={e.entity}>{e.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="status" className="mb-1.5 block text-sm font-medium">Visibility</label>
            <select id="status" value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
              <option value="ALL">All records</option>
              <option value="PUBLISHED">Published only</option>
              <option value="DRAFT">Drafts only</option>
              <option value="ARCHIVED">Archived only</option>
            </select>
          </div>
        </div>
        {filters.length > 0 && (
          <fieldset>
            <legend className="mb-3 text-sm font-medium">Filters (optional)</legend>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filters.map((f) => {
                const ui = FILTER_UI[f];
                const optionsKey = f === "category" ? CATEGORY_KEY[entity] : ui.optionsKey;
                const opts = optionsKey ? options[optionsKey] ?? [] : null;
                const id = `flt-${f}`;
                return (
                  <div key={f}>
                    <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted-foreground">{ui.label}</label>
                    {opts ? (
                      <select id={id} value={values[f] ?? ""} onChange={(e) => setValues({ ...values, [f]: e.target.value })} className={inputCls}>
                        <option value="">Any</option>
                        {opts.map((o) => <option key={o} value={o}>{humanize(o)}</option>)}
                      </select>
                    ) : (
                      <input id={id} type={ui.type ?? "text"} value={values[f] ?? ""} onChange={(e) => setValues({ ...values, [f]: e.target.value })} className={inputCls} />
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={run} disabled={!entity || busy} className="inline-flex h-10 items-center gap-2 rounded-md bg-cta px-5 text-sm font-medium text-cta-foreground hover:bg-cta-hover hover:text-cta-hover-foreground disabled:opacity-50">
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />} Export to Excel
          </button>
          {current && RESOURCE_MAP[current.resource] && (
            <Link href={`/admin/${current.resource}`} className="text-sm text-muted-foreground hover:underline">Open {current.label}</Link>
          )}
        </div>
      </section>
    </div>
  );
}
