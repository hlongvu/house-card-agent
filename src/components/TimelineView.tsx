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

const phaseColors = [
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-orange-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-teal-500",
];

export default function TimelineView({ timeline }: { timeline: TimelineData }) {
  const maxDays = timeline.totalDays;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          Project Timeline
        </h3>
        <p className="text-sm text-zinc-500">
          Total duration: {maxDays} days (~
          {(maxDays / 30).toFixed(1)} months)
        </p>
      </div>

      <div className="space-y-2">
        {timeline.phases.map((phase, i) => {
          const left = (phase.startDay / maxDays) * 100;
          const width = (phase.durationDays / maxDays) * 100;
          const totalManDays =
            phase.laborByTrade?.reduce((sum, l) => sum + l.manDays, 0) || 0;

          return (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="w-24 shrink-0 text-right text-zinc-500 dark:text-zinc-400">
                Day {phase.startDay}
              </span>
              <div className="relative flex-1 h-7">
                <div
                  className={`absolute top-0 h-full rounded ${phaseColors[i % phaseColors.length]} flex items-center px-2 text-white font-medium truncate`}
                  style={{ left: `${left}%`, width: `${Math.max(width, 3)}%` }}
                >
                  {phase.name}
                </div>
              </div>
              <span className="w-12 shrink-0 text-zinc-500 dark:text-zinc-400">
                {phase.durationDays}d
              </span>
              {totalManDays > 0 && (
                <span className="w-16 shrink-0 text-zinc-400">
                  {totalManDays} md
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
        <h4 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Phase Details
        </h4>
        <div className="grid gap-3 sm:grid-cols-2">
          {timeline.phases.map((phase, i) => (
            <div
              key={i}
              className="rounded border border-zinc-200 dark:border-zinc-700 p-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`inline-block h-3 w-3 rounded ${phaseColors[i % phaseColors.length]}`}
                />
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {phase.name}
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Days {phase.startDay}–{phase.endDay} ({phase.durationDays}d)
              </p>
              {phase.description && (
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  {phase.description}
                </p>
              )}
              {phase.laborByTrade && phase.laborByTrade.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {phase.laborByTrade.map((lt, j) => (
                    <li
                      key={j}
                      className="text-xs text-zinc-500 dark:text-zinc-400"
                    >
                      {lt.trade}: {lt.manDays} man-days
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
