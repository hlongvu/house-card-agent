import { db } from "@/lib/db";
import CostTable from "@/components/CostTable";
import Link from "next/link";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const project = await db.project.findUnique({ where: { id } });
  const report = await db.report.findUnique({ where: { projectId: id } });
  const schedule = await db.schedule.findUnique({ where: { projectId: id } });

  if (!project || !report) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="text-center">
          <p className="text-zinc-500">Report not available yet.</p>
          <Link
            href={`/projects/${id}`}
            className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800"
          >
            &larr; Back to project
          </Link>
        </div>
      </div>
    );
  }

  const costJson = report.costJson as any;
  const timelineJson = report.timelineJson as any;
  const risks = report.risks as any[];
  const materials = (report.materials as any[]) || [];
  const laborData = (report.labor as any[]) || [];
  const citations = (report.citations as any[]) || [];
  const assumptions = (report.assumptions as any[]) || [];

  return (
    <div className="flex flex-1 flex-col px-4 py-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6">
          <Link
            href={`/projects/${id}`}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            &larr; Back to project
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {project.title} — Report
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Generated {new Date(report.createdAt).toLocaleString()}
          </p>
        </div>

        {/* Markdown Summary */}
        {report.markdown && (
          <section className="mb-8 rounded-lg border border-zinc-200 p-6 dark:border-zinc-700">
            <h2 className="mb-3 text-lg font-semibold text-zinc-800 dark:text-zinc-200">
              Executive Summary
            </h2>
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{
                __html: report.markdown
                  .replace(/\n/g, "<br/>")
                  .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                  .replace(/## (.*)/g, "<h3 class='font-semibold mt-4 mb-2'>$1</h3>"),
              }}
            />
          </section>
        )}

        {/* Cost Breakdown */}
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-zinc-800 dark:text-zinc-200">
            Cost Breakdown
          </h2>
          <CostTable cost={costJson} />
        </section>

        {/* Construction Schedule */}
        {schedule && (
          <ScheduleSection
            schedule={{
              id: schedule.id,
              phases: (schedule.phases as any[]) || [],
              totalDurationDays: schedule.totalDurationDays,
              startDate: schedule.startDate,
              endDate: schedule.endDate,
              criticalPath: (schedule.criticalPath as any[]) || [],
              riskFactors: (schedule.riskFactors as any[]) || [],
              notes: (schedule.notes as any[]) || [],
            }}
          />
        )}

        {/* Cost Timeline (high-level from estimator) */}
        <section className="mb-8 rounded-lg border border-zinc-200 p-6 dark:border-zinc-700">
          <h2 className="mb-3 text-lg font-semibold text-zinc-800 dark:text-zinc-200">
            Cost Timeline Summary
          </h2>
          {timelineJson?.phases && timelineJson.phases.length > 0 ? (
            <div className="space-y-2">
              {timelineJson.phases.map((phase: any, i: number) => {
                const total = phase.laborByTrade?.reduce(
                  (s: number, l: any) => s + l.manDays, 0) || 0;
                return (
                  <div key={i} className="flex items-center gap-3 text-sm border-b border-zinc-100 dark:border-zinc-800 py-1">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300 w-40">
                      {phase.name}
                    </span>
                    <span className="text-zinc-500 text-xs">
                      Day {phase.startDay}–{phase.endDay} ({phase.durationDays}d)
                    </span>
                    {total > 0 && (
                      <span className="text-zinc-400 text-xs">
                        {total} man-days
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No timeline data available.</p>
          )}
        </section>

        {/* Materials */}
        {materials.length > 0 && (
          <section className="mb-8 rounded-lg border border-zinc-200 p-6 dark:border-zinc-700">
            <h2 className="mb-3 text-lg font-semibold text-zinc-800 dark:text-zinc-200">
              Materials Summary
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Category</th>
                    <th className="px-3 py-2 text-left font-medium">Item</th>
                    <th className="px-3 py-2 text-right font-medium">Qty</th>
                    <th className="px-3 py-2 text-left font-medium">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {materials.map((m: any, i: number) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-zinc-500">{m.category}</td>
                      <td className="px-3 py-2 text-zinc-800 dark:text-zinc-200">
                        {m.item}
                      </td>
                      <td className="px-3 py-2 text-right text-zinc-800 dark:text-zinc-200">
                        {m.qty}
                      </td>
                      <td className="px-3 py-2 text-zinc-500">{m.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Labor */}
        {laborData.length > 0 && (
          <section className="mb-8 rounded-lg border border-zinc-200 p-6 dark:border-zinc-700">
            <h2 className="mb-3 text-lg font-semibold text-zinc-800 dark:text-zinc-200">
              Labor Summary
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {laborData.map((l: any, i: number) => (
                <div
                  key={i}
                  className="flex justify-between rounded border border-zinc-200 dark:border-zinc-700 p-3"
                >
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {l.trade}
                  </span>
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    {l.manDays} man-days
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Risks */}
        {risks.length > 0 && (
          <section className="mb-8 rounded-lg border border-zinc-200 p-6 dark:border-zinc-700">
            <h2 className="mb-3 text-lg font-semibold text-zinc-800 dark:text-zinc-200">
              Risks &amp; Mitigations
            </h2>
            <ul className="space-y-2">
              {risks.map((r: any, i: number) => {
                const levelColors: Record<string, string> = {
                  low: "bg-yellow-100 text-yellow-800",
                  medium: "bg-orange-100 text-orange-800",
                  high: "bg-red-100 text-red-800",
                };
                return (
                  <li key={i} className="rounded border border-zinc-200 dark:border-zinc-700 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${levelColors[r.level] || "bg-zinc-100 text-zinc-700"}`}
                      >
                        {r.level}
                      </span>
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {r.title}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {r.description}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Citations */}
        {citations.length > 0 && (
          <section className="mb-8 rounded-lg border border-zinc-200 p-6 dark:border-zinc-700">
            <h2 className="mb-3 text-lg font-semibold text-zinc-800 dark:text-zinc-200">
              Sources &amp; Citations
            </h2>
            <ul className="space-y-1">
              {citations.map((c: any, i: number) => (
                <li key={i}>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline"
                  >
                    {c.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Assumptions */}
        {assumptions.length > 0 && (
          <section className="mb-8 rounded-lg border border-zinc-200 p-6 dark:border-zinc-700">
            <h2 className="mb-3 text-lg font-semibold text-zinc-800 dark:text-zinc-200">
              Assumptions
            </h2>
            <ul className="list-inside list-disc space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              {assumptions.map((a: string, i: number) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

// ── Schedule Section ──

type ScheduleData = {
  id: string;
  phases: any[];
  totalDurationDays: number;
  startDate: string | null;
  endDate: string | null;
  criticalPath: any[];
  riskFactors: any[];
  notes: any[];
};

const categoryColors: Record<string, string> = {
  "site-prep": "bg-gray-500",
  foundation: "bg-amber-600",
  structure: "bg-blue-500",
  roofing: "bg-orange-500",
  "mep-rough": "bg-yellow-500",
  plaster: "bg-teal-500",
  tile: "bg-cyan-500",
  finish: "bg-purple-500",
  handover: "bg-green-500",
};

function ScheduleSection({ schedule }: { schedule: ScheduleData }) {
  const phases = schedule.phases || [];
  const total = schedule.totalDurationDays || 0;
  const criticalPath = (schedule.criticalPath as string[]) || [];
  const riskFactors = (schedule.riskFactors as any[]) || [];
  const notes = (schedule.notes as string[]) || [];

  const fmtDate = (iso: string | null) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  return (
    <section className="mb-8 space-y-4">
      <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-700">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
            Construction Schedule
          </h2>
          <span className="text-sm text-zinc-500">
            {total} days (~{(total / 30).toFixed(1)} months)
          </span>
        </div>
        <p className="mb-4 text-sm text-zinc-500">
          {fmtDate(schedule.startDate)} → {fmtDate(schedule.endDate)}
        </p>

        {/* Gantt bars */}
        <div className="space-y-1.5">
          {phases.map((phase, i) => {
            const left = total > 0 ? (phase.startDay / total) * 100 : 0;
            const width = total > 0 ? (phase.durationDays / total) * 100 : 0;
            const color = categoryColors[phase.category] || "bg-zinc-500";
            const isCritical = criticalPath.includes(phase.id);

            return (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="w-32 shrink-0 truncate text-right text-zinc-600 dark:text-zinc-400" title={phase.name}>
                  {phase.name}
                </span>
                <div className="relative flex-1 h-6">
                  <div
                    className={`absolute top-0 h-full rounded ${color} ${isCritical ? "ring-2 ring-red-400" : ""} flex items-center px-2 text-white font-medium truncate`}
                    style={{
                      left: `${left}%`,
                      width: `${Math.max(width, 2)}%`,
                    }}
                    title={`${phase.name} — Day ${phase.startDay} to ${phase.endDay}`}
                  >
                    {phase.durationDays}d
                  </div>
                </div>
                {phase.weatherSensitive && (
                  <span className="shrink-0 text-amber-500" title="Weather sensitive">☂</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-zinc-500">
          {Object.entries(categoryColors).map(([cat, color]) => (
            <span key={cat} className="flex items-center gap-1">
              <span className={`inline-block h-2.5 w-2.5 rounded ${color}`} />
              {cat}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded border-2 border-red-400" />
            critical
          </span>
          <span>☂ weather-sensitive</span>
        </div>
      </div>

      {/* Phase details */}
      <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-700">
        <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Phase Details
        </h3>
        <div className="space-y-3">
          {phases.map((phase, i) => {
            const totalManDays = phase.laborByTrade?.reduce(
              (s: number, l: any) => s + l.manDays,
              0
            ) || 0;
            const totalWorkers = phase.laborByTrade?.reduce(
              (s: number, l: any) => s + l.workers,
              0
            ) || 0;
            const isCritical = criticalPath.includes(phase.id);

            return (
              <div
                key={i}
                className={`rounded border p-3 ${isCritical ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20" : "border-zinc-200 dark:border-zinc-700"}`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded ${categoryColors[phase.category] || "bg-zinc-500"}`}
                    />
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {phase.name}
                    </span>
                    {isCritical && (
                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                        CRITICAL
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500">
                    Day {phase.startDay}–{phase.endDay}
                  </span>
                </div>
                {phase.description && (
                  <p className="mb-1 text-xs text-zinc-600 dark:text-zinc-400">
                    {phase.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-zinc-500">
                  <span>Duration: {phase.durationDays}d</span>
                  {totalWorkers > 0 && <span>Crew: {totalWorkers} workers</span>}
                  {totalManDays > 0 && <span>Effort: {totalManDays} man-days</span>}
                  {phase.dependsOn?.length > 0 && (
                    <span>Depends on: {phase.dependsOn.join(", ")}</span>
                  )}
                </div>
                {phase.keyMaterials?.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {phase.keyMaterials.map((m: string, j: number) => (
                      <span
                        key={j}
                        className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                )}
                {phase.laborByTrade?.length > 0 && (
                  <div className="mt-1 text-xs text-zinc-500">
                    {phase.laborByTrade.map((l: any, j: number) => (
                      <span key={j} className="mr-3">
                        {l.trade}: {l.workers}p × {l.manDays}md
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Critical path */}
      {criticalPath.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
          <h3 className="mb-2 text-sm font-semibold text-red-700 dark:text-red-400">
            Critical Path
          </h3>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            {criticalPath.join(" → ")}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Delays in any of these phases will extend the project completion date.
          </p>
        </div>
      )}

      {/* Schedule risk factors */}
      {riskFactors.length > 0 && (
        <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-700">
          <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Schedule Risks
          </h3>
          <ul className="space-y-2">
            {riskFactors.map((r: any, i: number) => {
              const levelColors: Record<string, string> = {
                low: "bg-yellow-100 text-yellow-800",
                medium: "bg-orange-100 text-orange-800",
                high: "bg-red-100 text-red-800",
              };
              return (
                <li key={i} className="rounded border border-zinc-200 dark:border-zinc-700 p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${levelColors[r.level]}`}>
                      {r.level}
                    </span>
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {r.title}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">{r.description}</p>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Notes */}
      {notes.length > 0 && (
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
          <h3 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Notes</h3>
          <ul className="list-inside list-disc space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
            {notes.map((n: string, i: number) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
