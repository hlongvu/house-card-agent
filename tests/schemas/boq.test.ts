import { describe, expect, it } from "vitest";
import { BillOfQuantitiesSchema } from "@/lib/schemas/boq";

describe("BillOfQuantitiesSchema", () => {
  it("parses a realistic residential BOQ", () => {
    const boq = {
      currency: "VND",
      items: [
        { category: "Concrete", item: "M300 foundation concrete", qty: 22, unit: "m³" },
        { category: "Concrete", item: "M250 slab concrete", qty: 35, unit: "m³" },
        { category: "Steel", item: "Rebar D10", qty: 2800, unit: "kg" },
        { category: "Steel", item: "Rebar D16", qty: 1500, unit: "kg" },
        { category: "Masonry", item: "200mm brick wall", qty: 650, unit: "m²" },
        { category: "Finishes", item: "Ceramic floor tile", qty: 180, unit: "m²" },
        { category: "Finishes", item: "Interior paint", qty: 1200, unit: "m²" },
        { category: "Roofing", item: "Ceramic roof tile", qty: 130, unit: "m²" },
        { category: "Doors", item: "Solid wood door 900x2200", qty: 5, unit: "set" },
        { category: "Windows", item: "Aluminum window 1200x1500", qty: 8, unit: "set" },
        { category: "Electrical", item: "Wiring 2.5mm²", qty: 800, unit: "m" },
        { category: "Plumbing", item: "PVC pipe D50", qty: 120, unit: "m" },
      ],
      assumptions: [
        "Site location: HCMC",
        "Standard residential rates",
        "Single contractor",
      ],
    };

    const result = BillOfQuantitiesSchema.parse(boq);
    expect(result.items).toHaveLength(12);
    expect(result.items[0].category).toBe("Concrete");

    const concreteQty = result.items
      .filter((i) => i.category === "Concrete")
      .reduce((sum, i) => sum + i.qty, 0);
    expect(concreteQty).toBe(57);
  });

  it("requires item fields", () => {
    expect(() =>
      BillOfQuantitiesSchema.parse({
        items: [{ category: "Concrete" }],
      })
    ).toThrow();
  });

  it("rejects negative quantity", () => {
    expect(() =>
      BillOfQuantitiesSchema.parse({
        items: [{ category: "Steel", item: "Rebar", qty: -10, unit: "kg" }],
      })
    ).toThrow();
  });

  it("defaults currency to VND when empty", () => {
    const result = BillOfQuantitiesSchema.parse({ items: [] });
    expect(result.currency).toBe("VND");
  });
});
