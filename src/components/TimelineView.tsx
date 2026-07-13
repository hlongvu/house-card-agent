"use client";

type Phase = {
  name: string;
  startDay: number;
  durationDays: number;
  endDay: number;
  description?: string;
  laborByTrade?: { trade: string; manDays: number }[];
};

type TimelineData = {
  totalDays: number;
  phases: Phase[];
};

const PHASE_COLORS = [
  { bar: "bg-stone-500", soft: "bg-stone-100 dark:bg-stone-800/40", text: "text-stone-600 dark:text-stone-300" },
  { bar: "bg-amber-600", soft: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-300" },
  { bar: "bg-blue-500", soft: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-700 dark:text-blue-300" },
  { bar: "bg-orange-500", soft: "bg-orange-50 dark:bg-orange-900/20", text: "text-orange-700 dark:text-orange-300" },
  { bar: "bg-yellow-500", soft: "bg-yellow-50 dark:bg-yellow-900/20", text: "text-yellow-700 dark:text-yellow-300" },
  { bar: "bg-teal-500", soft: "bg-teal-50 dark:bg-teal-900/20", text: "text-teal-700 dark:text-teal-300" },
  { bar: "bg-cyan-500", soft: "bg-cyan-50 dark:bg-cyan-900/20", text: "text-cyan-700 dark:text-cyan-300" },
  { bar: "bg-violet-500", soft: "bg-violet-50 dark:bg-violet-900/20", text: "text-violet-700 dark:text-violet-300" },
  { bar: "bg-pink-500", soft: "bg-pink-50 dark:bg-pink-900/20", text: "text-pink-700 dark:text-pink-300" },
];

export default function TimelineView({
  timeline,
}: {
  timeline: TimelineData;
}) {
  const maxDays = timeline.totalDays;
  const months = (maxDays / 30).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Summary header */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-stone-200/80 bg-white p-4 dark:border-zinc-800 dark:bg-charcoal-800">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-zinc-500">
            Duration
          </p>
          <p className="mt-1.5 font-serif text-2xl font-semibold text-charcoal-800 dark:text-stone-100">
            {maxDays}{" "}
            <span className="text-sm font-normal text-stone-400 dark:text-zinc-500">
              days
            </span>
          </p>
        </div>
        <div className="rounded-xl border border-stone-200/80 bg-white p-4 dark:border-zinc-800 dark:bg-charcoal-800">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-zinc-500">
            Approximately
          </p>
          <p className="mt-1.5 font-serif text-2xl font-semibold text-charcoal-800 dark:text-stone-100">
            {months}{" "}
            <span className="text-sm font-normal text-stone-400 dark:text-zinc-500">
              months
            </span>
          </p>
        </div>
        <div className="rounded-xl border border-stone-200/80 bg-white p-4 dark:border-zinc-800 dark:bg-charcoal-800">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-zinc-500">
            Phases
          </p>
          <p className="mt-1.5 font-serif text-2xl font-semibold text-charcoal-800 dark:text-stone-100">
            {timeline.phases.length}
          </p>
        </div>
      </div>

      {/* Gantt chart */}
      <div className="rounded-2xl border border-stone-200/80 bg-white p-6 dark:border-zinc-800 dark:bg-charcoal-800">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-stone-400 dark:text-zinc-500">
            Construction Phases
          </h3>
          <div className="flex items-center gap-3 text-[10px] text-stone-400 dark:text-zinc-500">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-stone-300" />0
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-500" />Day{" "}
              {Math.round(maxDays / 2)}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-sage-500" />Day {maxDays}
            </span>
          </div>
        </div>

        {/* Timeline ruler */}
        <div className="mb-2 ml-32 flex justify-between text-[10px] text-stone-300 dark:text-zinc-600">
          <span>0</span>
          <span>Day {Math.round(maxDays / 4)}</span>
          <span>Day {Math.round(maxDays / 2)}</span>
          <span>Day {Math.round((maxDays * 3) / 4)}</span>
          <span>Day {maxDays}</span>
        </div>

        <div className="space-y-1.5">
          {timeline.phases.map((phase, i) => {
            const left = (phase.startDay / maxDays) * 100;
            const width = (phase.durationDays / maxDays) * 100;
            const color = PHASE_COLORS[i % PHASE_COLORS.length];
            const totalManDays =
              phase.laborByTrade?.reduce((sum, l) => sum + l.manDays, 0) || 0;

            return (
              <div
                key={i}
                className="group flex items-center gap-3 text-xs"
              >
                <span
                  className="w-28 shrink-0 truncate text-right text-stone-600 dark:text-zinc-300"
                  title={phase.name}
                >
                  {phase.name}
                </span>
                <div className="relative flex-1 h-8 rounded-md bg-stone-50 dark:bg-zinc-900/50">
                  <div
                    className={`absolute top-0 h-full rounded-md ${color.bar} flex items-center px-2.5 text-white font-medium text-[11px] shadow-sm transition-all group-hover:shadow-md`}
                    style={{
                      left: `${left}%`,
                      width: `${Math.max(width, 3)}%`,
                    }}
                    title={`${phase.name} — ${phase.durationDays} days`}
                  >
                    <span className="truncate">
                      {width > 10 ? phase.name : `${phase.durationDays}d`}
                    </span>
                  </div>
                </div>
                <span className="w-12 shrink-0 font-mono text-[10px] text-stone-400 dark:text-zinc-500">
                  {phase.durationDays}d
                </span>
                {totalManDays > 0 && (
                  <span className="w-14 shrink-0 font-mono text-[10px] text-stone-300 dark:text-zinc-600">
                    {totalManDays}md
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase details */}
      <div className="grid gap-3 sm:grid-cols-2">
          {timeline.phases.map((phase, i) => {
            const color = PHASE_COLORS[i % PHASE_COLORS.length];

            return (
            <div
              key={i}
              className="rounded-xl border border-stone-200/80 bg-white p-4 transition-shadow hover:shadow-sm dark:border-zinc-800 dark:bg-charcoal-800"
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-md ${color.soft}`}
                >
                  <span className={`h-2 w-2 rounded-full ${color.bar}`} />
                </span>
                <h4 className="text-sm font-semibold text-charcoal-800 dark:text-stone-200">
                  {phase.name}
                </h4>
              </div>

              <div className="mb-2 flex items-center gap-2 text-[11px]">
                <span className="rounded-full bg-stone-100 px-2 py-0.5 font-mono text-stone-500 dark:bg-zinc-800 dark:text-zinc-400">
                  Day {phase.startDay}–{phase.endDay}
                </span>
                <span className="text-stone-400 dark:text-zinc-500">
                  {phase.durationDays}d
                </span>
              </div>

              {phase.description && (
                <p className="text-xs leading-relaxed text-stone-500 dark:text-zinc-400">
                  {phase.description}
                </p>
              )}

              {phase.laborByTrade && phase.laborByTrade.length > 0 && (
                <div className="mt-3 border-t border-stone-100 pt-2 dark:border-zinc-700/50">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500">
                    Labor
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {phase.laborByTrade.map((lt, j) => (
                      <span
                        key={j}
                        className="inline-flex items-center gap-1 rounded-md bg-stone-50 px-2 py-0.5 text-[10px] text-stone-600 dark:bg-zinc-800/50 dark:text-zinc-400"
                      >
                        <span className="font-medium">{lt.trade}</span>
                        <span className="font-mono text-stone-400 dark:text-zinc-500">
                          {lt.manDays}md
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
