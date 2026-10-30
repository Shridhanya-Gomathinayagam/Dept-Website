import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getDepartment, getOptionalHomeSections } from "@/lib/site";

// Render on request so admin changes appear immediately and builds never need the API.
export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [dept, sections] = await Promise.all([getDepartment(), getOptionalHomeSections()]);
  const hiddenLinks = [!sections.highlights && "/#highlights", !sections.mous && "/#mous"].filter(Boolean) as string[];
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader name={dept?.name ?? "Department"} shortName={dept?.short_name} hiddenLinks={hiddenLinks} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter dept={dept} />
    </div>
  );
}
