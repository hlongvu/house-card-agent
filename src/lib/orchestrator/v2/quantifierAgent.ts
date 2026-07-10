import { Agent } from "@/lib/agents";
import { BillOfQuantitiesSchema, type BillOfQuantities } from "@/lib/schemas/boq";
import { type DesignSpec } from "@/lib/schemas/designSpec";
import { callLLMStructured } from "@/lib/llm/client";

/**
 * Quantifier Agent — converts DesignSpec into Bill of Quantities.
 */
const INSTRUCTIONS =
  "You are a construction quantity surveyor. Given a building design specification, produce a detailed bill of quantities (BOQ) listing all materials, quantities, and units required to build the structure.";

export const quantifierAgent = new Agent<DesignSpec, BillOfQuantities, unknown>({
  name: "quantifier",
  description: "Produces a bill of quantities from a design specification",
  instructions: INSTRUCTIONS,
  outputSchema: BillOfQuantitiesSchema,

  async execute(designSpec) {
    const systemPrompt = INSTRUCTIONS;
    const userPrompt = `
Building Design Specification:
${JSON.stringify(designSpec, null, 2)}

Produce a comprehensive bill of quantities for this building. Include:
- Structural materials (concrete, steel rebar, formwork)
- Masonry (bricks, mortar, plaster)
- Roofing materials
- Flooring and wall finishes
- Doors and windows
- MEP rough-in (plumbing, electrical)
- Paint and waterproofing

Provide quantities in standard Vietnamese construction units.
`;

    return callLLMStructured<BillOfQuantities>(systemPrompt, userPrompt, {
      type: "object",
      properties: {
        currency: { type: "string" },
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
    });
  },
});
