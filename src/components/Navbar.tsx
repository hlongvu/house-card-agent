"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/60 bg-cream/80 backdrop-blur-xl supports-[backdrop-filter]:bg-cream/60 dark:border-zinc-800/60 dark:bg-charcoal-900/80 dark:supports-[backdrop-filter]:bg-charcoal-900/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link
          href="/"
          className="group flex items-center gap-2.5 text-sm font-semibold tracking-tight text-charcoal-800 dark:text-stone-100"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-terracotta-600 text-white shadow-sm transition-transform group-hover:scale-105">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1"
              />
            </svg>
          </span>
          <span className="hidden sm:inline">House Plan Analyzer</span>
        </Link>

        <nav className="flex items-center gap-1">
          {!isHome && (
            <Link
              href="/"
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-300"
            >
              All Projects
            </Link>
          )}
          {isHome && (
            <span className="rounded-lg px-3 py-1.5 text-xs font-medium text-terracotta-600 dark:text-terracotta-400">
              CAD {">"} Build
            </span>
          )}
        </nav>
      </div>
    </header>
  );
}
