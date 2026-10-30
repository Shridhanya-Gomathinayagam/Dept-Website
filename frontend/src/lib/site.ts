import "server-only";
import { cache } from "react";
import type { Metadata } from "next";
import { apiGet, apiGetOrNull } from "./api";
import type { Department, Options } from "./types";

/** Department profile; null when not configured yet or the API is unavailable (layout must still render). */
export const getDepartment = cache(async (): Promise<Department | null> => {
  try {
    return await apiGetOrNull<Department>("/department");
  } catch {
    return null;
  }
});

/**
 * Home-page sections that only render when they have published content. Their menu links are
 * hidden while empty so they never point at a missing section. Errors count as "has content".
 */
export const getOptionalHomeSections = cache(async (): Promise<{ highlights: boolean; mous: boolean }> => {
  const has = async (path: string) => {
    try {
      return (await apiGet<{ total: number }>(path, { page_size: 1 })).total > 0;
    } catch {
      return true;
    }
  };
  const [highlights, mous] = await Promise.all([has("/highlights"), has("/mous")]);
  return { highlights, mous };
});

export const getOptions = cache(() => apiGet<Options>("/meta/options", undefined, 3600));

export async function pageMetadata(title: string, description: string, path: string): Promise<Metadata> {
  const dept = await getDepartment();
  const site = dept?.short_name ? `Department of ${dept.short_name}` : (dept?.name ?? "Department");
  const fullTitle = `${title} | ${site}`;
  return {
    title: fullTitle,
    description,
    alternates: { canonical: path },
    openGraph: { title: fullTitle, description, url: path, siteName: site, type: "website" },
  };
}
