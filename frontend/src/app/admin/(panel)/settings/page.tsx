"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DatabaseBackup, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { api, ClientApiError } from "@/lib/client-api";
import { formatDateTime } from "@/lib/format";
import { useAdmin } from "@/components/admin/admin-context";
import { inputCls } from "@/components/admin/fields";

const pwSchema = z
  .object({
    current_password: z.string().min(1, "Required"),
    new_password: z.string().min(10, "At least 10 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.new_password === v.confirm, { path: ["confirm"], message: "Passwords do not match" });
type PwValues = z.infer<typeof pwSchema>;

const adminSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  full_name: z.string().trim().min(1, "Required").max(150),
  password: z.string().min(10, "At least 10 characters"),
  is_superadmin: z.boolean(),
});
type AdminValues = z.infer<typeof adminSchema>;

interface AdminAccount {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superadmin: boolean;
  last_login_at: string | null;
}
interface SystemStatus {
  database: string;
  last_backup: { value: string; updated_at: string } | null;
}

function PasswordForm() {
  const { register, handleSubmit, reset, formState } = useForm<PwValues>({ resolver: zodResolver(pwSchema) });
  const { errors, isSubmitting } = formState;
  async function onSubmit(v: PwValues) {
    try {
      await api("/auth/change-password", { body: { current_password: v.current_password, new_password: v.new_password } });
      toast.success("Password changed");
      reset();
    } catch (e) {
      toast.error(e instanceof ClientApiError ? e.message : "Could not change password");
    }
  }
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-3">
      {(["current_password", "new_password", "confirm"] as const).map((name) => (
        <div key={name}>
          <label htmlFor={`pw-${name}`} className="mb-1 block text-sm font-medium">
            {{ current_password: "Current password", new_password: "New password", confirm: "Repeat new password" }[name]}
          </label>
          <input id={`pw-${name}`} type="password" autoComplete={name === "current_password" ? "current-password" : "new-password"} {...register(name)} aria-invalid={!!errors[name]} className={inputCls} />
          {errors[name] && <p className="mt-1 text-xs text-destructive">{errors[name]?.message}</p>}
        </div>
      ))}
      <div className="sm:col-span-3">
        <button type="submit" disabled={isSubmitting} className="inline-flex h-10 items-center gap-2 rounded-md bg-cta px-5 text-sm font-medium text-cta-foreground hover:bg-cta-hover hover:text-cta-hover-foreground disabled:opacity-60">
          {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden />} Change password
        </button>
      </div>
    </form>
  );
}

function AdminAccounts() {
  const { me, confirm } = useAdmin();
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const { register, handleSubmit, reset, formState } = useForm<AdminValues>({ resolver: zodResolver(adminSchema), defaultValues: { is_superadmin: false } });
  const { errors, isSubmitting } = formState;

  const load = useCallback(() => api<AdminAccount[]>("/admin/admins").then(setAdmins), []);
  useEffect(() => {
    load();
  }, [load]);

  async function onCreate(v: AdminValues) {
    try {
      await api("/admin/admins", { body: v });
      toast.success("Admin account created");
      reset({ email: "", full_name: "", password: "", is_superadmin: false });
      load();
    } catch (e) {
      toast.error(e instanceof ClientApiError ? e.message : "Could not create admin");
    }
  }

  async function toggleActive(a: AdminAccount) {
    if (a.is_active && !(await confirm({ title: `Deactivate ${a.full_name}?`, description: "They will no longer be able to sign in.", confirmLabel: "Deactivate", destructive: true }))) return;
    try {
      await api(`/admin/admins/${a.id}`, { method: "PUT", body: { email: a.email, full_name: a.full_name, is_active: !a.is_active, is_superadmin: a.is_superadmin } });
      load();
    } catch (e) {
      toast.error(e instanceof ClientApiError ? e.message : "Update failed");
    }
  }

  return (
    <div className="space-y-5">
      <ul className="divide-y rounded-md border">
        {admins.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
            <div>
              <p className="font-medium">{a.full_name} {a.is_superadmin && <span className="ml-1 rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">Super-admin</span>} {!a.is_active && <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs">Inactive</span>}</p>
              <p className="text-muted-foreground">{a.email} · last sign-in {a.last_login_at ? formatDateTime(a.last_login_at) : "never"}</p>
            </div>
            {a.id !== me.id && (
              <button type="button" onClick={() => toggleActive(a)} className="rounded-md border px-3 py-1.5 hover:bg-muted">
                {a.is_active ? "Deactivate" : "Reactivate"}
              </button>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={handleSubmit(onCreate)} noValidate className="grid gap-4 rounded-md border p-4 sm:grid-cols-2">
        <p className="font-medium sm:col-span-2">Add administrator</p>
        <div>
          <label htmlFor="ad-name" className="mb-1 block text-sm font-medium">Full name</label>
          <input id="ad-name" {...register("full_name")} aria-invalid={!!errors.full_name} className={inputCls} />
          {errors.full_name && <p className="mt-1 text-xs text-destructive">{errors.full_name.message}</p>}
        </div>
        <div>
          <label htmlFor="ad-email" className="mb-1 block text-sm font-medium">Email</label>
          <input id="ad-email" type="email" {...register("email")} aria-invalid={!!errors.email} className={inputCls} />
          {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="ad-pw" className="mb-1 block text-sm font-medium">Initial password</label>
          <input id="ad-pw" type="password" autoComplete="new-password" {...register("password")} aria-invalid={!!errors.password} className={inputCls} />
          {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" {...register("is_superadmin")} className="size-4 accent-primary" /> Super-admin (can manage admins)
        </label>
        <div className="sm:col-span-2">
          <button type="submit" disabled={isSubmitting} className="inline-flex h-10 items-center gap-2 rounded-md bg-cta px-4 text-sm font-medium text-cta-foreground hover:bg-cta-hover hover:text-cta-hover-foreground disabled:opacity-60">
            <Plus className="size-4" aria-hidden /> Create admin
          </button>
        </div>
      </form>
    </div>
  );
}

export default function SettingsPage() {
  const { me } = useAdmin();
  const [system, setSystem] = useState<SystemStatus | null>(null);
  useEffect(() => {
    api<SystemStatus>("/admin/system-status").then(setSystem).catch(() => undefined);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-primary">Settings</h1>
      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><DatabaseBackup className="size-5 text-primary" aria-hidden /> Backups</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The database ({system?.database ?? "…"}) is the system of record. Backups run on the server (see README → Backups).
          Excel exports are not a backup.
        </p>
        <p className="mt-3 text-sm">
          Last successful backup:{" "}
          <strong>{system?.last_backup ? formatDateTime(system.last_backup.updated_at) : "No backup recorded yet"}</strong>
        </p>
      </section>
      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Change your password</h2>
        <PasswordForm />
      </section>
      {me.is_superadmin && (
        <section className="rounded-lg border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Administrator accounts</h2>
          <AdminAccounts />
        </section>
      )}
    </div>
  );
}
