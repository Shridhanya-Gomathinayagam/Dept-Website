"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV, navPath } from "./nav";

interface Props {
  name: string;
  shortName?: string | null;
  /** Sub-link hrefs to omit (home sections with nothing published). */
  hiddenLinks?: string[];
}

export function SiteHeader({ name, shortName, hiddenLinks = [] }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const nav = NAV.map((item) => (item.children ? { ...item, children: item.children.filter((c) => !hiddenLinks.includes(c.href)) } : item));

  useEffect(() => {
    setMobileOpen(false);
    setOpenMenu(null);
  }, [pathname]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    }
    function onClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenMenu(null);
    }
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const isActive = (href: string) => {
    const path = navPath(href);
    return path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`);
  };
  // Only plain links (no query or #section) get the "current page" style inside a submenu.
  const isCurrent = (href: string) => !/[?#]/.test(href) && isActive(href);
  // On the home page the header starts transparent over the (dark) hero, which slides under it.
  const transparent = pathname === "/" && !scrolled && !mobileOpen;
  const deptLabel = shortName ? `Dept of ${shortName}` : name;

  return (
    <header
      className={cn(
        // No border: the header must be exactly h-16 so the home hero (-mt-16) reaches the top edge.
        // The divider line is drawn with an inset shadow instead.
        "theme-dark sticky top-0 z-40 transition-colors duration-300",
        transparent
          ? "bg-transparent"
          : mobileOpen
            ? "bg-band shadow-[inset_0_-1px_0_rgba(255,255,255,0.1)]" // solid: the open menu covers page content
            : // Glass: content scrolling underneath shows through, blurred. 70% tint keeps white text
              // readable over white sections; solid fallback where backdrop blur is unsupported.
              "bg-band/95 shadow-[inset_0_-1px_0_rgba(255,255,255,0.1),0_8px_32px_rgba(0,0,0,0.25)] supports-[backdrop-filter]:bg-band/70 supports-[backdrop-filter]:backdrop-blur-xl supports-[backdrop-filter]:backdrop-saturate-150",
      )}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex min-w-0 shrink-0 items-center gap-3">
          {/* White badge: the logo's navy details are not visible directly on the dark header. */}
          <span className="flex h-11 w-14 shrink-0 items-center justify-center rounded-xl bg-white px-1.5 shadow-md shadow-sky-500/20 ring-1 ring-white/20 transition group-hover:shadow-sky-400/40">
            <Image src="/kpriet-logo-mark.png" alt="" width={134} height={85} priority className="h-auto w-full" />
          </span>
          <span className="flex min-w-0 flex-col leading-none">
            <span className="font-heading text-xl font-extrabold tracking-[0.12em]">KPRIET</span>
            <span className="mt-1 truncate text-xs font-medium tracking-wide text-sky-300/90">{deptLabel}</span>
          </span>
          <span className="sr-only">: home</span>
        </Link>

        <nav ref={navRef} aria-label="Main" className="ml-auto hidden xl:block">
          <ul className="flex items-center">
            {nav.map((item, idx) => {
              const open = openMenu === item.label;
              const active = isActive(item.href);
              return (
                <li
                  key={item.label}
                  className="relative"
                  onMouseEnter={item.children ? () => setOpenMenu(item.label) : undefined}
                  onMouseLeave={item.children ? () => setOpenMenu((m) => (m === item.label ? null : m)) : undefined}
                >
                  <div className={cn("flex items-center text-sm font-medium transition-colors", active || open ? "text-foreground" : "text-foreground/85 hover:text-foreground")}>
                    <Link
                      href={item.href}
                      aria-current={isCurrent(item.href) ? "page" : undefined}
                      className={cn(
                        // Cyan underline: grows in on hover, stays under the active section.
                        "relative whitespace-nowrap py-2 pl-2 after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:origin-left after:rounded-full after:bg-highlight after:transition-transform after:duration-200",
                        item.children ? "pr-0.5" : "pr-2",
                        active ? "after:scale-x-100" : "after:scale-x-0 hover:after:scale-x-100",
                      )}
                    >
                      {item.label}
                    </Link>
                    {item.children && (
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={`menu-${idx}`}
                      aria-label={`${item.label} sections`}
                      onClick={() => setOpenMenu(open ? null : item.label)}
                      className="flex h-9 items-center pl-0.5 pr-1.5"
                    >
                      <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180 text-highlight")} aria-hidden />
                    </button>
                    )}
                  </div>
                  {open && item.children && (
                    // pt-2 instead of a margin keeps the hover area continuous between the label and the menu.
                    <div id={`menu-${idx}`} className={cn("absolute top-full z-50 pt-2", idx >= NAV.length - 3 ? "right-0" : "left-0")}>
                      <ul className="w-64 rounded-xl border bg-popover p-1.5 shadow-xl">
                        {item.children.map((c) => (
                          <li key={c.href}>
                            <Link
                              href={c.href}
                              onClick={() => setOpenMenu(null)}
                              aria-current={isCurrent(c.href) ? "page" : undefined}
                              className={cn("block rounded-md px-3 py-2 text-sm transition hover:translate-x-0.5 hover:bg-muted hover:text-primary", isCurrent(c.href) && "bg-secondary text-secondary-foreground")}
                            >
                              {c.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1 xl:ml-1">
          <Link href="/search" className="flex size-10 items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-white/10 hover:text-foreground" aria-label="Search the website">
            <Search className="size-5" aria-hidden />
          </Link>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-md hover:bg-white/10 xl:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav id="mobile-nav" aria-label="Mobile" className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t bg-band px-4 py-2 xl:hidden">
          <ul className="divide-y divide-white/10">
            {nav.map((item) => (
              <li key={item.label}>
                {!item.children ? (
                  <Link href={item.href} onClick={() => setMobileOpen(false)} className={cn("block py-3 font-medium", isActive(item.href) && "text-highlight")}>
                    {item.label}
                  </Link>
                ) : (
                <details className="group" open={isActive(item.href) && item.href !== "/"}>
                  <summary className={cn("flex cursor-pointer list-none items-center justify-between py-3 font-medium [&::-webkit-details-marker]:hidden", isActive(item.href) && "text-highlight")}>
                    {item.label}
                    <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <ul className="pb-3">
                    <li>
                      <Link href={item.href} onClick={() => setMobileOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium text-highlight hover:bg-white/10">
                        {item.label} overview
                      </Link>
                    </li>
                    {item.children.map((c) => (
                      <li key={c.href}>
                        <Link href={c.href} onClick={() => setMobileOpen(false)} className="block rounded-md px-3 py-2 text-sm text-foreground/80 hover:bg-white/10 hover:text-foreground">
                          {c.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
                )}
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
