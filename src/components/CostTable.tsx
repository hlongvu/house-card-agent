"use client";

type CostLine = {
  category: string;
  description: string;
  qty: number;
  unit: string;
  totalLow: number;
  totalMid: number;
  totalHigh: number;
};

type CostData = {
  currency: string;
  subtotalLow: number;
  subtotalMid: number;
  subtotalHigh: number;
  contingencyPct: number;
  totalLow: number;
  totalMid: number;
  totalHigh: number;
  lines: CostLine[];
};

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

const CATEGORY_ACCENT: Record<string, string> = {
  Concrete: "border-l-stone-400",
  Steel: "border-l-slate-blue-600",
  Brick: "border-l-terracotta-500",
  Roofing: "border-l-orange-500",
  Finishes: "border-l-violet-500",
  MEP: "border-l-cyan-500",
  default: "border-l-stone-300",
};

const CATEGORY_ICON: Record<string, string> = {
  Concrete: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  Steel: "M4 4v16M4 4h16M4 12h16M4 20h16M20 4v16",
  Brick: "M4 4h6v6H4zM10 4h6v6h-6zM16 4h4v6h-4zM4 10h6v6H4zM10 10h6v6h-6zM4 16h6v4H4zM10 16h6v4h-6zM16 10h4v10h-4z",
  Roofing: "M3 12l9-9 9 9M5 10v10a1 1 0 001 1h12a1 1 0 001-1V10",
  Finishes: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
  MEP: "M13 10V3L4 14h7v7l9-11h-7z",
  default: "M4 6h16M4 12h16M4 18h16",
};

function getCategoryStyle(category: string) {
  return {
    accent: CATEGORY_ACCENT[category] || CATEGORY_ACCENT.default,
    icon: CATEGORY_ICON[category] || CATEGORY_ICON.default,
  };
}

export default function CostTable({ cost }: { cost: CostData }) {
  const categories = Array.from(new Set(cost.lines.map((l) => l.category)));
  const fmtMid = fmt(cost.totalMid);
  const fmtRange = `${fmt(cost.totalLow)} — ${fmt(cost.totalHigh)}`;

  return (
    <div className="space-y-6">
      {/* Summary card */}
      <div className="relative overflow-hidden rounded-2xl border border-stone-200/80 bg-gradient-to-br from-white to-stone-50 p-6 dark:border-zinc-800 dark:from-charcoal-800 dark:to-charcoal-900">
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-terracotta-100/40 blur-3xl dark:bg-terracotta-900/10" />

        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-400 dark:text-zinc-500">
            Total Estimate
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold text-charcoal-800 dark:text-stone-100 sm:text-4xl">
              {fmtMid}
            </span>
            <span className="text-sm text-stone-500 dark:text-zinc-400">
              {cost.currency}
            </span>
          </div>
          <p className="mt-1 text-sm text-stone-400 dark:text-zinc-500">
            Range: {fmtRange} {cost.currency}
          </p>

          <div className="mt-5 grid grid-cols-3 gap-4 border-t border-stone-200 pt-5 dark:border-zinc-700">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500">
                Subtotal
              </p>
              <p className="mt-1 text-base font-semibold text-charcoal-800 dark:text-stone-200">
                {fmt(cost.subtotalMid)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500">
                Contingency
              </p>
              <p className="mt-1 text-base font-semibold text-charcoal-800 dark:text-stone-200">
                +{cost.contingencyPct}%
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-zinc-500">
                Currency
              </p>
              <p className="mt-1 text-base font-semibold text-charcoal-800 dark:text-stone-200">
                {cost.currency}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {categories.map((cat) => {
          const lines = cost.lines.filter((l) => l.category === cat);
          const catSubtotal = lines.reduce((sum, l) => sum + l.totalMid, 0);
          const { accent, icon } = getCategoryStyle(cat);

          return (
            <div
              key={cat}
              className={`overflow-hidden rounded-xl border border-stone-200/80 border-l-4 ${accent} bg-white dark:border-zinc-800 dark:bg-charcoal-800`}
            >
              <div className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-100 text-stone-500 dark:bg-zinc-800 dark:text-zinc-400">
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d={icon}
                      />
                    </svg>
                  </div>
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-charcoal-800 dark:text-stone-200">
                    {cat}
                  </h4>
                </div>
                <span className="text-sm font-mono text-stone-500 dark:text-zinc-400">
                  {fmt(catSubtotal)} {cost.currency}
                </span>
              </div>

              <div className="border-t border-stone-100 dark:border-zinc-700/50">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-100 bg-stone-50/50 text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:border-zinc-700/50 dark:bg-zinc-900/30 dark:text-zinc-500">
                      <th className="px-5 py-2 text-left">Item</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Low</th>
                      <th className="px-3 py-2 text-right">Mid</th>
                      <th className="px-5 py-2 text-right">High</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, i) => (
                      <tr
                        key={i}
                        className="border-b border-stone-50 transition-colors last:border-0 hover:bg-stone-50/50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/30"
                      >
                        <td className="px-5 py-2.5 max-w-[240px] truncate text-stone-700 dark:text-zinc-300">
                          {line.description}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs text-stone-500 dark:text-zinc-400">
                          {line.qty} {line.unit}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs text-stone-400 dark:text-zinc-500">
                          {fmt(line.totalLow)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold text-charcoal-800 dark:text-stone-200">
                          {fmt(line.totalMid)}
                        </td>
                        <td className="px-5 py-2.5 text-right font-mono text-xs text-stone-400 dark:text-zinc-500">
                          {fmt(line.totalHigh)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
