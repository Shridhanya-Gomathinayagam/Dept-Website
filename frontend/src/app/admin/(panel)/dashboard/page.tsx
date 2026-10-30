"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/client-api";
import { formatDateTime } from "@/lib/format";
import { useAdmin } from "@/components/admin/admin-context";

interface Count {
  total: number;
  published: number;
  draft: number;
}
interface Stats {
  counts: Record<string, Count> & { upcoming_events: number };
  achievements_by_year: { year: number; student: number; faculty: number }[];
  student_achievements_by_category: { category: string; count: number }[];
  placements_by_year: { academic_year: string; placed: number; eligible: number }[];
  publications_by_year: { year: number; count: number }[];
  recent_activity: { id: number; admin_name: string | null; action: string; module: string; record_label: string | null; created_at: string }[];
}

const CARDS: { key: string; label: string; href: string }[] = [
  { key: "students", label: "Students", href: "/admin/students" },
  { key: "faculty", label: "Faculty", href: "/admin/faculty" },
  { key: "student_achievements", label: "Student Achievements", href: "/admin/student-achievements" },
  { key: "faculty_achievements", label: "Faculty Achievements", href: "/admin/faculty-achievements" },
  { key: "publications", label: "Publications", href: "/admin/publications" },
  { key: "patents", label: "Patents", href: "/admin/patents" },
  { key: "projects", label: "Projects", href: "/admin/projects" },
  { key: "alumni", label: "Alumni", href: "/admin/alumni" },
  { key: "news", label: "News Articles", href: "/admin/news" },
  { key: "opportunities", label: "Opportunities", href: "/admin/opportunities" },
];

// Colors come from the theme's chart tokens (ocean blue / charcoal / green).
const C1 = "var(--chart-1)";
const C2 = "var(--chart-2)";
const C3 = "var(--chart-3)";

function ChartCard({ title, children, empty }: { title: string; children: React.ReactNode; empty: boolean }) {
  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <h2 className="mb-4 font-semibold">{title}</h2>
      {empty ? <p className="py-16 text-center text-sm text-muted-foreground">No data yet.</p> : <div className="h-64">{children}</div>}
    </section>
  );
}

export default function DashboardPage() {
  const { me } = useAdmin();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api<Stats>("/admin/stats").then(setStats).catch(() => undefined);
  }, []);

  if (!stats) return <Loader2 className="mx-auto mt-20 size-6 animate-spin text-muted-foreground" aria-label="Loading" />;
  const totalAch = stats.counts.student_achievements.total + stats.counts.faculty_achievements.total;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Welcome, {me.full_name}</h1>
        <p className="text-sm text-muted-foreground">Overview of department content. Drafts are not visible on the website.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border-l-4 border-l-primary bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Total achievements</p>
          <p className="mt-1 text-3xl font-semibold">{totalAch}</p>
        </div>
        <Link href="/admin/events" className="rounded-lg border-l-4 border-l-primary bg-card p-5 shadow-sm hover:shadow-md">
          <p className="text-sm text-muted-foreground">Upcoming events</p>
          <p className="mt-1 text-3xl font-semibold">{stats.counts.upcoming_events}</p>
        </Link>
        {CARDS.map((c) => {
          const v = stats.counts[c.key];
          return (
            <Link key={c.key} href={c.href} className="rounded-lg border bg-card p-5 shadow-sm hover:shadow-md">
              <p className="text-sm text-muted-foreground">{c.label}</p>
              <p className="mt-1 text-3xl font-semibold">{v.total}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {v.published} published{v.draft ? ` · ${v.draft} draft` : ""}
              </p>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Achievements by year" empty={!stats.achievements_by_year.length}>
          <ResponsiveContainer>
            <BarChart data={stats.achievements_by_year} maxBarSize={48}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="student" name="Student" fill={C1} radius={[4, 4, 0, 0]} />
              <Bar dataKey="faculty" name="Faculty" fill={C2} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Student achievements by category" empty={!stats.student_achievements_by_category.length}>
          <ResponsiveContainer>
            <BarChart data={stats.student_achievements_by_category} layout="vertical" margin={{ left: 40 }} maxBarSize={28}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="category" width={140} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" name="Achievements" fill={C1} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Placements by academic year" empty={!stats.placements_by_year.length}>
          <ResponsiveContainer>
            <BarChart data={stats.placements_by_year} maxBarSize={48}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="academic_year" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="eligible" name="Eligible" fill={C3} radius={[4, 4, 0, 0]} />
              <Bar dataKey="placed" name="Placed" fill={C1} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Publications by year" empty={!stats.publications_by_year.length}>
          <ResponsiveContainer>
            <LineChart data={stats.publications_by_year}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" name="Publications" stroke={C1} strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Recent activity</h2>
          <Link href="/admin/activity-logs" className="text-sm text-primary hover:underline">All activity →</Link>
        </div>
        {stats.recent_activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ul className="divide-y text-sm">
            {stats.recent_activity.map((a) => (
              <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  <span className="font-medium">{a.admin_name ?? "System"}</span> · {a.action.toLowerCase()} · {a.module}
                  {a.record_label && <span className="text-muted-foreground"> · {a.record_label}</span>}
                </span>
                <time className="text-muted-foreground" dateTime={a.created_at}>{formatDateTime(a.created_at)}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
