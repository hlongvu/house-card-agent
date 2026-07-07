import { db } from "@/lib/db";
import { callLLMWithVision, callLLMStructured } from "@/lib/llm/client";
import {
  DesignSpecSchema,
  type DesignSpec,
} from "@/lib/schemas/designSpec";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { LibreDwg } from "@mlightcad/libredwg-web";
import DxfParserNS from "dxf-parser";

const DxfParser = (DxfParserNS as any).default || DxfParserNS;

let _libredwg: LibreDwg | null = null;
async function getLibreDwg(): Promise<LibreDwg> {
  if (!_libredwg) {
    _libredwg = await LibreDwg.create();
  }
  return _libredwg;
}

export async function runParserAgent(runId: string, _dbInstance: PrismaClient) {
  const run = await db.agentRun.findUnique({
    where: { id: runId },
    include: { project: { include: { inputFile: true } } },
  });

  if (!run) throw new Error("AgentRun not found");

  const inputFile = run.project.inputFile;
  if (!inputFile) throw new Error("No input file found");

  const filePath = path.resolve(inputFile.storagePath);
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

  const mimeType = inputFile.mimeType;
  const ext = path.extname(inputFile.filename).toLowerCase();
  let designSpec: DesignSpec;

  const systemPrompt = `You are a construction design parser. Analyze the provided blueprint/rendering of a house and extract structured information about the building design. Return a valid JSON object with the structure specified. All measurements should be in metric units (meters, m²).`;

  if (ext === ".dwg") {
    const dxfText = await convertDwgToDxf(filePath);
    if (!dxfText) {
      throw new Error(
        "DWG conversion to DXF failed. The file may be corrupt, encrypted, or use an unsupported DWG version."
      );
    }
    designSpec = await parseDxfContent(dxfText, systemPrompt);
  } else if (ext === ".dxf") {
    const dxfText = fs.readFileSync(filePath, "utf-8");
    designSpec = await parseDxfContent(dxfText, systemPrompt);
  } else if (ext === ".skp") {
    throw new Error(
      "SKP files are not directly supported. Please use SketchUp to export the file as glTF (.glb), OBJ, or 2D DWG/DXF, then upload the converted file."
    );
  } else if (mimeType === "application/pdf" || ext === ".pdf") {
    const mod = await import("pdf-parse");
    const PDFParse = (mod as any).PDFParse;
    const buffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();
    const text: string = textResult?.text || "";
    await parser.destroy();

    const userPrompt = `
You are analyzing an architectural PDF for a residential building project.
Extract the following details from the PDF text content:

**PDF Text Content (first 8000 chars):**
${text.slice(0, 8000)}

Provide a structured analysis of the building design. Pay attention to:
- Room types and approximate areas
- Number of floors/levels
- Gross floor area (sum of all floor areas)
- Roof type (flat, pitched, etc.)
- Foundation type
- Structural system (concrete frame, load-bearing masonry, etc.)
- Exterior wall type (brick, concrete, etc.)
- Number of doors and windows
- Finish specifications
- MEP systems mentioned
`;

    designSpec = await callLLMStructured<DesignSpec>(
      systemPrompt,
      userPrompt,
      designSpecJsonSchema()
    );
  } else if (mimeType.startsWith("image/")) {
    const buffer = fs.readFileSync(filePath);
    const base64 = buffer.toString("base64");

    const userPrompt = `
You are analyzing an architectural rendering/blueprint image of a residential building.
Extract the following details from the image:

Provide a structured analysis of the building design visible in the image. Pay attention to:
- Room types and approximate areas
- Number of floors/levels
- Gross floor area (estimate)
- Roof type (flat, pitched, etc.)
- Foundation type (infer if possible)
- Structural system (concrete frame, load-bearing masonry, etc.)
- Exterior wall type
- Number of doors and windows visible
- Finish specifications visible
- MEP systems that would be expected
`;

    const response = await callLLMWithVision(systemPrompt + "\n\n" + userPrompt, base64, mimeType);
    const raw = response.choices[0]?.message?.content || "{}";

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    designSpec = DesignSpecSchema.parse(parsed);
  } else {
    throw new Error(
      `Unsupported file type: ${mimeType}. Accepted: .dwg, .dxf, .pdf, .jpg, .png`
    );
  }

  const validated = DesignSpecSchema.parse(designSpec);

  await db.designSpec.create({
    data: {
      projectId: run.projectId,
      rawJson: validated as any,
      summary: validated.summary,
      gfaM2: validated.gfaM2,
      rooms: validated.rooms,
      levels: validated.levels,
    },
  });

  await db.agentRun.update({
    where: { id: runId },
    data: { output: validated as any },
  });
}

// ── DWG → DXF conversion via LibreDwg (WASM) ──

async function convertDwgToDxf(dwgPath: string): Promise<string | null> {
  const libredwg = await getLibreDwg();
  const rawBuffer = fs.readFileSync(dwgPath);
  const buffer = new Uint8Array(rawBuffer).buffer as ArrayBuffer;
  const dxfBytes = libredwg.dwg_write_dxf(buffer);
  if (!dxfBytes) return null;
  return new TextDecoder().decode(dxfBytes);
}

// ── DXF content → DesignSpec via dxf-parser + LLM ──

async function parseDxfContent(
  dxfText: string,
  systemPrompt: string
): Promise<DesignSpec> {
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
  let totalLineLengthM = 0;
  const textEntities: string[] = [];

  for (const e of entities) {
    entityCounts[e.type] = (entityCounts[e.type] || 0) + 1;

    if (e.type === "LINE" && e.start && e.end) {
      const dx = e.end.x - e.start.x;
      const dy = e.end.y - e.start.y;
      totalLineLengthM += Math.sqrt(dx * dx + dy * dy) / 1000; // mm → m
    }
    if ((e.type === "MTEXT" || e.type === "TEXT") && e.text) {
      textEntities.push(e.text);
    }
    if (e.type === "INSERT" && e.name) {
      textEntities.push(`Block: ${e.name}`);
    }
  }

  // Bounding box
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const e of entities) {
    const candidates: Array<{ x?: number; y?: number }> = [];
    if (e.vertices) candidates.push(...e.vertices);
    if (e.position) candidates.push(e.position);
    if (e.start) candidates.push(e.start);
    if (e.end) candidates.push(e.end);
    for (const v of candidates) {
      if (typeof v.x === "number") {
        if (v.x < minX) minX = v.x;
        if (v.x > maxX) maxX = v.x;
      }
      if (typeof v.y === "number") {
        if (v.y < minY) minY = v.y;
        if (v.y > maxY) maxY = v.y;
      }
    }
  }

  let totalAreaM2 = 0;
  if (minX !== Infinity) {
    totalAreaM2 = ((maxX - minX) * (maxY - minY)) / 1_000_000; // mm² → m²
  }

  const cadSummary = `
**DXF Parsed Data:**
- Layers found (${layers.length}): ${layers.slice(0, 30).join(", ")}${layers.length > 30 ? "..." : ""}
- Entity counts: ${JSON.stringify(entityCounts)}
- Text/annotations found: ${textEntities.length} items
  ${textEntities.slice(0, 40).map((t) => `  - "${t}"`).join("\n")}
- Approx bounding box area: ${totalAreaM2.toFixed(1)} m²
- Total line length: ${totalLineLengthM.toFixed(1)} m
`;

  const userPrompt = `
You are analyzing a CAD drawing (DXF format) for a residential building project.
Below is metadata extracted from the drawing.

${cadSummary}

Provide a structured analysis of the building design. Pay attention to:
- Room types and approximate areas (infer from text labels and bounding geometry)
- Number of floors/levels (infer from layers or text)
- Gross floor area (use the bounding box as a rough estimate)
- Roof type
- Foundation type
- Structural system (concrete frame, load-bearing masonry, etc.)
- Exterior wall type
- Number of doors and windows (infer from blocks/inserts named DOOR/WINDOW or similar)
- Finish specifications from text annotations
- MEP systems expected
`;

  return callLLMStructured<DesignSpec>(
    systemPrompt,
    userPrompt,
    designSpecJsonSchema()
  );
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
          properties: {
            name: { type: "string" },
            areaM2: { type: "number" },
            level: { type: "number" },
          },
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
        properties: {
          doors: { type: "number" },
          windows: { type: "number" },
        },
        required: ["doors", "windows"],
        additionalProperties: false,
      },
      finishes: {
        type: "object",
        properties: {
          flooring: { type: "string" },
          wallFinish: { type: "string" },
          ceiling: { type: "string" },
        },
        required: ["flooring", "wallFinish", "ceiling"],
        additionalProperties: false,
      },
      mep: {
        type: "object",
        properties: {
          electrical: { type: "boolean" },
          plumbing: { type: "boolean" },
          hvac: { type: "boolean" },
        },
        required: ["electrical", "plumbing", "hvac"],
        additionalProperties: false,
      },
      summary: { type: "string" },
      notes: { type: "array", items: { type: "string" } },
    },
    required: [
      "projectType", "levels", "rooms", "roomList", "gfaM2", "roofType",
      "foundationType", "structuralSystem", "exteriorWalls", "openings",
      "finishes", "mep", "summary", "notes",
    ],
    additionalProperties: false,
  };
}
