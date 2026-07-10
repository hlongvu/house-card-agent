import { describe, expect, it } from "vitest";
import { ReportSchema } from "@/lib/schemas/report";

describe("ReportSchema", () => {
  it("parses a complete final report", () => {
    const report = {
      title: "3-Story Townhouse Cost Report",
      region: "VN-HCM",
      cost: {
        currency: "VND",
        subtotalLow: 1_900_000_000,
        subtotalMid: 2_350_000_000,
        subtotalHigh: 2_800_000_000,
        contingencyPct: 10,
        totalLow: 2_090_000_000,
        totalMid: 2_585_000_000,
        totalHigh: 3_080_000_000,
        lines: [
          {
            category: "Foundation",
            description: "Strip footing concrete M300",
            qty: 22,
            unit: "m³",
            unitCostLow: 1_500_000,
            unitCostMid: 1_800_000,
            unitCostHigh: 2_100_000,
            totalLow: 33_000_000,
            totalMid: 39_600_000,
            totalHigh: 46_200_000,
          },
          {
            category: "Structure",
            description: "Reinforced concrete frame",
            qty: 250,
            unit: "m²",
            unitCostLow: 2_500_000,
            unitCostMid: 3_000_000,
            unitCostHigh: 3_500_000,
            totalLow: 625_000_000,
            totalMid: 750_000_000,
            totalHigh: 875_000_000,
          },
        ],
      },
      timeline: {
        totalDays: 240,
        phases: [
          {
            name: "Foundation",
            startDay: 10,
            durationDays: 25,
            endDay: 35,
            description: "Excavation, rebar, concrete pour",
            laborByTrade: [{ trade: "concrete worker", manDays: 150 }],
          },
        ],
      },
      risks: [
        {
          level: "medium",
          title: "Material price volatility",
          description: "Steel prices may fluctuate ±15% in 2026",
        },
      ],
      materials: [
        { category: "Concrete", item: "M300", qty: 22, unit: "m³" },
        { category: "Steel", item: "Rebar D16", qty: 2800, unit: "kg" },
      ],
      labor: [
        { trade: "concrete worker", manDays: 150 },
        { trade: "carpenter", manDays: 200 },
      ],
      citations: [
        { url: "https://example.com/steel-price-2026", title: "Vietnam Steel Price Index 2026" },
      ],
      markdown: "# Project Report\n\nTotal cost: 2.35B VND",
      assumptions: ["HCMC region", "Single contractor", "Dry season start"],
      generatedAt: "2026-07-07T10:00:00Z",
    };

    const result = ReportSchema.parse(report);
    expect(result.cost.totalMid).toBe(2_585_000_000);
    expect(result.cost.lines).toHaveLength(2);
    expect(result.timeline.phases[0].laborByTrade).toHaveLength(1);
    expect(result.citations[0].url).toContain("example.com");
  });

  it("defaults contingency to 10", () => {
    const result = ReportSchema.parse({
      title: "Test",
      region: "VN",
      cost: {
        currency: "VND",
        subtotalLow: 100,
        subtotalMid: 100,
        subtotalHigh: 100,
        totalLow: 110,
        totalMid: 110,
        totalHigh: 110,
        lines: [],
      },
      timeline: { totalDays: 0, phases: [] },
      risks: [],
      materials: [],
      labor: [],
      citations: [],
      markdown: "",
      assumptions: [],
      generatedAt: "2026-01-01",
    });
    expect(result.cost.contingencyPct).toBe(10);
  });

  it("rejects invalid risk level", () => {
    expect(() =>
      ReportSchema.parse({
        title: "x",
        region: "y",
        cost: { currency: "VND", subtotalLow: 0, subtotalMid: 0, subtotalHigh: 0, totalLow: 0, totalMid: 0, totalHigh: 0, lines: [] },
        timeline: { totalDays: 0, phases: [] },
        risks: [{ level: "extreme", title: "x", description: "y" }],
        materials: [],
        labor: [],
        citations: [],
        markdown: "",
        assumptions: [],
        generatedAt: "2026-01-01",
      })
    ).toThrow();
  });
});
