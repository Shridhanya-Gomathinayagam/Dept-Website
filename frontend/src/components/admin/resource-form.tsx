"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ExternalLink, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { api, ClientApiError } from "@/lib/client-api";
import { buildSchema, toFormValues, toPayload, type FormValues } from "@/lib/admin/form";
import { allFields, type FieldDef, type ResourceConfig } from "@/lib/admin/resources";
import { humanize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAdmin } from "./admin-context";
import { ImagesField, inputCls, RefPicker, UploadField } from "./fields";
import { StatusBadge } from "./status-badge";

type Rec = Record<string, unknown> & { id?: number; status?: string };

export function ResourceForm({ cfg, record, children }: { cfg: ResourceConfig; record?: Rec | null; children?: React.ReactNode }) {
  const router = useRouter();
  const { options } = useAdmin();
  const fields = useMemo(() => allFields(cfg), [cfg]);
  const schema = useMemo(() => buildSchema(fields), [fields]);
  const isNew = !record?.id;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(fields, record),
    mode: "onBlur",
  });
  const { register, handleSubmit, control, formState, setError, reset, setValue } = form;
  const { errors, isSubmitting, isDirty } = formState;

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (isDirty && !isSubmitting) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty, isSubmitting]);

  async function onSubmit(values: FormValues) {
    const payload = toPayload(fields, values);
    try {
      const saved = await api<Rec>(isNew ? `/admin/${cfg.key}` : `/admin/${cfg.key}/${record!.id}`, {
        method: isNew ? "POST" : "PUT",
        body: payload,
      });
      toast.success(`${cfg.singular} ${isNew ? "created" : "saved"}${saved.status === "PUBLISHED" ? " and published" : ""}.`);
      reset(toFormValues(fields, saved));
      if (isNew) router.replace(`/admin/${cfg.key}/${saved.id}`);
      else router.refresh();
    } catch (e) {
      if (e instanceof ClientApiError) {
        for (const [name, message] of Object.entries(e.fieldErrors)) setError(name, { message });
        toast.error(e.message);
      } else {
        toast.error("Could not save. Please try again.");
      }
    }
  }

  const err = (name: string) => errors[name]?.message as string | undefined;
  const publicHref = !isNew && record?.status === "PUBLISHED" ? cfg.publicHref?.(record) : undefined;

  function renderInput(f: FieldDef) {
    const id = `field-${f.name}`;
    const invalid = !!err(f.name);
    const describedBy = [f.help && `${id}-help`, invalid && `${id}-error`].filter(Boolean).join(" ") || undefined;
    const common = { id, "aria-invalid": invalid, "aria-describedby": describedBy };
    const opts = f.options ?? (f.optionsKey ? options[f.optionsKey] : undefined) ?? [];

    switch (f.type) {
      case "textarea":
      case "markdown":
        return <textarea {...common} {...register(f.name)} rows={f.type === "markdown" ? 12 : 4} className={cn(inputCls, "h-auto py-2 leading-6", f.type === "markdown" && "font-mono")} />;
      case "list":
        return <textarea {...common} {...register(f.name)} rows={4} className={cn(inputCls, "h-auto py-2 leading-6")} placeholder="One item per line" />;
      case "select":
        return (
          <select {...common} {...register(f.name)} className={inputCls}>
            <option value="">{f.required ? "Select…" : "— None —"}</option>
            {opts.map((o) => (
              <option key={o} value={o}>
                {humanize(o)}
              </option>
            ))}
          </select>
        );
      case "checkbox":
        return null; // rendered inline with label below
      case "number":
        return <input {...common} {...register(f.name)} type="number" inputMode="decimal" step={f.step ?? 1} min={f.min} max={f.max} className={inputCls} />;
      case "date":
        return <input {...common} {...register(f.name)} type="date" className={inputCls} />;
      case "datetime":
        return <input {...common} {...register(f.name)} type="datetime-local" className={inputCls} />;
      case "email":
        return <input {...common} {...register(f.name)} type="email" autoComplete="off" className={inputCls} />;
      case "url":
        return <input {...common} {...register(f.name)} type="url" placeholder="https://" className={inputCls} />;
      case "image":
      case "document":
        return (
          <Controller
            control={control}
            name={f.name}
            render={({ field }) => (
              <UploadField id={id} value={String(field.value ?? "")} onChange={(v) => field.onChange(v)} kind={f.type as "image" | "document"} folder={f.folder ?? "misc"} invalid={invalid} />
            )}
          />
        );
      case "images":
        return (
          <Controller
            control={control}
            name={f.name}
            render={({ field }) => <ImagesField value={(field.value as string[]) ?? []} onChange={field.onChange} folder={f.folder ?? "misc"} />}
          />
        );
      case "faculty":
      case "student":
        return (
          <Controller
            control={control}
            name={f.name}
            render={({ field }) => (
              <RefPicker id={id} resource={f.type === "faculty" ? "faculty" : "students"} value={String(field.value ?? "")} onChange={(v) => setValue(f.name, v, { shouldDirty: true, shouldValidate: true })} invalid={invalid} />
            )}
          />
        );
      default:
        return <input {...common} {...register(f.name)} type="text" placeholder={f.placeholder} className={inputCls} />;
    }
  }

  return (
    <>
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/admin/${cfg.key}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden /> {cfg.label}
        </Link>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary">
            {isNew ? `Add ${cfg.singular.toLowerCase()}` : String(record?.[cfg.titleField] ?? cfg.singular)}
          </h1>
          {!isNew && record?.status && (
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              Currently <StatusBadge status={String(record.status)} />
              {publicHref && (
                <a href={publicHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                  View on website <ExternalLink className="size-3.5" aria-hidden />
                </a>
              )}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor="field-status" className="mb-1 block text-xs font-medium text-muted-foreground">Visibility</label>
            <select id="field-status" {...register("status")} className={cn(inputCls, "w-48")}>
              <option value="DRAFT">Draft (hidden)</option>
              <option value="PUBLISHED">Published (visible)</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <button type="submit" disabled={isSubmitting} className="inline-flex h-10 items-center gap-2 rounded-md bg-cta px-5 text-sm font-medium text-cta-foreground hover:bg-cta-hover hover:text-cta-hover-foreground disabled:opacity-60">
            {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
            {isNew ? "Create" : "Save changes"}
          </button>
        </div>
      </div>

      {Object.keys(errors).length > 0 && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Please correct the highlighted fields below.
        </div>
      )}

      {cfg.sections.map((section) => (
        <fieldset key={section.title} className="rounded-lg border bg-card p-5 shadow-sm sm:p-6">
          <legend className="sr-only">{section.title}</legend>
          <h2 className="text-lg font-semibold">{section.title}</h2>
          {section.description && <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>}
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {section.fields.map((f) => {
              const id = `field-${f.name}`;
              const error = err(f.name);
              const wide = f.wide || f.type === "images" || f.type === "markdown";
              if (f.type === "checkbox") {
                return (
                  <div key={f.name} className={cn("flex items-start gap-2.5 self-end pb-2", wide && "md:col-span-2")}>
                    <input id={id} type="checkbox" {...register(f.name)} className="mt-0.5 size-4 rounded border-input accent-primary" />
                    <div>
                      <label htmlFor={id} className="text-sm font-medium">{f.label}</label>
                      {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
                    </div>
                  </div>
                );
              }
              return (
                <div key={f.name} className={cn(wide && "md:col-span-2")}>
                  <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
                    {f.label}
                    {f.required && <span className="text-destructive" aria-hidden> *</span>}
                    {f.required && <span className="sr-only"> (required)</span>}
                  </label>
                  {renderInput(f)}
                  {f.help && <p id={`${id}-help`} className="mt-1 text-xs text-muted-foreground">{f.help}</p>}
                  {error && <p id={`${id}-error`} className="mt-1 text-xs font-medium text-destructive">{error}</p>}
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}
    </form>
    {children}
    </>
  );
}
