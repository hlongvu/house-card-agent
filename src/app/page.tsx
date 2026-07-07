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

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      UPLOADED: "bg-zinc-100 text-zinc-700",
      PARSING: "bg-blue-100 text-blue-700",
      QUANTIFYING: "bg-cyan-100 text-cyan-700",
      RESEARCHING: "bg-indigo-100 text-indigo-700",
      SCHEDULING: "bg-purple-100 text-purple-700",
      ESTIMATING: "bg-violet-100 text-violet-700",
      COMPLETED: "bg-green-100 text-green-700",
      FAILED: "bg-red-100 text-red-700",
    };
    return map[status] || "bg-zinc-100 text-zinc-700";
  };

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            CAD Design Analyzer
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Upload a CAD file and get construction cost estimates, timelines,
            and material breakdowns
          </p>
        </div>

        <UploadDropzone onUpload={handleUpload} />

        {loading ? (
          <div className="mt-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800"
              />
            ))}
          </div>
        ) : projects.length > 0 ? (
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Recent Projects
            </h2>
            <ul className="space-y-2">
              {projects.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}`}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                        {p.title}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`ml-3 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(p.status)}`}
                    >
                      {p.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-8 text-center text-sm text-zinc-400">
            No projects yet. Upload a file to get started.
          </p>
        )}
      </div>
    </div>
  );
}
