import { db } from "@/lib/db";
import AgentStatusList from "@/components/AgentStatusList";
import AutoRetryFailed from "@/components/AutoRetryFailed";
import Link from "next/link";

async function getProject(id: string) {
  const project = await db.project.findUnique({
    where: { id },
    include: {
      inputFile: {
        select: { filename: true, mimeType: true, sizeBytes: true },
      },
      designSpec: {
        select: { summary: true, gfaM2: true, rooms: true, levels: true },
      },
      boq: {
        select: { totalItems: true },
      },
      agentRuns: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
  return project;
}

const STATUS_INFO: Record<string, { label: string; color: string }> = {
  UPLOADED: { label: "Uploaded", color: "bg-stone-100 text-stone-600 dark:bg-zinc-800 dark:text-zinc-400" },
  PARSING: { label: "Parsing Design", color: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400" },
  QUANTIFYING: { label: "Calculating Quantities", color: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400" },
  RESEARCHING: { label: "Researching Market", color: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400" },
  SCHEDULING: { label: "Drafting Schedule", color: "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400" },
  ESTIMATING: { label: "Generating Estimate", color: "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400" },
  COMPLETED: { label: "Complete", color: "bg-sage-50 text-sage-700 dark:bg-sage-950/30 dark:text-sage-400" },
  FAILED: { label: "Failed", color: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400" },
};

function formatBytes(bytes?: number) {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-stone-200/80 bg-white p-4 transition-shadow hover:shadow-sm dark:border-zinc-800 dark:bg-charcoal-800">
      <div className="flex items-center gap-2 text-stone-400 dark:text-zinc-500">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="mt-2 font-serif text-2xl font-semibold text-charcoal-800 dark:text-stone-100">
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-xs text-stone-400 dark:text-zinc-500">{sub}</p>
      )}
    </div>
  );
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-stone-500">Project not found.</p>
      </div>
    );
  }

  const status = STATUS_INFO[project.status] || STATUS_INFO.UPLOADED;
  const isComplete = project.status === "COMPLETED";
  const isFailed = project.status === "FAILED";
  const isActive = !isComplete && !isFailed;

  return (
    <div className="flex flex-1 flex-col">
      {/* Project header */}
      <header className="border-b border-stone-200/60 bg-white dark:border-zinc-800/60 dark:bg-charcoal-900">
        <div className="mx-auto max-w-4xl px-4 pb-6 pt-6">
          <Link
            href="/"
            className="group mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 transition-colors hover:text-terracotta-600 dark:text-zinc-400 dark:hover:text-terracotta-400"
          >
            <svg
              className="h-3 w-3 transition-transform group-hover:-translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            All projects
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.color}`}
                >
                  {status.label}
                </span>
                {isActive && (
                  <span className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-zinc-500">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                    Live
                  </span>
                )}
              </div>
              <h1 className="font-serif text-2xl font-bold tracking-tight text-charcoal-800 dark:text-stone-100 sm:text-3xl">
                {project.title}
              </h1>
              {project.inputFile && (
                <p className="mt-1 font-mono text-xs text-stone-400 dark:text-zinc-500">
                  {project.inputFile.filename}
                  {project.inputFile.sizeBytes && (
                    <> · {formatBytes(project.inputFile.sizeBytes)}</>
                  )}
                </p>
              )}
            </div>

            {isComplete && (
              <Link
                href={`/projects/${id}/report`}
                className="group inline-flex items-center gap-2 rounded-xl bg-charcoal-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-charcoal-900 hover:shadow-md dark:bg-stone-100 dark:text-charcoal-900 dark:hover:bg-white"
              >
                View Report
                <svg
                  className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
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
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-8">
        {isFailed && (
          <div className="mb-6 animate-fade-in rounded-xl border border-red-200/80 bg-red-50/60 p-5 dark:border-red-800/40 dark:bg-red-950/20">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                <svg
                  className="h-4 w-4 text-red-600 dark:text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                  Processing failed
                </p>
                <p className="mt-1 text-xs text-red-600/80 dark:text-red-400/80">
                  The pipeline encountered an error. You can retry the
                  process below.
                </p>
                <form
                  action={`/api/projects/${id}/retry`}
                  method="POST"
                  className="mt-3"
                >
                  <button
                    type="submit"
                    className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
                  >
                    Retry Pipeline
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        <AutoRetryFailed projectId={project.id} status={project.status} />

        {/* Quick stats */}
        {(project.designSpec || project.boq) && (
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {project.designSpec?.gfaM2 != null && (
              <StatCard
                label="Area"
                value={`${project.designSpec.gfaM2.toFixed(0)}`}
                sub="m² floor"
                icon={
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                }
              />
            )}
            {project.designSpec?.rooms != null && (
              <StatCard
                label="Rooms"
                value={`${project.designSpec.rooms}`}
                sub="total"
                icon={
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
                  </svg>
                }
              />
            )}
            {project.designSpec?.levels != null && (
              <StatCard
                label="Levels"
                value={`${project.designSpec.levels}`}
                sub="floors"
                icon={
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                }
              />
            )}
            {project.boq && (
              <StatCard
                label="Materials"
                value={`${project.boq.totalItems}`}
                sub="line items"
                icon={
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                }
              />
            )}
          </div>
        )}

        {/* Agent pipeline */}
        <section className="rounded-2xl border border-stone-200/80 bg-white p-6 card-elevated dark:border-zinc-800 dark:bg-charcoal-800">
          <AgentStatusList
            runs={project.agentRuns}
            projectStatus={project.status}
          />
        </section>

        {/* Design summary */}
        {project.designSpec && (
          <section className="mt-6 rounded-2xl border border-stone-200/80 bg-white p-6 dark:border-zinc-800 dark:bg-charcoal-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-stone-400 dark:text-zinc-500">
                Design Summary
              </h3>
              <svg
                className="h-4 w-4 text-stone-300 dark:text-zinc-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            {project.designSpec.summary && (
              <p className="text-sm leading-relaxed text-stone-600 dark:text-zinc-300">
                {project.designSpec.summary}
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
