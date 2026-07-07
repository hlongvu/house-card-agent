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

export default function CostTable({ cost }: { cost: CostData }) {
  const categories = Array.from(new Set(cost.lines.map((l) => l.category)));

  return (
    <div className="space-y-4">
      {categories.map((cat) => {
        const lines = cost.lines.filter((l) => l.category === cat);
        return (
          <div key={cat}>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {cat}
            </h3>
            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Item</th>
                    <th className="px-3 py-2 text-right font-medium">Qty</th>
                    <th className="px-3 py-2 text-right font-medium">Low</th>
                    <th className="px-3 py-2 text-right font-medium">Mid</th>
                    <th className="px-3 py-2 text-right font-medium">High</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {lines.map((line, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 max-w-[200px] truncate text-zinc-700 dark:text-zinc-300">
                        {line.description}
                      </td>
                      <td className="px-3 py-2 text-right text-zinc-500">
                        {line.qty} {line.unit}
                      </td>
                      <td className="px-3 py-2 text-right text-zinc-600 dark:text-zinc-400">
                        {fmt(line.totalLow)}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-zinc-800 dark:text-zinc-200">
                        {fmt(line.totalMid)}
                      </td>
                      <td className="px-3 py-2 text-right text-zinc-600 dark:text-zinc-400">
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

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">Subtotal (mid)</span>
          <span className="font-medium">
            {fmt(cost.subtotalMid)} {cost.currency}
          </span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-zinc-600 dark:text-zinc-400">
            Contingency ({cost.contingencyPct}%)
          </span>
          <span className="font-medium">
            +{fmt(cost.subtotalMid * cost.contingencyPct / 100)} {cost.currency}
          </span>
        </div>
        <div className="flex justify-between text-sm font-bold mt-2 pt-2 border-t border-blue-300 dark:border-blue-700">
          <span>Total Estimate</span>
          <span>
            {fmt(cost.totalLow)} — {fmt(cost.totalHigh)} {cost.currency}
          </span>
        </div>
      </div>
    </div>
  );
}
