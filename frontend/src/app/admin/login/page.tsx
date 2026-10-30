"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Lock } from "lucide-react";
import { api, ClientApiError } from "@/lib/client-api";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});
type Values = z.infer<typeof schema>;

function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(schema) });
  const { errors, isSubmitting } = formState;

  async function onSubmit(values: Values) {
    setError(null);
    try {
      await api("/auth/login", { body: values });
      const next = sp.get("next");
      // Only allow internal admin redirects.
      router.replace(next && next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin/dashboard");
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Sign-in failed. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {error && (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium">Email</label>
        <input id="email" type="email" autoComplete="username" {...register("email")} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} className="h-11 w-full rounded-md border border-input bg-background px-3" />
        {errors.email && <p id="email-error" className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium">Password</label>
        <input id="password" type="password" autoComplete="current-password" {...register("password")} aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : undefined} className="h-11 w-full rounded-md border border-input bg-background px-3" />
        {errors.password && <p id="password-error" className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <button type="submit" disabled={isSubmitting} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-cta font-medium text-cta-foreground hover:bg-cta-hover hover:text-cta-hover-foreground disabled:opacity-60">
        {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden />} Sign in
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main id="main" className="flex min-h-screen items-center justify-center bg-muted/50 px-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Lock className="size-5" aria-hidden />
          </span>
          <h1 className="mt-4 text-2xl font-semibold text-primary">Administrator sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Department Digital Hub · authorized staff only</p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
