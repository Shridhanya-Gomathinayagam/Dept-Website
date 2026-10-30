"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ExternalLink, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, ClientApiError } from "@/lib/client-api";
import { buildSchema, isUrl, toFormValues, toPayload, type FormValues } from "@/lib/admin/form";
import type { FieldDef, Section } from "@/lib/admin/resources";
import type { Department, LinkItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { inputCls, UploadField } from "@/components/admin/fields";

const SECTIONS: Section[] = [
  {
    title: "Identity",
    fields: [
      { name: "name", label: "Department name", type: "text", required: true, max: 200, wide: true, placeholder: "Department of Computer Science and Engineering" },
      { name: "short_name", label: "Short name", type: "text", max: 50, placeholder: "CSE" },
      { name: "college_name", label: "College name", type: "text", max: 250 },
      { name: "tagline", label: "Tagline", type: "text", max: 300, wide: true },
      { name: "intro", label: "Short introduction (home page)", type: "textarea", wide: true },
      { name: "college_logo_url", label: "College logo", type: "image", folder: "department" },
      { name: "hero_image_url", label: "Home page banner image", type: "image", folder: "department" },
    ],
  },
  {
    title: "About",
    fields: [
      { name: "overview", label: "Department overview", type: "textarea", wide: true },
      { name: "vision", label: "Vision", type: "textarea", wide: true },
      { name: "mission", label: "Mission statements", type: "list", wide: true, help: "One statement per line." },
      { name: "peos", label: "Program Educational Objectives (PEOs)", type: "list", wide: true, help: "One per line." },
      { name: "pos", label: "Program Outcomes (POs)", type: "list", wide: true, help: "One per line." },
      { name: "psos", label: "Program Specific Outcomes (PSOs)", type: "list", wide: true, help: "One per line." },
      { name: "objectives", label: "Department objectives", type: "list", wide: true },
      { name: "year_established", label: "Year established", type: "number", min: 1950, max: 2100 },
      { name: "accreditation", label: "Accreditation", type: "textarea" },
      { name: "recognition", label: "Recognition", type: "textarea" },
      { name: "facilities", label: "Facilities", type: "list", wide: true },
    ],
  },
  {
    title: "Head of the Department",
    fields: [
      { name: "hod_name", label: "HOD name", type: "text", max: 150 },
      { name: "hod_designation", label: "HOD designation", type: "text", max: 150 },
      { name: "hod_photo_url", label: "HOD photo", type: "image", folder: "department" },
      { name: "hod_message", label: "Welcome message", type: "textarea", wide: true },
    ],
  },
  {
    title: "Contact",
    fields: [
      { name: "address", label: "Department address", type: "textarea" },
      { name: "college_address", label: "College address", type: "textarea" },
      { name: "email", label: "Email", type: "email" },
      { name: "phone", label: "Phone", type: "text", max: 50 },
      { name: "college_website", label: "College website", type: "url" },
      { name: "map_embed_url", label: "Google Maps embed URL", type: "url", help: "Google Maps → Share → Embed a map → copy only the src=\"…\" URL." },
    ],
  },
];

const FIELDS: FieldDef[] = SECTIONS.flatMap((s) => s.fields);
const linkSchema = z.array(
  z.object({ label: z.string().trim().min(1, "Label required").max(80), url: z.string().trim().refine(isUrl, "Enter a full https:// URL") }),
);

function LinksEditor({ value, onChange, title, errors }: { value: LinkItem[]; onChange: (v: LinkItem[]) => void; title: string; errors?: unknown }) {
  const errs = (errors as { label?: { message?: string }; url?: { message?: string } }[] | undefined) ?? [];
  return (
    <div className="md:col-span-2">
      <p className="mb-2 text-sm font-medium">{title}</p>
      <ul className="space-y-2">
        {value.map((l, i) => (
          <li key={i} className="flex flex-wrap gap-2">
            <input aria-label={`${title} ${i + 1} label`} value={l.label} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="Label (e.g. LinkedIn)" className={cn(inputCls, "w-48")} aria-invalid={!!errs[i]?.label} />
            <input aria-label={`${title} ${i + 1} URL`} value={l.url} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} placeholder="https://" className={cn(inputCls, "min-w-0 flex-1")} aria-invalid={!!errs[i]?.url} />
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="inline-flex h-10 items-center rounded-md px-2 text-destructive hover:bg-destructive/5" aria-label={`Remove ${title} ${i + 1}`}>
              <Trash2 className="size-4" />
            </button>
            {(errs[i]?.label || errs[i]?.url) && <p className="w-full text-xs text-destructive">{errs[i]?.label?.message ?? errs[i]?.url?.message}</p>}
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => onChange([...value, { label: "", url: "" }])} className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <Plus className="size-4" aria-hidden /> Add link
      </button>
    </div>
  );
}

export default function DepartmentPage() {
  const [loaded, setLoaded] = useState<Department | null | undefined>(undefined);
  const schema = useMemo(() => buildSchema(FIELDS).extend({ social_links: linkSchema, important_links: linkSchema }), []);
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const { register, handleSubmit, control, reset, setError, formState } = form;
  const { errors, isSubmitting } = formState;

  useEffect(() => {
    api<Department | null>("/admin/department").then((d) => {
      setLoaded(d);
      reset({ ...toFormValues(FIELDS, d as unknown as Record<string, unknown>), status: "DRAFT", social_links: d?.social_links ?? [], important_links: d?.important_links ?? [] });
    });
  }, [reset]);

  async function onSubmit(values: FormValues) {
    const { status: _status, ...payload } = toPayload(FIELDS, values);
    try {
      const saved = await api<Department>("/admin/department", {
        method: "PUT",
        body: { ...payload, social_links: values.social_links, important_links: values.important_links },
      });
      setLoaded(saved);
      toast.success("Department profile saved. The website updates within a minute.");
    } catch (e) {
      if (e instanceof ClientApiError) {
        for (const [name, message] of Object.entries(e.fieldErrors)) setError(name, { message });
        toast.error(e.message);
      }
    }
  }

  if (loaded === undefined) return <Loader2 className="mx-auto mt-20 size-6 animate-spin text-muted-foreground" aria-label="Loading" />;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Department profile</h1>
          <p className="text-sm text-muted-foreground">Shown on the home, About and Contact pages and in the footer.</p>
        </div>
        <div className="flex gap-2">
          <a href="/#about" target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-md border px-3 text-sm hover:bg-muted">
            <ExternalLink className="size-4" aria-hidden /> View
          </a>
          <button type="submit" disabled={isSubmitting} className="inline-flex h-10 items-center gap-2 rounded-md bg-cta px-5 text-sm font-medium text-cta-foreground hover:bg-cta-hover hover:text-cta-hover-foreground disabled:opacity-60">
            {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />} Save
          </button>
        </div>
      </div>
      {loaded === null && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The department profile has not been created yet. Fill in at least the department name and save.
        </p>
      )}
      {SECTIONS.map((section) => (
        <fieldset key={section.title} className="rounded-lg border bg-card p-5 shadow-sm sm:p-6">
          <legend className="sr-only">{section.title}</legend>
          <h2 className="text-lg font-semibold">{section.title}</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {section.fields.map((f) => {
              const id = `field-${f.name}`;
              const error = errors[f.name]?.message as string | undefined;
              return (
                <div key={f.name} className={cn(f.wide && "md:col-span-2")}>
                  <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
                    {f.label}
                    {f.required && <span className="text-destructive" aria-hidden> *</span>}
                  </label>
                  {f.type === "image" ? (
                    <Controller control={control} name={f.name} render={({ field }) => <UploadField id={id} value={String(field.value ?? "")} onChange={field.onChange} kind="image" folder={f.folder ?? "department"} invalid={!!error} />} />
                  ) : f.type === "textarea" || f.type === "list" ? (
                    <textarea id={id} rows={f.type === "list" ? 5 : 4} {...register(f.name)} aria-invalid={!!error} className={cn(inputCls, "h-auto py-2 leading-6")} />
                  ) : (
                    <input id={id} type={f.type === "number" ? "number" : f.type === "email" ? "email" : f.type === "url" ? "url" : "text"} placeholder={f.placeholder} {...register(f.name)} aria-invalid={!!error} className={inputCls} />
                  )}
                  {f.help && <p className="mt-1 text-xs text-muted-foreground">{f.help}</p>}
                  {error && <p className="mt-1 text-xs font-medium text-destructive">{error}</p>}
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}
      <fieldset className="rounded-lg border bg-card p-5 shadow-sm sm:p-6">
        <legend className="sr-only">Links</legend>
        <h2 className="text-lg font-semibold">Links</h2>
        <div className="mt-5 grid gap-6 md:grid-cols-2">
          <Controller control={control} name="social_links" render={({ field }) => <LinksEditor title="Social media links" value={(field.value as LinkItem[]) ?? []} onChange={field.onChange} errors={errors.social_links} />} />
          <Controller control={control} name="important_links" render={({ field }) => <LinksEditor title="Important links (footer)" value={(field.value as LinkItem[]) ?? []} onChange={field.onChange} errors={errors.important_links} />} />
        </div>
      </fieldset>
    </form>
  );
}
