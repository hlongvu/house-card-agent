"use client";

import { useState, useEffect, useCallback } from "react";
import UploadDropzone from "@/components/UploadDropzone";
import Link from "next/link";

type ProjectSummary = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  inputFile?: { filename: string };
};

const STATUS_CONFIG: Record<
  string,
  { label: string; dot: string; badge: string }
> = {
  UPLOADED: {
    label: "Uploaded",
    dot: "bg-stone-300",
    badge:
      "bg-stone-100 text-stone-600 dark:bg-zinc-800 dark:text-zinc-400",
  },
  PARSING: {
    label: "Parsing",
    dot: "bg-blue-400 animate-pulse",
    badge: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
  },
  QUANTIFYING: {
    label: "Quantifying",
    dot: "bg-cyan-400 animate-pulse",
    badge:
      "bg-cyan-50 text-cyan-600 dark:bg-cyan-950/30 dark:text-cyan-400",
  },
  RESEARCHING: {
    label: "Researching",
    dot: "bg-indigo-400 animate-pulse",
    badge:
      "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400",
  },
  SCHEDULING: {
    label: "Scheduling",
    dot: "bg-violet-400 animate-pulse",
    badge:
      "bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400",
  },
  ESTIMATING: {
    label: "Estimating",
    dot: "bg-violet-400 animate-pulse",
    badge:
      "bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400",
  },
  COMPLETED: {
    label: "Completed",
    dot: "bg-sage-400",
    badge:
      "bg-sage-50 text-sage-600 dark:bg-sage-950/30 dark:text-sage-400",
  },
  FAILED: {
    label: "Failed",
    dot: "bg-red-400",
    badge: "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400",
  },
};

const FORMAT_ICONS: Record<string, string> = {
  pdf: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z",
  dwg: "M4 4a2 2 0 012-2h8l6 6v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z",
  dxf: "M4 4a2 2 0 012-2h8l6 6v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z",
  skp: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  jpg: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
  jpeg: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
  png: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
  glb: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  gltf: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  obj: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
};

function getFileIcon(filename?: string) {
  if (!filename) return "dwg";
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return FORMAT_ICONS[ext] ? ext : "dwg";
}

function formatTimeAgo(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function Home() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) setProjects(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleUpload = (project: { id: string; title: string }) => {
    setProjects((prev) => [
      {
        id: project.id,
        title: project.title,
        status: "UPLOADED",
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  return (
    <div className="flex flex-1 flex-col items-center">
      {/* Hero */}
      <section className="relative w-full overflow-hidden border-b border-stone-200/60 bg-white dark:border-zinc-800/60 dark:bg-charcoal-900">
        <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.04] dark:opacity-[0.08]" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-stone-100 opacity-40 blur-3xl dark:bg-zinc-800 dark:opacity-30" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-terracotta-100 opacity-30 blur-3xl dark:bg-terracotta-900/20 dark:opacity-30" />

        <div className="relative mx-auto flex max-w-2xl flex-col items-center px-4 pb-14 pt-16 text-center">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-terracotta-600 shadow-lg shadow-terracotta-600/20">
            <svg
              className="h-6 w-6 text-white"
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
          </div>

          <h1 className="font-serif text-3xl font-bold tracking-tight text-charcoal-800 dark:text-stone-100 sm:text-4xl">
            From Blueprint to Build
          </h1>
          <p className="mt-3 max-w-md text-balance text-sm leading-relaxed text-stone-500 dark:text-zinc-400">
            Upload any CAD file or blueprint and get an instant construction
            estimate — costs, materials, labor, and project timeline.
          </p>

          {/* Stat pills */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-stone-400 dark:text-zinc-500">
            <span className="flex items-center gap-1.5">
              <svg
                className="h-3.5 w-3.5 text-sage-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              AI-powered analysis
            </span>
            <span className="flex items-center gap-1.5">
              <svg
                className="h-3.5 w-3.5 text-sage-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Multi-agent pipeline
            </span>
            <span className="flex items-center gap-1.5">
              <svg
                className="h-3.5 w-3.5 text-sage-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Detailed reports
            </span>
          </div>
        </div>
      </section>

      {/* Upload Zone */}
      <section className="relative -mt-8 w-full max-w-xl px-4">
        <div className="card-elevated rounded-2xl bg-white p-6 dark:bg-charcoal-800">
          <UploadDropzone onUpload={handleUpload} />
        </div>
      </section>

      {/* Project List */}
      <section className="w-full max-w-2xl px-4 pb-16 pt-12">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[72px] animate-pulse rounded-xl bg-stone-100 dark:bg-zinc-800/50"
              />
            ))}
          </div>
        ) : projects.length > 0 ? (
          <>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-zinc-500">
                Recent Projects
              </h2>
              <span className="text-xs text-stone-300 dark:text-zinc-600">
                {projects.length} project{projects.length !== 1 ? "s" : ""}
              </span>
            </div>
            <ul className="space-y-2">
              {projects.map((p, idx) => {
                const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.UPLOADED;
                const isActive = !["COMPLETED", "FAILED"].includes(p.status);
                const fileExt = getFileIcon(p.inputFile?.filename);

                return (
                  <li
                    key={p.id}
                    className="animate-slide-up"
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    <Link
                      href={`/projects/${p.id}`}
                      className="group flex items-center gap-4 rounded-xl border border-stone-200/80 bg-white p-4 transition-all duration-200 hover:border-terracotta-200 hover:shadow-md dark:border-zinc-800 dark:bg-charcoal-800 dark:hover:border-terracotta-800"
                    >
                      {/* File type icon */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-400 dark:bg-zinc-800 dark:text-zinc-500">
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d={FORMAT_ICONS[fileExt] || FORMAT_ICONS.dwg}
                          />
                        </svg>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-charcoal-800 group-hover:text-terracotta-700 dark:text-stone-200 dark:group-hover:text-terracotta-400">
                          {p.title}
                        </p>
                        <p className="text-xs text-stone-400 dark:text-zinc-500">
                          {formatTimeAgo(p.createdAt)}
                          {p.inputFile?.filename && (
                            <>
                              {" · "}
                              <span className="font-mono text-[11px]">
                                .{p.inputFile.filename.split(".").pop()}
                              </span>
                            </>
                          )}
                        </p>
                      </div>

                      {/* Status indicator */}
                      <div className="flex items-center gap-2">
                        {isActive && (
                          <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                        )}
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${cfg.badge}`}
                        >
                          {cfg.label}
                        </span>
                        <svg
                          className="h-4 w-4 text-stone-300 transition-transform group-hover:translate-x-0.5 dark:text-zinc-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-stone-200 py-12 text-center dark:border-zinc-800">
            <svg
              className="mx-auto h-8 w-8 text-stone-300 dark:text-zinc-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            <p className="mt-3 text-sm font-medium text-stone-400 dark:text-zinc-500">
              No projects yet
            </p>
            <p className="mt-1 text-xs text-stone-300 dark:text-zinc-600">
              Upload a CAD file above to get started
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
