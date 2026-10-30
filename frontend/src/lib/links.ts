/** Faculty profiles open as a popup on the faculty page. */
export function facultyHref(slug: string): string {
  return `/faculty?profile=${encodeURIComponent(slug)}`;
}
