"use client";

import { Suspense, use } from "react";
import { notFound } from "next/navigation";
import { RESOURCE_MAP } from "@/lib/admin/resources";
import { ResourceTable } from "@/components/admin/resource-table";

export default function ResourceListPage({ params }: { params: Promise<{ resource: string }> }) {
  const { resource } = use(params);
  const cfg = RESOURCE_MAP[resource];
  if (!cfg) notFound();
  return (
    <Suspense>
      <ResourceTable key={cfg.key} cfg={cfg} />
    </Suspense>
  );
}
