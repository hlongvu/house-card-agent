import { db } from "@/lib/db";
import AgentStatusList from "@/components/AgentStatusList";
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
        <p className="text-zinc-500">Project not found.</p>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    UPLOADED: "Uploaded",
    PARSING: "Parsing Design",
    QUANTIFYING: "Calculating Quantities",
    RESEARCHING: "Researching Market",
    SCHEDULING: "Drafting Schedule",
    ESTIMATING: "Generating Estimate",
    COMPLETED: "Complete",
    FAILED: "Failed",
  };

  const isComplete = project.status === "COMPLETED";
  const isFailed = project.status === "FAILED";
  const isDone = isComplete || isFailed;

  return (
    <div className="flex flex-1 flex-col px-4 py-8">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6">
          <Link
            href="/"
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            &larr; Back to projects
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {project.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {statusLabels[project.status] || project.status}
          </p>
        </div>

        {isDone && !isComplete && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
            <p className="text-sm text-red-600 dark:text-red-400">
              This project failed during processing.
            </p>
            <form
              action={`/api/projects/${id}/retry`}
              method="POST"
              className="mt-2"
            >
              <button
                type="submit"
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Retry Pipeline
              </button>
            </form>
          </div>
        )}

        {isDone && isComplete && (
          <div className="mb-6">
            <Link
              href={`/projects/${id}/report`}
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              View Final Report &rarr;
            </Link>
          </div>
        )}

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
          <AgentStatusList
            runs={project.agentRuns}
            projectStatus={project.status}
          />
        </div>

        {project.designSpec && (
          <div className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
            <h3 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Design Summary
            </h3>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-zinc-500">Area</dt>
              <dd className="text-zinc-800 dark:text-zinc-200">
                {project.designSpec.gfaM2 ?? "-"} m²
              </dd>
              <dt className="text-zinc-500">Levels</dt>
              <dd className="text-zinc-800 dark:text-zinc-200">
                {project.designSpec.levels ?? "-"}
              </dd>
              <dt className="text-zinc-500">Rooms</dt>
              <dd className="text-zinc-800 dark:text-zinc-200">
                {project.designSpec.rooms ?? "-"}
              </dd>
            </dl>
            {project.designSpec.summary && (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {project.designSpec.summary}
              </p>
            )}
          </div>
        )}

        {project.boq && (
          <div className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
            <h3 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Bill of Quantities
            </h3>
            <p className="text-sm text-zinc-500">
              {project.boq.totalItems} line items computed
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
