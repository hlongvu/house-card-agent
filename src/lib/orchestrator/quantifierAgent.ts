import { db } from "@/lib/db";
import { callLLMStructured } from "@/lib/llm/client";
import {
  BillOfQuantitiesSchema,
  type BillOfQuantities,
} from "@/lib/schemas/boq";
import { type PrismaClient } from "@prisma/client";

export async function runQuantifierAgent(runId: string, _dbInstance: PrismaClient) {
  const run = await db.agentRun.findUnique({
    where: { id: runId },
    include: { project: { include: { designSpec: true } } },
  });

  if (!run) throw new Error("AgentRun not found");
  if (!run.project.designSpec) throw new Error("DesignSpec not available yet");

  const designSpec = run.project.designSpec.rawJson as any;

  const systemPrompt = `You are a construction quantity surveyor. Given a building design specification, produce a detailed bill of quantities (BOQ) listing all materials, quantities, and units required to build the structure. Think about: concrete, rebar, bricks/blocks, mortar, roofing materials, flooring, wall finishes, ceiling, doors, windows, electrical wiring, plumbing pipes, fixtures, paint, and any other materials typically needed for a residential house in Southeast Asia (Vietnam).`;

  const userPrompt = `
Building Design Specification:
${JSON.stringify(designSpec, null, 2)}

Produce a comprehensive bill of quantities for this building. Include:
- All structural materials (concrete, steel rebar, formwork)
- Masonry (bricks, mortar, plaster)
- Roofing materials
- Flooring and wall finishes
- Doors and windows (count and materials)
- MEP rough-in (plumbing pipes, electrical conduits, wiring)
- Paint and waterproofing
- Other items typical for Vietnamese residential construction

Provide quantities in standard Vietnamese construction units (m³, m², kg, pieces, etc.).
`;

  const jsonSchema = {
    type: "object",
    properties: {
      currency: { type: "string", default: "VND" },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            category: { type: "string" },
            item: { type: "string" },
            qty: { type: "number" },
            unit: { type: "string" },
            notes: { type: "string" },
          },
          required: ["category", "item", "qty", "unit"],
          additionalProperties: false,
        },
      },
      assumptions: { type: "array", items: { type: "string" } },
    },
    required: ["currency", "items", "assumptions"],
    additionalProperties: false,
  };

  const boq = await callLLMStructured<BillOfQuantities>(
    systemPrompt,
    userPrompt,
    jsonSchema
  );

  const validated = BillOfQuantitiesSchema.parse(boq);

  await db.billOfQuantities.create({
    data: {
      projectId: run.projectId,
      items: validated.items as any,
      totalItems: validated.items.length,
    },
  });

  await db.agentRun.update({
    where: { id: runId },
    data: { output: validated as any },
  });
}
