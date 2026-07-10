import { Agent } from "@/lib/agents";
import { ReportSchema, type Report } from "@/lib/schemas/report";
import { type DesignSpec } from "@/lib/schemas/designSpec";
import { type BillOfQuantities } from "@/lib/schemas/boq";
import { type MarketData } from "@/lib/schemas/marketData";
import { callLLMStructured } from "@/lib/llm/client";

export type EstimatorInput = {
  designSpec: DesignSpec;
  boq: BillOfQuantities;
  marketData: MarketData;
  region: string;
};

/**
 * Estimator Agent — produces the final report (cost, timeline, risks, materials).
 */
const INSTRUCTIONS =
  "You are a senior construction cost estimator in Vietnam. Produce a comprehensive project report including cost breakdown, timeline, risks, and materials. Apply 10% contingency. All costs in VND.";

export const estimatorAgent = new Agent<EstimatorInput, Report, unknown>({
  name: "estimator",
  description: "Produces a final project report including cost breakdown, timeline, risks, and materials",
  instructions: INSTRUCTIONS,
  outputSchema: ReportSchema,

  async execute({ designSpec, boq, marketData, region }) {
    const userPrompt = `
Design Spec: ${JSON.stringify(designSpec, null, 2)}
BOQ: ${JSON.stringify(boq, null, 2)}
Market Prices: ${JSON.stringify(marketData, null, 2)}
Labor: ${JSON.stringify(marketData, null, 2)}
Region: ${region}

Produce a complete report: cost breakdown, timeline, risks, materials, labor, citations, assumptions, markdown.
`;

    return callLLMStructured<Report>(
      INSTRUCTIONS,
      userPrompt,
      {
        type: "object",
        properties: {
          title: { type: "string" },
          region: { type: "string" },
          cost: {
            type: "object",
            properties: {
              currency: { type: "string" },
              subtotalLow: { type: "number" },
              subtotalMid: { type: "number" },
              subtotalHigh: { type: "number" },
              contingencyPct: { type: "number" },
              totalLow: { type: "number" },
              totalMid: { type: "number" },
              totalHigh: { type: "number" },
              lines: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    category: { type: "string" },
                    description: { type: "string" },
                    qty: { type: "number" },
                    unit: { type: "string" },
                    unitCostLow: { type: "number" },
                    unitCostMid: { type: "number" },
                    unitCostHigh: { type: "number" },
                    totalLow: { type: "number" },
                    totalMid: { type: "number" },
                    totalHigh: { type: "number" },
                  },
                  required: ["category", "description", "qty", "unit", "unitCostLow", "unitCostMid", "unitCostHigh", "totalLow", "totalMid", "totalHigh"],
                  additionalProperties: false,
                },
              },
            },
            required: ["currency", "subtotalLow", "subtotalMid", "subtotalHigh", "contingencyPct", "totalLow", "totalMid", "totalHigh", "lines"],
            additionalProperties: false,
          },
          timeline: {
            type: "object",
            properties: {
              totalDays: { type: "number" },
              phases: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    startDay: { type: "number" },
                    durationDays: { type: "number" },
                    endDay: { type: "number" },
                    description: { type: "string" },
                    laborByTrade: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: { trade: { type: "string" }, manDays: { type: "number" } },
                        required: ["trade", "manDays"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["name", "startDay", "durationDays", "endDay"],
                  additionalProperties: false,
                },
              },
            },
            required: ["totalDays", "phases"],
            additionalProperties: false,
          },
          risks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                level: { type: "string", enum: ["low", "medium", "high"] },
                title: { type: "string" },
                description: { type: "string" },
              },
              required: ["level", "title", "description"],
              additionalProperties: false,
            },
          },
          materials: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                item: { type: "string" },
                qty: { type: "number" },
                unit: { type: "string" },
              },
              required: ["category", "item", "qty", "unit"],
              additionalProperties: false,
            },
          },
          labor: {
            type: "array",
            items: {
              type: "object",
              properties: { trade: { type: "string" }, manDays: { type: "number" } },
              required: ["trade", "manDays"],
              additionalProperties: false,
            },
          },
          citations: {
            type: "array",
            items: {
              type: "object",
              properties: { url: { type: "string" }, title: { type: "string" } },
              required: ["url", "title"],
              additionalProperties: false,
            },
          },
          markdown: { type: "string" },
          assumptions: { type: "array", items: { type: "string" } },
          generatedAt: { type: "string" },
        },
        required: ["title", "region", "cost", "timeline", "risks", "materials", "labor", "citations", "markdown", "assumptions", "generatedAt"],
        additionalProperties: false,
      }
    );
  },
});
