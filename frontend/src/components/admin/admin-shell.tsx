"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Award, BookOpen, Briefcase, Building2, CalendarDays, ExternalLink, FileSpreadsheet, FileText, FlaskConical,
  FolderKanban, GraduationCap, Handshake, History, Images, LayoutDashboard, LibraryBig, LogOut, Menu, Newspaper, Rocket,
  Settings, Sparkles, Trophy, Users, UserSquare2, Video, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/client-api";
import { AdminProvider, type AdminUser } from "./admin-context";

const NAV: { group: string; items: { href: string; label: string; icon: typeof Users }[] }[] = [
  { group: "", items: [{ href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    group: "Department",
    items: [
      { href: "/admin/department", label: "Department", icon: Building2 },
      { href: "/admin/highlights", label: "Home Highlights", icon: Sparkles },
      { href: "/admin/mous", label: "MOUs", icon: Handshake },
      { href: "/admin/faculty", label: "Faculty", icon: UserSquare2 },
      { href: "/admin/students", label: "Students", icon: Users },
      { href: "/admin/alumni", label: "Alumni", icon: GraduationCap },
    ],
  },
  {
    group: "Achievements",
    items: [
      { href: "/admin/faculty-achievements", label: "Faculty Achievements", icon: Award },
      { href: "/admin/student-achievements", label: "Student Achievements", icon: Trophy },
    ],
  },
  {
    group: "Activities",
    items: [
      { href: "/admin/events", label: "Events", icon: CalendarDays },
      { href: "/admin/opportunities", label: "Opportunities", icon: Rocket },
      { href: "/admin/news", label: "News", icon: Newspaper },
      { href: "/admin/gallery", label: "Gallery", icon: Images },
      { href: "/admin/videos", label: "Videos", icon: Video },
    ],
  },
  {
    group: "Academics",
    items: [
      { href: "/admin/programs", label: "Programs", icon: LibraryBig },
      { href: "/admin/academic-documents", label: "Academic Documents", icon: FileText },
    ],
  },
  {
    group: "Careers",
    items: [
      { href: "/admin/placement-years", label: "Placement Statistics", icon: Briefcase },
      { href: "/admin/placements", label: "Placement Records", icon: Briefcase },
      { href: "/admin/recruiters", label: "Recruiters", icon: Building2 },
      { href: "/admin/internships", label: "Internships", icon: Briefcase },
    ],
  },
  {
    group: "Research",
    items: [
      { href: "/admin/publications", label: "Publications", icon: BookOpen },
      { href: "/admin/patents", label: "Patents", icon: BookOpen },
      { href: "/admin/research-projects", label: "Research Projects", icon: FolderKanban },
      { href: "/admin/laboratories", label: "Laboratories", icon: FlaskConical },
      { href: "/admin/projects", label: "Projects", icon: FolderKanban },
    ],
  },
  {
    group: "Data",
    items: [
      { href: "/admin/excel/import", label: "Excel Import", icon: FileSpreadsheet },
      { href: "/admin/excel/export", label: "Excel Export", icon: FileSpreadsheet },
      { href: "/admin/activity-logs", label: "Activity Logs", icon: History },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<AdminUser | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api<AdminUser>("/auth/me")
      .then(setMe)
      .catch(() => router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`));
    // only on first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      router.replace("/admin/login");
    }
  }

  if (!me) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground" role="status">
        Checking your session…
      </div>
    );
  }

  const sidebar = (
    <nav aria-label="Admin" className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <span className="flex size-8 items-center justify-center rounded bg-primary text-xs font-semibold text-primary-foreground">DH</span>
        <span className="font-heading font-semibold text-primary">Admin Panel</span>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV.map((g) => (
          <div key={g.group || "main"}>
            {g.group && <p className="mb-1 px-2 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">{g.group}</p>}
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm",
                        active ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-muted",
                      )}
                    >
                      <item.icon className="size-4 shrink-0" aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t p-3">
        <Link href="/" target="_blank" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
          <ExternalLink className="size-4" aria-hidden /> View website
        </Link>
      </div>
    </nav>
  );

  return (
    <AdminProvider me={me}>
      <div className="min-h-screen bg-muted/40">
        <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-sidebar lg:block">{sidebar}</aside>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setOpen(false)} />
            <aside className="relative h-full w-72 max-w-[85vw] bg-sidebar shadow-xl">{sidebar}</aside>
          </div>
        )}
        <div className="lg:pl-64">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background px-4 sm:px-6">
            <button type="button" className="rounded-md p-2 hover:bg-muted lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden text-sm text-muted-foreground sm:inline">{me.full_name}</span>
              <button type="button" onClick={logout} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
                <LogOut className="size-4" aria-hidden /> Sign out
              </button>
            </div>
          </header>
          <main id="main" className="mx-auto max-w-7xl p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </AdminProvider>
  );
}
