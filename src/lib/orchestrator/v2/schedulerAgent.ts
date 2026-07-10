import { Agent } from "@/lib/agents";
import {
  ConstructionScheduleSchema,
  type ConstructionSchedule,
} from "@/lib/schemas/schedule";
import { type DesignSpec } from "@/lib/schemas/designSpec";
import { type BillOfQuantities } from "@/lib/schemas/boq";
import { callLLMStructured } from "@/lib/llm/client";

export type SchedulerInput = {
  designSpec: DesignSpec;
  boq: BillOfQuantities;
  region: string;
};

/**
 * Schedule Agent — drafts a feasible construction schedule from design + BOQ.
 */
const INSTRUCTIONS =
  "You are a senior construction project scheduler in Vietnam. Given a design specification and bill of quantities, draft a feasible, realistic construction schedule using Vietnamese construction practices.";

export const schedulerAgent = new Agent<SchedulerInput, ConstructionSchedule, unknown>({
  name: "scheduler",
  description: "Drafts a feasible Gantt-style construction schedule with phases, dependencies, and critical path",
  instructions: INSTRUCTIONS,
  outputSchema: ConstructionScheduleSchema,

  async execute({ designSpec, boq, region }) {
    const boqSummary = boq.items.reduce((acc: Record<string, number>, item) => {
      const key = item.category || "other";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const boqMaterials = boq.items
      .slice(0, 60)
      .map((it) => `- [${it.category}] ${it.item}: ${it.qty} ${it.unit}`)
      .join("\n");

    const today = new Date();
    const startDate = new Date(today.getTime() + 30 * 86400000);

    const userPrompt = `
Region: ${region}
Start date: ${startDate.toISOString().slice(0, 10)}

Design Spec: ${JSON.stringify(designSpec, null, 2)}
BOQ Summary: ${JSON.stringify(boqSummary, null, 2)}
BOQ Materials:
${boqMaterials}

Draft a feasible construction schedule (10-16 phases) with correct sequencing:
site-prep → foundation → structure → roofing → mep-rough → plaster → tile → finish → handover
`;

    return callLLMStructured<ConstructionSchedule>(
      INSTRUCTIONS,
      userPrompt,
      {
        type: "object",
        properties: {
          totalDurationDays: { type: "number" },
          startDate: { type: "string" },
          endDate: { type: "string" },
          criticalPath: { type: "array", items: { type: "string" } },
          phases: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                category: { type: "string" },
                startDay: { type: "number" },
                durationDays: { type: "number" },
                endDay: { type: "number" },
                dependsOn: { type: "array", items: { type: "string" } },
                laborByTrade: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      trade: { type: "string" },
                      workers: { type: "number" },
                      manDays: { type: "number" },
                    },
                    required: ["trade", "workers", "manDays"],
                    additionalProperties: false,
                  },
                },
                keyMaterials: { type: "array", items: { type: "string" } },
                description: { type: "string" },
                weatherSensitive: { type: "boolean" },
              },
              required: ["id", "name", "category", "startDay", "durationDays", "endDay", "dependsOn", "laborByTrade", "keyMaterials", "description", "weatherSensitive"],
              additionalProperties: false,
            },
          },
          riskFactors: {
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
          notes: { type: "array", items: { type: "string" } },
        },
        required: ["totalDurationDays", "phases", "criticalPath", "riskFactors", "notes"],
        additionalProperties: false,
      }
    );
  },
});
