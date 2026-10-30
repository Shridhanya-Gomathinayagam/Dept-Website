"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client-api";
import type { Options } from "@/lib/types";

export interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  is_superadmin: boolean;
}

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
}

interface AdminCtx {
  me: AdminUser;
  options: Options;
  confirm: (o: ConfirmOptions) => Promise<boolean>;
}

const Ctx = createContext<AdminCtx | null>(null);

export function useAdmin(): AdminCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAdmin must be used inside AdminProvider");
  return ctx;
}

export function AdminProvider({ me, children }: { me: AdminUser; children: React.ReactNode }) {
  const [options, setOptions] = useState<Options>({});
  const [dialog, setDialog] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  useEffect(() => {
    api<Options>("/meta/options").then(setOptions).catch(() => setOptions({}));
  }, []);

  const confirm = useCallback((o: ConfirmOptions) => {
    setDialog(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setDialog(null);
  };

  return (
    <Ctx.Provider value={{ me, options, confirm }}>
      {children}
      <AlertDialog open={!!dialog} onOpenChange={(open) => !open && settle(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialog?.title}</AlertDialogTitle>
            {dialog?.description && <AlertDialogDescription>{dialog.description}</AlertDialogDescription>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => settle(false)}>Cancel</AlertDialogCancel>
            <Button variant={dialog?.destructive ? "destructive" : "default"} onClick={() => settle(true)} autoFocus>
              {dialog?.confirmLabel ?? "Confirm"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Ctx.Provider>
  );
}
