import { db } from "@/lib/db";
import { callLLMStructured } from "@/lib/llm/client";
import { webSearch } from "@/lib/llm/tools/webSearch";
import {
  MarketDataSchema,
  type MarketData,
} from "@/lib/schemas/marketData";
import { type PrismaClient } from "@prisma/client";

export async function runMarketResearchAgent(runId: string, _dbInstance: PrismaClient) {
  const run = await db.agentRun.findUnique({
    where: { id: runId },
    include: { project: { include: { boq: true } } },
  });

  if (!run) throw new Error("AgentRun not found");

  const boq = run.project.boq;
  const categories = boq
    ? Array.from(
        new Set(
          (boq.items as any[]).map((i: any) => i.category)
        )
      )
    : [];

  const region = process.env.DEFAULT_REGION || "VN-HCM";

  // Search for current market prices
  const searchResults: any[] = [];
  for (const category of categories.slice(0, 5)) {
    const results = await webSearch(
      `construction material price ${category} Vietnam ${region} 2024 2025 per unit`
    );
    searchResults.push(...results);
  }

  const laborSearch = await webSearch(
    `construction labor rate daily wage Vietnam ${region} 2024 2025`
  );
  searchResults.push(...laborSearch);

  const searchContext = searchResults
    .slice(0, 20)
    .map((r) => `- [${r.title}](${r.url}): ${r.snippet}`)
    .join("\n");

  const systemPrompt = `You are a construction market analyst specializing in Vietnam. Given a bill of quantities and web search results, compile current market unit prices and labor rates for the region. 

Include for each item:
- Low, mid, and high unit prices in VND
- Source citations where available
- Labor rates by trade (Vietnamese man-day rates)

Convert all prices to VND. For items where exact data isn't available, provide reasonable estimates based on regional construction norms in Vietnam.`;

  const userPrompt = `
Region: ${region}
BOQ Categories: ${categories.join(", ")}

Web Search Results:
${searchContext || "No web search results available. Use your knowledge of Vietnamese construction market prices."}

Please compile a comprehensive market data report with:
1. Unit prices for each category of construction material
2. Labor rates by trade (carpenter, mason, electrician, plumber, painter, steel worker, general laborer)
3. Source citations for the data
4. Any notes about market conditions, seasonal variations
`;

  const jsonSchema = {
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
          properties: {
            url: { type: "string" },
            title: { type: "string" },
            accessedAt: { type: "string" },
          },
          required: ["url", "title"],
          additionalProperties: false,
        },
      },
      notes: { type: "array", items: { type: "string" } },
    },
    required: ["region", "prices", "labor", "citations", "notes"],
    additionalProperties: false,
  };

  const marketData = await callLLMStructured<MarketData>(
    systemPrompt,
    userPrompt,
    jsonSchema
  );

  const validated = MarketDataSchema.parse(marketData);

  await db.marketData.create({
    data: {
      projectId: run.projectId,
      prices: validated.prices as any,
      labor: validated.labor as any,
    },
  });

  await db.agentRun.update({
    where: { id: runId },
    data: { output: validated as any },
  });
}
