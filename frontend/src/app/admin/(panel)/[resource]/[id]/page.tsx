"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api, ClientApiError } from "@/lib/client-api";
import { RESOURCE_MAP } from "@/lib/admin/resources";
import { ResourceForm } from "@/components/admin/resource-form";
import { GalleryImagesManager } from "@/components/admin/gallery-images";

type Rec = Record<string, unknown> & { id: number; status: string };

export default function EditRecordPage({ params }: { params: Promise<{ resource: string; id: string }> }) {
  const { resource, id } = use(params);
  const cfg = RESOURCE_MAP[resource];
  const [record, setRecord] = useState<Rec | null>(null);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);

  useEffect(() => {
    if (!cfg || !/^\d+$/.test(id)) return;
    api<Rec>(`/admin/${cfg.key}/${id}`)
      .then(setRecord)
      .catch((e) => setError({ status: e instanceof ClientApiError ? e.status : 0, message: e.message }));
  }, [cfg, id]);

  if (!cfg || !/^\d+$/.test(id)) notFound();
  if (error) {
    return (
      <div className="rounded-lg border bg-card p-10 text-center">
        <p className="font-medium">{error.status === 404 ? `This ${cfg.singular.toLowerCase()} does not exist.` : error.message}</p>
        <Link href={`/admin/${cfg.key}`} className="mt-3 inline-block text-primary hover:underline">Back to {cfg.label}</Link>
      </div>
    );
  }
  if (!record) {
    return <Loader2 className="mx-auto mt-20 size-6 animate-spin text-muted-foreground" aria-label="Loading" />;
  }
  return (
    <ResourceForm key={record.id} cfg={cfg} record={record}>
      {cfg.key === "gallery" && <GalleryImagesManager albumId={record.id} />}
    </ResourceForm>
  );
}
