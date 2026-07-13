import { db } from "@/lib/db";
import CostTable from "@/components/CostTable";
import TimelineView from "@/components/TimelineView";
import PrintButton from "@/components/PrintButton";
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
          <p className="text-stone-500">Report not available yet.</p>
          <Link
            href={`/projects/${id}`}
            className="mt-3 inline-flex items-center gap-1 text-sm text-terracotta-600 hover:text-terracotta-700"
          >
            <svg
              className="h-3 w-3"
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
            Back to project
          </Link>
        </div>
      </div>
    );
  }

  const costJson = report.costJson as any;
  const timelineJson = report.timelineJson as any;
  const risks = (report.risks as any[]) || [];
  const materials = (report.materials as any[]) || [];
  const laborData = (report.labor as any[]) || [];
  const citations = (report.citations as any[]) || [];
  const assumptions = (report.assumptions as any[]) || [];

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="border-b border-stone-200/60 bg-white dark:border-zinc-800/60 dark:bg-charcoal-900">
        <div className="mx-auto max-w-4xl px-4 pb-6 pt-6">
          <Link
            href={`/projects/${id}`}
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
            Back to project
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-sage-50 px-2.5 py-1 text-[11px] font-semibold text-sage-600 dark:bg-sage-950/30 dark:text-sage-400">
                  Final Report
                </span>
                <span className="text-xs text-stone-400 dark:text-zinc-500">
                  Generated {new Date(report.createdAt).toLocaleString()}
                </span>
              </div>
              <h1 className="font-serif text-2xl font-bold tracking-tight text-charcoal-800 dark:text-stone-100 sm:text-3xl">
                {project.title}
              </h1>
            </div>

            <PrintButton />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl space-y-8 px-4 pb-16 pt-8">
        {/* Executive Summary */}
        {report.markdown && (
          <section className="relative overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-6 card-elevated dark:border-zinc-800 dark:bg-charcoal-800">
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-terracotta-100/40 blur-3xl dark:bg-terracotta-900/10" />
            <div className="relative">
              <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-stone-400 dark:text-zinc-500">
                Executive Summary
              </h2>
              <div
                className="prose prose-sm max-w-none text-stone-600 dark:text-zinc-300 dark:prose-invert prose-headings:font-serif prose-headings:font-semibold prose-headings:text-charcoal-800 dark:prose-headings:text-stone-100 prose-strong:text-charcoal-800 dark:prose-strong:text-stone-100 prose-strong:font-semibold"
                dangerouslySetInnerHTML={{
                  __html: report.markdown
                    .replace(/\n/g, "<br/>")
                    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                    .replace(
                      /## (.*)/g,
                      "<h3 class='font-serif text-lg font-semibold mt-5 mb-2 text-charcoal-800 dark:text-stone-100'>$1</h3>"
                    ),
                }}
              />
            </div>
          </section>
        )}

        {/* Cost Breakdown */}
        {costJson && (
          <section>
            <SectionHeader
              title="Cost Breakdown"
              subtitle="Detailed line items grouped by category"
            />
            <CostTable cost={costJson} />
          </section>
        )}

        {/* Construction Schedule */}
        {schedule && (
          <section>
            <SectionHeader
              title="Construction Schedule"
              subtitle={`${schedule.totalDurationDays} days · ${(schedule.totalDurationDays / 30).toFixed(1)} months`}
            />
            <TimelineView
              timeline={{
                totalDays: schedule.totalDurationDays,
                phases:
                  (schedule.phases as any[])?.map((p) => ({
                    name: p.name,
                    startDay: p.startDay,
                    durationDays: p.durationDays,
                    endDay: p.endDay,
                    description: p.description,
                    laborByTrade: p.laborByTrade,
                  })) || [],
              }}
            />

            {/* Critical path */}
            {schedule.criticalPath &&
              (schedule.criticalPath as string[]).length > 0 && (
                <div className="mt-4 rounded-xl border border-red-200/80 bg-red-50/50 p-4 dark:border-red-800/40 dark:bg-red-950/20">
                  <h3 className="mb-2 text-sm font-semibold text-red-700 dark:text-red-400">
                    Critical Path
                  </h3>
                  <p className="font-mono text-sm text-stone-700 dark:text-zinc-300">
                    {(schedule.criticalPath as string[]).join(" → ")}
                  </p>
                  <p className="mt-1 text-xs text-stone-500 dark:text-zinc-500">
                    Delays in any of these phases will extend project completion.
                  </p>
                </div>
              )}

            {/* Schedule risk factors */}
            {schedule.riskFactors && (schedule.riskFactors as any[]).length > 0 && (
              <div className="mt-4 rounded-xl border border-stone-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-charcoal-800">
                <h3 className="mb-3 text-sm font-semibold text-charcoal-800 dark:text-stone-200">
                  Schedule Risks
                </h3>
                <ul className="space-y-2">
                  {(schedule.riskFactors as any[]).map(
                    (r: any, i: number) => (
                      <RiskItem key={i} r={r} />
                    )
                  )}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Cost Timeline Summary (from estimator) */}
        {timelineJson?.phases && timelineJson.phases.length > 0 && (
          <section className="rounded-2xl border border-stone-200/80 bg-white p-6 dark:border-zinc-800 dark:bg-charcoal-800">
            <SectionHeader
              title="Phase Effort"
              subtitle="Man-days allocated per construction phase"
              inline
            />
            <div className="mt-4 space-y-2">
              {timelineJson.phases.map((phase: any, i: number) => {
                const total =
                  phase.laborByTrade?.reduce(
                    (s: number, l: any) => s + l.manDays,
                    0
                  ) || 0;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg bg-stone-50 px-4 py-2.5 text-sm dark:bg-zinc-900/40"
                  >
                    <span className="font-medium text-charcoal-800 dark:text-stone-200">
                      {phase.name}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-zinc-400">
                      <span className="font-mono">
                        Day {phase.startDay}–{phase.endDay}
                      </span>
                      {total > 0 && (
                        <span className="rounded-full bg-white px-2 py-0.5 font-mono dark:bg-charcoal-800">
                          {total} md
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Materials */}
        {materials.length > 0 && (
          <section>
            <SectionHeader
              title="Materials"
              subtitle={`${materials.length} line items across all categories`}
            />
            <div className="overflow-hidden rounded-xl border border-stone-200/80 bg-white dark:border-zinc-800 dark:bg-charcoal-800">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-100 bg-stone-50/50 text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:border-zinc-700/50 dark:bg-zinc-900/30 dark:text-zinc-500">
                      <th className="px-5 py-2.5 text-left">Category</th>
                      <th className="px-3 py-2.5 text-left">Item</th>
                      <th className="px-3 py-2.5 text-right">Qty</th>
                      <th className="px-5 py-2.5 text-left">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((m: any, i: number) => (
                      <tr
                        key={i}
                        className="border-b border-stone-50 last:border-0 hover:bg-stone-50/50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/30"
                      >
                        <td className="px-5 py-2.5">
                          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600 dark:bg-zinc-800 dark:text-zinc-300">
                            {m.category}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-stone-700 dark:text-zinc-300">
                          {m.item}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold text-charcoal-800 dark:text-stone-200">
                          {m.qty}
                        </td>
                        <td className="px-5 py-2.5 text-stone-500 dark:text-zinc-400">
                          {m.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Labor */}
        {laborData.length > 0 && (
          <section>
            <SectionHeader
              title="Labor"
              subtitle="Trade allocations across the project"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {laborData.map((l: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-stone-200/80 bg-white p-4 dark:border-zinc-800 dark:bg-charcoal-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sage-50 text-sage-600 dark:bg-sage-950/30 dark:text-sage-400">
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
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-charcoal-800 dark:text-stone-200">
                      {l.trade}
                    </span>
                  </div>
                  <span className="font-mono text-sm font-semibold text-stone-500 dark:text-zinc-400">
                    {l.manDays}{" "}
                    <span className="text-xs font-normal text-stone-400 dark:text-zinc-500">
                      man-days
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Risks */}
        {risks.length > 0 && (
          <section>
            <SectionHeader
              title="Risks & Mitigations"
              subtitle={`${risks.length} identified risk${risks.length !== 1 ? "s" : ""}`}
            />
            <ul className="space-y-2">
              {risks.map((r: any, i: number) => (
                <RiskItem key={i} r={r} expanded />
              ))}
            </ul>
          </section>
        )}

        {/* Sources */}
        {citations.length > 0 && (
          <section>
            <SectionHeader
              title="Sources & Citations"
              subtitle={`${citations.length} reference${citations.length !== 1 ? "s" : ""} from market research`}
            />
            <ul className="space-y-1.5">
              {citations.map((c: any, i: number) => (
                <li
                  key={i}
                  className="rounded-lg border border-stone-200/80 bg-white px-4 py-2.5 dark:border-zinc-800 dark:bg-charcoal-800"
                >
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-2 text-sm text-terracotta-600 transition-colors hover:text-terracotta-700 dark:text-terracotta-400 dark:hover:text-terracotta-300"
                  >
                    <svg
                      className="h-3.5 w-3.5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    <span className="truncate">{c.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Assumptions */}
        {assumptions.length > 0 && (
          <section>
            <SectionHeader title="Assumptions" inline />
            <ul className="mt-4 space-y-1.5 rounded-xl border border-stone-200/80 bg-white p-5 dark:border-zinc-800 dark:bg-charcoal-800">
              {assumptions.map((a: string, i: number) => (
                <li
                  key={i}
                  className="flex gap-2 text-sm text-stone-600 dark:text-zinc-300"
                >
                  <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-stone-400 dark:bg-zinc-600" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

// ── Shared UI ──

function SectionHeader({
  title,
  subtitle,
  inline = false,
}: {
  title: string;
  subtitle?: string;
  inline?: boolean;
}) {
  return (
    <div className={inline ? "" : "mb-4"}>
      <h2 className="font-serif text-xl font-semibold text-charcoal-800 dark:text-stone-100">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-1 text-sm text-stone-500 dark:text-zinc-400">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function RiskItem({ r, expanded = false }: { r: any; expanded?: boolean }) {
  const levelColors: Record<string, string> = {
    low: "bg-yellow-50 text-yellow-700 border-yellow-200/80 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800/40",
    medium:
      "bg-orange-50 text-orange-700 border-orange-200/80 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800/40",
    high: "bg-red-50 text-red-700 border-red-200/80 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800/40",
  };

  const color = levelColors[r.level] || levelColors.medium;

  return (
    <li
      className={`rounded-xl border bg-white p-4 dark:bg-charcoal-800 ${color.split(" ")[2] || "border-stone-200/80 dark:border-zinc-800"}`}
    >
      <div className="mb-1 flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${color.split(" ").slice(0, 2).join(" ")}`}
        >
          {r.level}
        </span>
        <span className="text-sm font-semibold text-charcoal-800 dark:text-stone-200">
          {r.title}
        </span>
      </div>
      {expanded && r.description && (
        <p className="text-sm text-stone-600 dark:text-zinc-400">
          {r.description}
        </p>
      )}
    </li>
  );
}
