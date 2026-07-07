import { db } from "@/lib/db";
import { callLLMStructured } from "@/lib/llm/client";
import { ReportSchema, type Report } from "@/lib/schemas/report";
import { type PrismaClient } from "@prisma/client";

export async function runEstimatorAgent(runId: string, _dbInstance: PrismaClient) {
  const run = await db.agentRun.findUnique({
    where: { id: runId },
    include: {
      project: {
        include: {
          designSpec: true,
          boq: true,
          marketData: true,
        },
      },
    },
  });

  if (!run) throw new Error("AgentRun not found");
  if (!run.project.boq) throw new Error("BillOfQuantities not available yet");
  if (!run.project.marketData) throw new Error("MarketData not available yet");

  const designSpec = run.project.designSpec?.rawJson;
  const boqItems = run.project.boq.items as any[];
  const prices = run.project.marketData.prices as any;
  const labor = run.project.marketData.labor as any;
  const region = process.env.DEFAULT_REGION || "VN-HCM";

  const systemPrompt = `You are a senior construction cost estimator in Vietnam. You have received the bill of quantities, market unit prices, and labor rates. Your job is to produce a comprehensive project report including:

1. Detailed cost breakdown by category (structural, finishes, MEP, etc.)
2. A realistic construction timeline broken into phases
3. Risk assessment
4. Material summary
5. Labor summary by trade
6. Assumptions made

Apply a 10% contingency to all costs. All costs in VND (Vietnamese Dong). Timeline should account for typical Vietnamese construction practices and weather (dry season March-May, rainy season May-November in southern Vietnam).`;

  const userPrompt = `
Design Spec: ${JSON.stringify(designSpec, null, 2)}
BOQ Items: ${JSON.stringify(boqItems, null, 2)}
Market Prices: ${JSON.stringify(prices, null, 2)}
Labor Rates: ${JSON.stringify(labor, null, 2)}
Region: ${region}

Produce a comprehensive report with:
1. Cost breakdown by major category
2. Timeline in phases (site prep, foundation, structure, roofing, finishes, MEP, handover) — total duration, each phase in days
3. Risk items
4. Materials summary (top items by cost)
5. Labor summary by trade
6. Citations from market data
7. Key assumptions
8. A markdown-formatted human-readable report summary
`;

  const jsonSchema = {
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
              required: [
                "category", "description", "qty", "unit",
                "unitCostLow", "unitCostMid", "unitCostHigh",
                "totalLow", "totalMid", "totalHigh"
              ],
              additionalProperties: false,
            },
          },
        },
        required: [
          "currency", "subtotalLow", "subtotalMid", "subtotalHigh",
          "contingencyPct", "totalLow", "totalMid", "totalHigh", "lines"
        ],
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
                    properties: {
                      trade: { type: "string" },
                      manDays: { type: "number" },
                    },
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
          properties: {
            trade: { type: "string" },
            manDays: { type: "number" },
          },
          required: ["trade", "manDays"],
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
          },
          required: ["url", "title"],
          additionalProperties: false,
        },
      },
      markdown: { type: "string" },
      assumptions: { type: "array", items: { type: "string" } },
      generatedAt: { type: "string" },
    },
    required: [
      "title", "region", "cost", "timeline", "risks", "materials",
      "labor", "citations", "markdown", "assumptions", "generatedAt"
    ],
    additionalProperties: false,
  };

  const report = await callLLMStructured<Report>(
    systemPrompt,
    userPrompt,
    jsonSchema
  );

  const validated = ReportSchema.parse(report);

  await db.report.create({
    data: {
      projectId: run.projectId,
      costJson: validated.cost as any,
      timelineJson: validated.timeline as any,
      risks: validated.risks as any,
      markdown: validated.markdown,
      materials: validated.materials as any,
      labor: validated.labor as any,
      citations: validated.citations as any,
      assumptions: validated.assumptions as any,
    },
  });

  await db.agentRun.update({
    where: { id: runId },
    data: { output: validated as any },
  });
}
