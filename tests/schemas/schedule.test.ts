import { describe, expect, it } from "vitest";
import { ConstructionScheduleSchema } from "@/lib/schemas/schedule";

describe("ConstructionScheduleSchema", () => {
  it("parses a full multi-phase schedule with dependencies", () => {
    const schedule = {
      totalDurationDays: 240,
      startDate: "2026-08-07",
      endDate: "2027-04-04",
      criticalPath: ["foundation", "structure-l1", "structure-l2", "roofing", "plaster", "tile"],
      phases: [
        {
          id: "site-prep",
          name: "Site Preparation",
          category: "site-prep",
          startDay: 0,
          durationDays: 10,
          endDay: 10,
          dependsOn: [],
          laborByTrade: [{ trade: "general laborer", workers: 4, manDays: 40 }],
          keyMaterials: ["cement", "sand", "gravel"],
          description: "Clear site, set up temporary facilities",
          weatherSensitive: true,
        },
        {
          id: "foundation",
          name: "Foundation & Footing",
          category: "foundation",
          startDay: 10,
          durationDays: 25,
          endDay: 35,
          dependsOn: ["site-prep"],
          laborByTrade: [
            { trade: "concrete worker", workers: 6, manDays: 150 },
            { trade: "steel worker", workers: 4, manDays: 100 },
          ],
          keyMaterials: ["rebar D16", "concrete M300", "formwork"],
          description: "Excavation, rebar tying, concrete pour",
          weatherSensitive: true,
        },
        {
          id: "structure-l1",
          name: "Ground Floor Structure",
          category: "structure",
          startDay: 35,
          durationDays: 30,
          endDay: 65,
          dependsOn: ["foundation"],
          laborByTrade: [
            { trade: "carpenter", workers: 5, manDays: 150 },
            { trade: "steel worker", workers: 3, manDays: 90 },
            { trade: "concrete worker", workers: 4, manDays: 120 },
          ],
          keyMaterials: ["rebar D10", "formwork", "concrete M250"],
          description: "Columns, beams, and ground floor slab",
          weatherSensitive: true,
        },
        {
          id: "roofing",
          name: "Roof Structure & Tiling",
          category: "roofing",
          startDay: 130,
          durationDays: 25,
          endDay: 155,
          dependsOn: ["structure-l2"],
          laborByTrade: [
            { trade: "carpenter", workers: 5, manDays: 125 },
            { trade: "roofer", workers: 4, manDays: 100 },
          ],
          keyMaterials: ["roof trusses", "ceramic roof tile", "waterproofing membrane"],
          description: "Install roof trusses, lay roof tiles, waterproofing",
          weatherSensitive: true,
        },
        {
          id: "plaster",
          name: "Wall Plastering",
          category: "plaster",
          startDay: 155,
          durationDays: 30,
          endDay: 185,
          dependsOn: ["roofing", "mep-rough"],
          laborByTrade: [{ trade: "plasterer", workers: 4, manDays: 120 }],
          keyMaterials: ["cement mortar", "lime", "sand"],
          description: "Internal and external wall plastering",
          weatherSensitive: false,
        },
        {
          id: "tile",
          name: "Floor & Wall Tiling",
          category: "tile",
          startDay: 185,
          durationDays: 25,
          endDay: 210,
          dependsOn: ["plaster"],
          laborByTrade: [{ trade: "tiler", workers: 4, manDays: 100 }],
          keyMaterials: ["ceramic tile", "tile adhesive", "grout"],
          description: "Lay floor and bathroom wall tiles",
          weatherSensitive: false,
        },
      ],
      riskFactors: [
        {
          level: "medium",
          title: "Rainy season overlap",
          description: "Foundation/structure work in May-Nov risks 15-20 day delay",
        },
      ],
      notes: [
        "Standard Vietnamese 3-story townhouse",
        "Single contractor, ~10 workers average",
      ],
    };

    const result = ConstructionScheduleSchema.parse(schedule);
    expect(result.phases).toHaveLength(6);
    expect(result.totalDurationDays).toBe(240);
    expect(result.criticalPath).toContain("foundation");
    expect(result.phases[1].dependsOn).toEqual(["site-prep"]);
  });

  it("rejects missing required phase fields", () => {
    expect(() =>
      ConstructionScheduleSchema.parse({
        totalDurationDays: 10,
        phases: [
          {
            id: "x",
            name: "X",
            category: "site-prep",
            startDay: 0,
            durationDays: 10,
            // missing endDay
            dependsOn: [],
            laborByTrade: [],
            keyMaterials: [],
            description: "",
            weatherSensitive: false,
          } as any,
        ],
      })
    ).toThrow();
  });

  it("rejects invalid risk level", () => {
    expect(() =>
      ConstructionScheduleSchema.parse({
        totalDurationDays: 0,
        phases: [],
        criticalPath: [],
        riskFactors: [{ level: "extreme", title: "x", description: "y" }],
        notes: [],
      })
    ).toThrow();
  });

  it("accepts empty schedule (zero phases)", () => {
    const result = ConstructionScheduleSchema.parse({
      totalDurationDays: 0,
      phases: [],
    });
    expect(result.criticalPath).toEqual([]);
    expect(result.riskFactors).toEqual([]);
  });
});
