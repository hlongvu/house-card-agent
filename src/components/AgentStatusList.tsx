"use client";

type AgentRun = {
  id: string;
  agentName: string;
  status: string;
  error?: string | null;
  attempts: number;
};

type Props = {
  runs: AgentRun[];
  projectStatus: string;
};

const AGENT_CONFIG: Record<
  string,
  {
    label: string;
    sub: string;
    icon: string;
    color: string;
  }
> = {
  parser: {
    label: "Parse Design",
    sub: "Extract rooms, dimensions, levels from CAD",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    color: "terracotta",
  },
  quantifier: {
    label: "Quantify Materials",
    sub: "Compute bill of quantities from design specs",
    icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z",
    color: "blue",
  },
  "market-research": {
    label: "Market Research",
    sub: "Fetch current prices, labor rates, suppliers",
    icon: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9",
    color: "indigo",
  },
  scheduler: {
    label: "Draft Timeline",
    sub: "Create phased construction schedule",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    color: "violet",
  },
  estimator: {
    label: "Final Report",
    sub: "Consolidate cost, timeline, risks & assumptions",
    icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    color: "sage",
  },
};

const AGENT_ORDER = [
  "parser",
  "quantifier",
  "market-research",
  "scheduler",
  "estimator",
];

const colorMap: Record<string, { light: string; dark: string; dot: string; bar: string }> = {
  terracotta: {
    light: "border-terracotta-200 bg-terracotta-50/50 text-terracotta-800 dark:border-terracotta-800/40 dark:bg-terracotta-950/20 dark:text-terracotta-300",
    dark: "text-terracotta-600 dark:text-terracotta-400",
    dot: "bg-terracotta-500 ring-terracotta-100 dark:ring-terracotta-900/50",
    bar: "bg-terracotta-200 dark:bg-terracotta-800/40",
  },
  blue: {
    light: "border-blue-200 bg-blue-50/50 text-blue-800 dark:border-blue-800/40 dark:bg-blue-950/20 dark:text-blue-300",
    dark: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500 ring-blue-100 dark:ring-blue-900/50",
    bar: "bg-blue-200 dark:bg-blue-800/40",
  },
  indigo: {
    light: "border-indigo-200 bg-indigo-50/50 text-indigo-800 dark:border-indigo-800/40 dark:bg-indigo-950/20 dark:text-indigo-300",
    dark: "text-indigo-600 dark:text-indigo-400",
    dot: "bg-indigo-500 ring-indigo-100 dark:ring-indigo-900/50",
    bar: "bg-indigo-200 dark:bg-indigo-800/40",
  },
  violet: {
    light: "border-violet-200 bg-violet-50/50 text-violet-800 dark:border-violet-800/40 dark:bg-violet-950/20 dark:text-violet-300",
    dark: "text-violet-600 dark:text-violet-400",
    dot: "bg-violet-500 ring-violet-100 dark:ring-violet-900/50",
    bar: "bg-violet-200 dark:bg-violet-800/40",
  },
  sage: {
    light: "border-sage-100 bg-sage-50/50 text-sage-800 dark:border-sage-800/40 dark:bg-sage-950/20 dark:text-sage-300",
    dark: "text-sage-600 dark:text-sage-400",
    dot: "bg-sage-500 ring-sage-100 dark:ring-sage-900/50",
    bar: "bg-sage-200 dark:bg-sage-800/40",
  },
};

function StatusDot({
  status,
  isCurrent,
  colorKey,
}: {
  status: string;
  isCurrent: boolean;
  colorKey: string;
}) {
  const colors = colorMap[colorKey] || colorMap.terracotta;

  if (status === "RUNNING") {
    return (
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ${colors.dot.replace("bg-", "ring-").replace("dark:ring-", "dark:ring-")}`}
      >
        <span className="h-full w-full animate-spin rounded-full border-2 border-stone-200 border-t-current" />
      </span>
    );
  }

  if (status === "SUCCEEDED") {
    return (
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colors.dot} ring-4`}
      >
        <svg
          className="h-4 w-4 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }

  if (status === "FAILED") {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500 ring-4 ring-red-100 dark:ring-red-900/50">
        <svg
          className="h-4 w-4 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </span>
    );
  }

  if (isCurrent) {
    return (
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colors.dot} ring-4 animate-pulse`}
      >
        <span className="h-3 w-3 rounded-full bg-white" />
      </span>
    );
  }

  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-stone-200 bg-white ring-4 ring-stone-50 dark:border-zinc-700 dark:bg-charcoal-800 dark:ring-zinc-900/50">
      <span className="h-2 w-2 rounded-full bg-stone-300 dark:bg-zinc-600" />
    </span>
  );
}

export default function AgentStatusList({ runs, projectStatus }: Props) {
  const runMap = new Map(runs.map((r) => [r.agentName, r]));

  const currentAgent = (() => {
    if (projectStatus === "PARSING") return "parser";
    if (projectStatus === "QUANTIFYING") return "quantifier";
    if (projectStatus === "RESEARCHING") return "market-research";
    if (projectStatus === "SCHEDULING") return "scheduler";
    if (projectStatus === "ESTIMATING") return "estimator";
    return null;
  })();

  return (
    <div>
      <h3 className="mb-6 text-sm font-semibold uppercase tracking-widest text-stone-400 dark:text-zinc-500">
        Pipeline Progress
      </h3>

      <div className="relative space-y-0">
        {AGENT_ORDER.map((name, i) => {
          const cfg = AGENT_CONFIG[name];
          const run = runMap.get(name);
          const isCurrent = currentAgent === name;
          const status = run?.status || (i === 0 ? "PENDING" : "PENDING");
          const isLast = i === AGENT_ORDER.length - 1;
          const colors = colorMap[cfg.color] || colorMap.terracotta;
          const isActive = status === "RUNNING" || isCurrent;
          const isDone = status === "SUCCEEDED";

          return (
            <div key={name} className="relative flex gap-4">
              {/* Vertical line */}
              {!isLast && (
                <div className="absolute left-4 top-8 w-px h-[calc(100%+4px)]">
                  <div className={`h-full w-full ${isDone ? colors.bar : "bg-stone-200 dark:bg-zinc-700/50"}`} />
                </div>
              )}

              <div className="relative z-10 pt-0.5">
                <StatusDot
                  status={status}
                  isCurrent={!!isCurrent}
                  colorKey={cfg.color}
                />
              </div>

              <div
                className={`flex-1 pb-6 ${isActive ? "opacity-100" : isDone ? "opacity-100" : "opacity-50"}`}
              >
                <div
                  className={`rounded-xl border p-4 transition-all duration-200 ${
                    isActive
                      ? `${colors.light} shadow-sm`
                      : isDone
                        ? "border-stone-200/80 bg-white dark:border-zinc-800 dark:bg-charcoal-800"
                        : "border-stone-100 bg-stone-50/50 dark:border-zinc-800/40 dark:bg-zinc-900/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-semibold ${isActive ? colors.dark : "text-charcoal-800 dark:text-stone-200"}`}
                      >
                        {cfg.label}
                      </p>
                      <p className="mt-0.5 text-xs text-stone-400 dark:text-zinc-500">
                        {cfg.sub}
                      </p>
                    </div>

                    {status !== "PENDING" && status !== "RUNNING" && (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          status === "SUCCEEDED"
                            ? "bg-sage-100 text-sage-600 dark:bg-sage-900/30 dark:text-sage-400"
                            : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {status.toLowerCase()}
                      </span>
                    )}

                    {status === "RUNNING" && (
                      <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        running
                      </span>
                    )}
                  </div>

                  {run?.error && (
                    <p className="mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-600 dark:bg-red-950/20 dark:text-red-400">
                      {run.error}
                    </p>
                  )}

                  {run && run.attempts > 1 && status === "SUCCEEDED" && (
                    <p className="mt-1.5 text-xs text-stone-400 dark:text-zinc-500">
                      Succeeded after {run.attempts} attempts
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {projectStatus === "FAILED" && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50/80 p-4 dark:border-red-800/40 dark:bg-red-950/20">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-red-500"
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
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              Pipeline failed — review errors above and retry
            </p>
          </div>
        </div>
      )}

      {projectStatus === "COMPLETED" && (
        <div className="mt-6 rounded-xl border border-sage-200 bg-sage-50/80 p-4 dark:border-sage-800/40 dark:bg-sage-950/20">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-sage-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm font-medium text-sage-700 dark:text-sage-400">
              All agents completed — view the full report below
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
