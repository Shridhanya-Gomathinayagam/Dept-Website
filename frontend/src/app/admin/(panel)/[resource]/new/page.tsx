"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { RESOURCE_MAP } from "@/lib/admin/resources";
import { ResourceForm } from "@/components/admin/resource-form";

export default function NewRecordPage({ params }: { params: Promise<{ resource: string }> }) {
  const { resource } = use(params);
  const cfg = RESOURCE_MAP[resource];
  if (!cfg) notFound();
  return <ResourceForm cfg={cfg} />;
}
