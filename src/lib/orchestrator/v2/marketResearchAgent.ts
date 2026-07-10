import { Agent } from "@/lib/agents";
import { MarketDataSchema, type MarketData } from "@/lib/schemas/marketData";
import { type BillOfQuantities } from "@/lib/schemas/boq";
import { callLLMStructured } from "@/lib/llm/client";
import { webSearch } from "@/lib/llm/tools/webSearch";

export type MarketResearchInput = {
  boq: BillOfQuantities;
  region: string;
};

/**
 * Market Research Agent — researches current unit prices and labor rates.
 */
const INSTRUCTIONS =
  "You are a construction market analyst specializing in Vietnam. Given a bill of quantities and web search results, compile current market unit prices and labor rates for the region.";

export const marketResearchAgent = new Agent<MarketResearchInput, MarketData, unknown>({
  name: "market-research",
  description: "Researches current construction material prices and labor rates",
  instructions: INSTRUCTIONS,
  outputSchema: MarketDataSchema,

  async execute({ boq, region }) {
    const categories = Array.from(
      new Set(boq.items.map((i) => i.category))
    );

    const searchResults: any[] = [];
    for (const category of categories.slice(0, 5)) {
      const results = await webSearch(
        `construction material price ${category} Vietnam ${region} 2024 2025 per unit`
      );
      searchResults.push(...results);
    }
    searchResults.push(
      ...(await webSearch(`construction labor rate daily wage Vietnam ${region} 2024 2025`))
    );

    const searchContext = searchResults
      .slice(0, 20)
      .map((r) => `- ${r.title}: ${r.snippet}`)
      .join("\n");

    const userPrompt = `
Region: ${region}
BOQ Categories: ${categories.join(", ")}

Web Search Results:
${searchContext || "No web search results available. Use your knowledge of Vietnamese construction market prices."}

Compile: unit prices (low/mid/high in VND), labor rates by trade, citations.
`;

    return callLLMStructured<MarketData>(
      INSTRUCTIONS,
      userPrompt,
      {
        type: "object",
        properties: {
          region: { type: "string" },
          prices: {
            type: "array",
            items: {
              type: "object",
              properties: {
                item: { type: "string" },
                unit: { type: "string" },
                low: { type: "number" },
                mid: { type: "number" },
                high: { type: "number" },
                currency: { type: "string" },
                sourceUrl: { type: "string" },
                sourceTitle: { type: "string" },
                fetchedAt: { type: "string" },
              },
              required: ["item", "unit", "low", "mid", "high", "currency"],
              additionalProperties: false,
            },
          },
          labor: {
            type: "array",
            items: {
              type: "object",
              properties: {
                trade: { type: "string" },
                unit: { type: "string" },
                rateLow: { type: "number" },
                rateMid: { type: "number" },
                rateHigh: { type: "number" },
                currency: { type: "string" },
                sourceUrl: { type: "string" },
                sourceTitle: { type: "string" },
              },
              required: ["trade", "rateLow", "rateMid", "rateHigh", "currency"],
              additionalProperties: false,
            },
          },
          citations: {
            type: "array",
            items: {
              type: "object",
              properties: { url: { type: "string" }, title: { type: "string" }, accessedAt: { type: "string" } },
              required: ["url", "title"],
              additionalProperties: false,
            },
          },
          notes: { type: "array", items: { type: "string" } },
        },
        required: ["region", "prices", "labor", "citations", "notes"],
        additionalProperties: false,
      }
    );
  },
});
