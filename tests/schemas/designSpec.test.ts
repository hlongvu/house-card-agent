import { describe, expect, it } from "vitest";
import { DesignSpecSchema } from "@/lib/schemas/designSpec";

describe("DesignSpecSchema", () => {
  it("fills in all defaults for an empty object", () => {
    const result = DesignSpecSchema.parse({});
    expect(result.projectType).toBe("residential house");
    expect(result.levels).toBe(1);
    expect(result.rooms).toBe(0);
    expect(result.roomList).toEqual([]);
    expect(result.gfaM2).toBe(0);
    expect(result.openings).toEqual({ doors: 0, windows: 0 });
    expect(result.mep).toEqual({ electrical: true, plumbing: true, hvac: false });
    expect(result.summary).toBe("");
  });

  it("accepts a complete Vietnamese house spec", () => {
    const result = DesignSpecSchema.parse({
      projectType: "residential house",
      levels: 3,
      rooms: 5,
      roomList: [
        { name: "Living Room", areaM2: 25, level: 1 },
        { name: "Kitchen", areaM2: 12, level: 1 },
        { name: "Bedroom 1", areaM2: 18, level: 2 },
        { name: "Bedroom 2", areaM2: 16, level: 2 },
        { name: "WC", areaM2: 5, level: 2 },
      ],
      gfaM2: 180,
      roofType: "pitched tile roof",
      foundationType: "strip footing",
      structuralSystem: "reinforced concrete frame",
      exteriorWalls: "200mm brick with plaster",
      openings: { doors: 8, windows: 12 },
      finishes: {
        flooring: "ceramic tile",
        wallFinish: "paint",
        ceiling: "gypsum board",
      },
      mep: { electrical: true, plumbing: true, hvac: false },
      summary: "3-story townhouse, 180m², 5 rooms",
      notes: ["Land area: 100m²", "South-facing frontage"],
    });

    expect(result.levels).toBe(3);
    expect(result.gfaM2).toBe(180);
    expect(result.roomList).toHaveLength(5);
    expect(result.openings.doors + result.openings.windows).toBe(20);
  });

  it("rejects negative area", () => {
    expect(() =>
      DesignSpecSchema.parse({ gfaM2: -1 })
    ).toThrow();
  });

  it("rejects negative level count", () => {
    expect(() =>
      DesignSpecSchema.parse({ levels: -2 })
    ).toThrow();
  });

  it("rejects invalid MEP type", () => {
    expect(() =>
      DesignSpecSchema.parse({
        mep: { electrical: "yes" as any, plumbing: true, hvac: false },
      })
    ).toThrow();
  });
});
