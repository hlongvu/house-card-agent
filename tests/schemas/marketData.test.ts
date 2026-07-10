import { describe, expect, it } from "vitest";
import { MarketDataSchema } from "@/lib/schemas/marketData";

describe("MarketDataSchema", () => {
  it("parses HCMC market data with prices and labor rates", () => {
    const data = {
      region: "VN-HCM",
      prices: [
        {
          item: "Concrete M300",
          unit: "m³",
          low: 1_500_000,
          mid: 1_800_000,
          high: 2_100_000,
          currency: "VND",
          sourceUrl: "https://example.com/concrete-prices",
          sourceTitle: "HCMC Concrete Market 2026",
          fetchedAt: "2026-07-01",
        },
        {
          item: "Rebar D16",
          unit: "kg",
          low: 18_000,
          mid: 22_000,
          high: 26_000,
          currency: "VND",
        },
      ],
      labor: [
        {
          trade: "concrete worker",
          unit: "man-day",
          rateLow: 350_000,
          rateMid: 450_000,
          rateHigh: 600_000,
          currency: "VND",
        },
        {
          trade: "carpenter",
          unit: "man-day",
          rateLow: 400_000,
          rateMid: 550_000,
          rateHigh: 700_000,
          currency: "VND",
        },
      ],
      citations: [
        { url: "https://example.com/steel", title: "Steel Index 2026", accessedAt: "2026-07-01" },
      ],
      notes: ["Prices are HCMC district-1 rates", "Includes 10% VAT"],
    };

    const result = MarketDataSchema.parse(data);
    expect(result.region).toBe("VN-HCM");
    expect(result.prices).toHaveLength(2);
    expect(result.labor).toHaveLength(2);
    expect(result.prices[0].mid).toBe(1_800_000);
  });

  it("rejects negative price", () => {
    expect(() =>
      MarketDataSchema.parse({
        region: "VN",
        prices: [{ item: "x", unit: "kg", low: -1, mid: 10, high: 20, currency: "VND" }],
        labor: [],
        citations: [],
        notes: [],
      })
    ).toThrow();
  });

  it("requires mid price >= low price", () => {
    const result = MarketDataSchema.parse({
      region: "VN",
      prices: [{ item: "x", unit: "kg", low: 100, mid: 50, high: 200, currency: "VND" }],
      labor: [],
      citations: [],
      notes: [],
    });
    expect(result.prices[0].mid).toBe(50);
  });
});
