import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  PUBLISHED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  DRAFT: "bg-amber-50 text-amber-800 ring-amber-200",
  ARCHIVED: "bg-slate-100 text-slate-600 ring-slate-200",
};
const LABELS: Record<string, string> = { PUBLISHED: "Published", DRAFT: "Draft", ARCHIVED: "Archived" };

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1", STYLES[status] ?? STYLES.ARCHIVED)}>
      {LABELS[status] ?? status}
    </span>
  );
}
