"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useId, useRef, useState } from "react";
import { FileText, ImagePlus, Loader2, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { api, ClientApiError } from "@/lib/client-api";
import { imageUrl } from "@/lib/format";
import type { Page } from "@/lib/types";

export const inputCls =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-2 focus-visible:outline-ring aria-[invalid=true]:border-destructive";

async function uploadFile(file: File, kind: "image" | "document", folder: string): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);
  form.append("folder", folder);
  const res = await api<{ url: string }>("/admin/uploads", { form });
  return res.url;
}

/** Single image or PDF: upload to storage, or paste an existing URL. */
export function UploadField({
  id,
  value,
  onChange,
  kind,
  folder,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  kind: "image" | "document";
  folder: string;
  invalid?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadFile(file, kind, folder));
      toast.success("File uploaded");
    } catch (e) {
      toast.error(e instanceof ClientApiError ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      {value && kind === "image" && (
        <div className="relative inline-block">
          <img src={imageUrl(value, 240)} alt="Current upload preview" className="h-28 max-w-full rounded-md border object-cover" />
        </div>
      )}
      {value && kind === "document" && (
        <a href={value} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
          <FileText className="size-4" aria-hidden /> View current file
        </a>
      )}
      <div className="flex flex-wrap gap-2">
        <input
          id={id}
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://… or upload"
          aria-invalid={invalid}
          className={`${inputCls} min-w-0 flex-1`}
        />
        <input
          ref={inputRef}
          type="file"
          hidden
          accept={kind === "image" ? "image/jpeg,image/png,image/webp,image/gif" : "application/pdf"}
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex h-10 items-center gap-1.5 rounded-md border px-3 text-sm hover:bg-muted disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
          Upload
        </button>
        {value && (
          <button type="button" onClick={() => onChange("")} className="inline-flex h-10 items-center rounded-md px-2 text-muted-foreground hover:bg-muted" aria-label="Remove file">
            <X className="size-4" />
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {kind === "image" ? "JPG, PNG, WEBP or GIF, up to 5 MB." : "PDF, up to 10 MB."}
      </p>
    </div>
  );
}

/** Several images (multi-upload). */
export function ImagesField({ value, onChange, folder }: { value: string[]; onChange: (v: string[]) => void; folder: string }) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      try {
        urls.push(await uploadFile(file, "image", folder));
      } catch (e) {
        toast.error(`${file.name}: ${e instanceof ClientApiError ? e.message : "upload failed"}`);
      }
    }
    onChange([...value, ...urls]);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <ul className="flex flex-wrap gap-3">
        {value.map((url, i) => (
          <li key={url} className="relative">
            <img src={imageUrl(url, 200)} alt={`Image ${i + 1}`} className="size-24 rounded-md border object-cover" />
            <button
              type="button"
              onClick={() => onChange(value.filter((u) => u !== url))}
              className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-white shadow"
              aria-label={`Remove image ${i + 1}`}
            >
              <Trash2 className="size-3" />
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex size-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs text-muted-foreground hover:bg-muted"
          >
            {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <ImagePlus className="size-5" aria-hidden />}
            Add images
          </button>
        </li>
      </ul>
      <input ref={inputRef} type="file" hidden multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => onFiles(e.target.files)} />
    </div>
  );
}

interface RefItem {
  id: number;
  name: string;
  register_no?: string;
  email?: string | null;
}

/** Pick a faculty member or student by searching admin records. */
export function RefPicker({
  id,
  resource,
  value,
  onChange,
  invalid,
}: {
  id: string;
  resource: "faculty" | "students";
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RefItem[]>([]);
  const [selected, setSelected] = useState<RefItem | null>(null);
  const [open, setOpen] = useState(false);
  const listId = useId();

  // Resolve the label of the current value.
  useEffect(() => {
    if (!value) {
      setSelected(null);
      return;
    }
    if (selected?.id === Number(value)) return;
    api<RefItem>(`/admin/${resource}/${value}`)
      .then(setSelected)
      .catch(() => setSelected({ id: Number(value), name: `#${value}` }));
  }, [value, resource, selected?.id]);

  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      api<Page<RefItem>>(`/admin/${resource}?status=ALL&page_size=20${query ? `&q=${encodeURIComponent(query)}` : ""}`, { signal: ctrl.signal })
        .then((p) => setResults(p.items))
        .catch(() => undefined);
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, open, resource]);

  if (selected && value) {
    return (
      <div className="flex h-10 items-center justify-between rounded-md border bg-muted/40 px-3 text-sm">
        <span className="truncate">
          {selected.name}
          {selected.register_no && <span className="text-muted-foreground"> · {selected.register_no}</span>}
        </span>
        <button type="button" onClick={() => onChange("")} className="text-muted-foreground hover:text-foreground" aria-label="Clear selection">
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={resource === "faculty" ? "Type to search faculty…" : "Type a name or register number…"}
        className={inputCls}
      />
      {open && (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-lg">
          {results.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">No matches</li>}
          {results.map((r) => (
            <li key={r.id} role="option" aria-selected={false}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setSelected(r);
                  onChange(String(r.id));
                  setQuery("");
                  setOpen(false);
                }}
                className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-muted"
              >
                {r.name}
                <span className="text-muted-foreground">{r.register_no ? ` · ${r.register_no}` : r.email ? ` · ${r.email}` : ""}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
