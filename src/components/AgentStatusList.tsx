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

const agentLabels: Record<string, string> = {
  parser: "Parser — Extract Design",
  quantifier: "Quantifier — Bill of Quantities",
  "market-research": "Market Research — Prices & Labor",
  scheduler: "Scheduler — Draft Timeline",
  estimator: "Estimator — Final Report",
};

const agentOrder = ["parser", "quantifier", "market-research", "scheduler", "estimator"];

export default function AgentStatusList({ runs, projectStatus }: Props) {
  const runMap = new Map(runs.map((r) => [r.agentName, r]));

  const statusIcon = (status: string) => {
    switch (status) {
      case "RUNNING":
        return (
          <span className="flex h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600" />
        );
      case "SUCCEEDED":
        return (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white text-xs font-bold">
            ✓
          </span>
        );
      case "FAILED":
        return (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
            ✕
          </span>
        );
      default:
        return (
          <span className="flex h-5 w-5 rounded-full border-2 border-zinc-300" />
        );
    }
  };

  const currentAgent = (() => {
    if (projectStatus === "PARSING") return "parser";
    if (projectStatus === "QUANTIFYING") return "quantifier";
    if (projectStatus === "RESEARCHING") return "market-research";
    if (projectStatus === "ESTIMATING") return "estimator";
    return null;
  })();

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
        Agent Progress
      </h2>
      <ul className="space-y-2">
        {agentOrder.map((name) => {
          const run = runMap.get(name);
          const isCurrent = currentAgent === name;
          const status = run?.status || "PENDING";

          return (
            <li
              key={name}
              className={`flex items-center gap-3 rounded-lg border p-3 ${
                isCurrent
                  ? "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20"
                  : "border-zinc-200 dark:border-zinc-700"
              }`}
            >
              {statusIcon(status)}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isCurrent ? "text-blue-700 dark:text-blue-300" : "text-zinc-700 dark:text-zinc-300"}`}>
                  {agentLabels[name] || name}
                </p>
                {run?.error && (
                  <p className="text-xs text-red-500 truncate">{run.error}</p>
                )}
              </div>
              {status !== "PENDING" && status !== "RUNNING" && (
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    status === "SUCCEEDED"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                >
                  {status}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {projectStatus === "FAILED" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
          <p className="text-sm text-red-700 dark:text-red-400">
            Pipeline failed. Check agent errors above and retry.
          </p>
        </div>
      )}

      {projectStatus === "COMPLETED" && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20">
          <p className="text-sm text-green-700 dark:text-green-400">
            All agents completed successfully. View the report below.
          </p>
        </div>
      )}
    </div>
  );
}
