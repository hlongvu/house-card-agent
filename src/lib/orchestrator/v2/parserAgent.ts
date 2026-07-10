import { Agent, RunContext } from "@/lib/agents";
import { DesignSpecSchema, type DesignSpec } from "@/lib/schemas/designSpec";
import { db } from "@/lib/db";
import path from "node:path";
import fs from "node:fs";
import { LibreDwg } from "@mlightcad/libredwg-web";
import DxfParserNS from "dxf-parser";
import { callLLMWithVision, callLLMStructured } from "@/lib/llm/client";

const DxfParser = (DxfParserNS as any).default || DxfParserNS;

let _libredwg: LibreDwg | null = null;
async function getLibreDwg(): Promise<LibreDwg> {
  if (!_libredwg) _libredwg = await LibreDwg.create();
  return _libredwg;
}

export type ParserInput = {
  projectId: string;
  filePath: string;
  filename: string;
  mimeType: string;
  region: string;
};

/**
 * Parser Agent — reads CAD/PDF/image files and extracts a structured DesignSpec.
 *
 * Following OpenAI Agents SDK pattern: name + instructions + outputSchema + execute.
 */
const INSTRUCTIONS =
  "You are a construction design parser. Analyze the provided blueprint/rendering of a house and extract structured information about the building design.";

export const parserAgent = new Agent<ParserInput, DesignSpec, unknown>({
  name: "parser",
  description: "Reads CAD/PDF/image files and extracts building design spec",
  instructions: INSTRUCTIONS,
  outputSchema: DesignSpecSchema,
  outputGuardrails: [],
  async execute(input, ctx) {
    const ext = path.extname(input.filename).toLowerCase();
    const systemPrompt = INSTRUCTIONS;

    if (ext === ".dwg") {
      const dxfText = await convertDwgToDxf(input.filePath);
      if (!dxfText) {
        throw new Error(
          "DWG conversion to DXF failed. The file may be corrupt, encrypted, or use an unsupported DWG version."
        );
      }
      return parseDxfContent(dxfText, systemPrompt);
    }

    if (ext === ".dxf") {
      const dxfText = fs.readFileSync(input.filePath, "utf-8");
      return parseDxfContent(dxfText, systemPrompt);
    }

    if (ext === ".skp") {
      throw new Error(
        "SKP files are not directly supported. Please use SketchUp to export the file as glTF (.glb), OBJ, or 2D DWG/DXF, then upload the converted file."
      );
    }

    if (input.mimeType === "application/pdf" || ext === ".pdf") {
      return parsePdf(input.filePath, systemPrompt);
    }

    if (input.mimeType.startsWith("image/")) {
      return parseImage(input.filePath, input.mimeType, systemPrompt);
    }

    throw new Error(
      `Unsupported file type: ${input.mimeType}. Accepted: .dwg, .dxf, .pdf, .jpg, .png`
    );
  },
});

// ── Helpers (moved from parserAgent.ts) ──

async function convertDwgToDxf(dwgPath: string): Promise<string | null> {
  const libredwg = await getLibreDwg();
  const rawBuffer = fs.readFileSync(dwgPath);
  const buffer = new Uint8Array(rawBuffer).buffer as ArrayBuffer;
  const dxfBytes = libredwg.dwg_write_dxf(buffer);
  if (!dxfBytes) return null;
  return new TextDecoder().decode(dxfBytes);
}

async function parsePdf(filePath: string, systemPrompt: string): Promise<DesignSpec> {
  const mod = await import("pdf-parse");
  const PDFParse = (mod as any).PDFParse;
  const buffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: buffer });
  const textResult = await parser.getText();
  const text: string = textResult?.text || "";
  await parser.destroy();

  const userPrompt = `
You are analyzing an architectural PDF for a residential building project.
**PDF Text Content (first 8000 chars):**
${text.slice(0, 8000)}

Extract: rooms, areas, levels, GFA, roof, foundation, structure, walls, openings, finishes, MEP.
`;

  return callLLMStructured<DesignSpec>(systemPrompt, userPrompt, designSpecJsonSchema());
}

async function parseImage(
  filePath: string,
  mimeType: string,
  systemPrompt: string
): Promise<DesignSpec> {
  const buffer = fs.readFileSync(filePath);
  const base64 = buffer.toString("base64");
  const userPrompt = `
You are analyzing an architectural rendering/blueprint image of a residential building.
Extract: rooms, areas, levels, GFA, roof, foundation, structure, walls, openings, finishes, MEP.
`;
  const response = await callLLMWithVision(
    systemPrompt + "\n\n" + userPrompt,
    base64,
    mimeType
  );
  const raw = response.choices[0]?.message?.content || "{}";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  return DesignSpecSchema.parse(parsed);
}

async function parseDxfContent(dxfText: string, systemPrompt: string): Promise<DesignSpec> {
  const parser = new DxfParser();
  const dxf = parser.parseSync(dxfText);

  if (!dxf || !dxf.entities) {
    throw new Error(
      "DXF parsing returned no entities. The file may be corrupt or use an unsupported DXF version."
    );
  }

  const entities: any[] = dxf.entities;
  const layers = Array.from(new Set(entities.map((e) => e.layer).filter(Boolean)));

  const entityCounts: Record<string, number> = {};
  const textEntities: string[] = [];
  let totalLineLengthM = 0;

  for (const e of entities) {
    entityCounts[e.type] = (entityCounts[e.type] || 0) + 1;
    if (e.type === "LINE" && e.start && e.end) {
      const dx = e.end.x - e.start.x;
      const dy = e.end.y - e.start.y;
      totalLineLengthM += Math.sqrt(dx * dx + dy * dy) / 1000;
    }
    if ((e.type === "MTEXT" || e.type === "TEXT") && e.text) {
      textEntities.push(e.text);
    }
    if (e.type === "INSERT" && e.name) {
      textEntities.push(`Block: ${e.name}`);
    }
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const e of entities) {
    const candidates: Array<{ x?: number; y?: number }> = [];
    if (e.vertices) candidates.push(...e.vertices);
    if (e.position) candidates.push(e.position);
    if (e.start) candidates.push(e.start);
    if (e.end) candidates.push(e.end);
    for (const v of candidates) {
      if (typeof v.x === "number") { if (v.x < minX) minX = v.x; if (v.x > maxX) maxX = v.x; }
      if (typeof v.y === "number") { if (v.y < minY) minY = v.y; if (v.y > maxY) maxY = v.y; }
    }
  }

  const totalAreaM2 = minX !== Infinity
    ? ((maxX - minX) * (maxY - minY)) / 1_000_000
    : 0;

  const cadSummary = `
**DXF Parsed Data:**
- Layers (${layers.length}): ${layers.slice(0, 30).join(", ")}
- Entity counts: ${JSON.stringify(entityCounts)}
- Text annotations (${textEntities.length}):
${textEntities.slice(0, 40).map((t) => `  - "${t}"`).join("\n")}
- Bounding box area: ${totalAreaM2.toFixed(1)} m²
- Total line length: ${totalLineLengthM.toFixed(1)} m
`;

  const userPrompt = `
You are analyzing a CAD drawing (DXF) for a residential building project.
${cadSummary}
Extract: rooms, areas, levels, GFA, roof, foundation, structure, walls, openings, finishes, MEP.
`;

  return callLLMStructured<DesignSpec>(systemPrompt, userPrompt, designSpecJsonSchema());
}

function designSpecJsonSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      projectType: { type: "string" },
      levels: { type: "number" },
      rooms: { type: "number" },
      roomList: {
        type: "array",
        items: {
          type: "object",
          properties: { name: { type: "string" }, areaM2: { type: "number" }, level: { type: "number" } },
          required: ["name"],
          additionalProperties: false,
        },
      },
      gfaM2: { type: "number" },
      roofType: { type: "string" },
      foundationType: { type: "string" },
      structuralSystem: { type: "string" },
      exteriorWalls: { type: "string" },
      openings: {
        type: "object",
        properties: { doors: { type: "number" }, windows: { type: "number" } },
        required: ["doors", "windows"],
        additionalProperties: false,
      },
      finishes: {
        type: "object",
        properties: { flooring: { type: "string" }, wallFinish: { type: "string" }, ceiling: { type: "string" } },
        required: ["flooring", "wallFinish", "ceiling"],
        additionalProperties: false,
      },
      mep: {
        type: "object",
        properties: { electrical: { type: "boolean" }, plumbing: { type: "boolean" }, hvac: { type: "boolean" } },
        required: ["electrical", "plumbing", "hvac"],
        additionalProperties: false,
      },
      summary: { type: "string" },
      notes: { type: "array", items: { type: "string" } },
    },
    required: ["projectType", "levels", "rooms", "roomList", "gfaM2", "roofType", "foundationType", "structuralSystem", "exteriorWalls", "openings", "finishes", "mep", "summary", "notes"],
    additionalProperties: false,
  };
}
