import { db } from "@/lib/db";
import { callLLMStructured } from "@/lib/llm/client";
import {
  ConstructionScheduleSchema,
  type ConstructionSchedule,
} from "@/lib/schemas/schedule";
import { type PrismaClient } from "@prisma/client";

export async function runScheduleAgent(runId: string, _dbInstance: PrismaClient) {
  const run = await db.agentRun.findUnique({
    where: { id: runId },
    include: {
      project: {
        include: {
          designSpec: true,
          boq: true,
        },
      },
    },
  });

  if (!run) throw new Error("AgentRun not found");
  if (!run.project.boq) throw new Error("BillOfQuantities not available yet");

  const designSpec = run.project.designSpec?.rawJson;
  const boqItems = run.project.boq.items as any[];
  const region = process.env.DEFAULT_REGION || "VN-HCM";

  const boqSummary = (boqItems || []).reduce((acc: Record<string, number>, item: any) => {
    const key = item.category || "other";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const boqMaterials = (boqItems || [])
    .slice(0, 60)
    .map((it: any) => `- [${it.category}] ${it.item}: ${it.qty} ${it.unit}`)
    .join("\n");

  const systemPrompt = `You are a senior construction project scheduler in Vietnam. Given a design specification and bill of quantities, draft a feasible, realistic construction schedule (Gantt-style) using Vietnamese construction practices.

Apply these rules:
1. Sequence phases in correct construction order:
   site prep -> foundation/footing -> ground-floor structure -> upper floors structure -> roofing -> MEP rough-in (electrical, plumbing) -> wall plastering -> tiling/waterproofing -> wall finishing/paint -> MEP fixtures -> doors/windows installation -> final finishes -> handover

2. Each phase must reference which prior phases it dependsOn (by phase id) — e.g. structural work depends on foundation, tiling depends on plastering.

3. Estimate duration from BOQ quantities and Vietnamese productivity norms:
   - Concrete pour: ~10-15 m³/day with 4 workers
   - Brickwork: ~2-3 m²/hr per mason
   - Plastering: ~15-20 m²/day per plasterer
   - Tiling: ~8-12 m²/day per tiler
   - Painting: ~30-40 m²/day per painter
   - Formwork: ~12-15 m²/day per carpenter
   - Steel rebar: ~80-120 kg/day per steel worker

4. Identify the critical path (phases that, if delayed, delay the whole project).

5. Mark phases as weatherSensitive if they involve outdoor concrete, plastering, or roofing (relevant in Vietnam's rainy season May-November in the south, Oct-Mar in the north).

6. Output absolute dates (startDate, endDate as ISO yyyy-mm-dd) assuming project starts in 30 days from today (you can compute the exact ISO date by adding days).`;

  const today = new Date();
  const startDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const startIso = startDate.toISOString().slice(0, 10);

  const userPrompt = `
Region: ${region}
Start date (project begins 30 days from now): ${startIso}

**Design Specification:**
${JSON.stringify(designSpec, null, 2)}

**BOQ Summary by category:**
${JSON.stringify(boqSummary, null, 2)}

**BOQ Materials (first 60 items):**
${boqMaterials}

**Building overview:**
- Gross floor area: ${(designSpec as any)?.gfaM2 ?? "unknown"} m²
- Levels: ${(designSpec as any)?.levels ?? "unknown"}
- Rooms: ${(designSpec as any)?.rooms ?? "unknown"}
- Roof type: ${(designSpec as any)?.roofType ?? "unknown"}
- Structural system: ${(designSpec as any)?.structuralSystem ?? "unknown"}

Draft a feasible construction schedule as a Gantt chart. For each phase provide:
- id (kebab-case identifier like "foundation", "structure-l1", "roofing")
- name (Vietnamese-friendly name)
- category (one of: site-prep, foundation, structure, roofing, mep-rough, plaster, tile, finish, handover)
- startDay, durationDays, endDay
- dependsOn (array of phase ids that must complete first)
- laborByTrade (trade, workers count, total man-days for the phase)
- keyMaterials (list of 2-5 key material categories from BOQ used in this phase)
- description (1-2 sentences)
- weatherSensitive (boolean)

Provide 10-16 phases. Compute endDate = startDate + totalDurationDays (in ISO yyyy-mm-dd).
`;

  const jsonSchema = {
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
          required: [
            "id", "name", "category", "startDay", "durationDays", "endDay",
            "dependsOn", "laborByTrade", "keyMaterials", "description", "weatherSensitive"
          ],
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
    required: [
      "totalDurationDays", "phases", "criticalPath", "riskFactors", "notes"
    ],
    additionalProperties: false,
  };

  const schedule = await callLLMStructured<ConstructionSchedule>(
    systemPrompt,
    userPrompt,
    jsonSchema
  );

  const validated = ConstructionScheduleSchema.parse(schedule);

  await db.schedule.create({
    data: {
      projectId: run.projectId,
      phases: validated.phases as any,
      totalDurationDays: validated.totalDurationDays,
      startDate: validated.startDate,
      endDate: validated.endDate,
      criticalPath: validated.criticalPath as any,
      riskFactors: validated.riskFactors as any,
      notes: validated.notes as any,
    },
  });

  await db.agentRun.update({
    where: { id: runId },
    data: { output: validated as any },
  });
}
