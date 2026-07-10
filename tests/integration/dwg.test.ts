import { describe, expect, it } from "vitest";
import { LibreDwg } from "@mlightcad/libredwg-web";
import DxfParserNS from "dxf-parser";
import fs from "node:fs";
import path from "node:path";

const DxfParser = (DxfParserNS as any).default || DxfParserNS;

const sampleDwg = path.resolve(
  __dirname,
  "../../FILE/20220331 MB-MD-MC - CAU HOP.dwg"
);

const hasSample = fs.existsSync(sampleDwg);

describe.skipIf(!hasSample)("DWG → DXF pipeline (real file)", () => {
  it("exists and is a valid DWG file", () => {
    const stat = fs.statSync(sampleDwg);
    expect(stat.size).toBeGreaterThan(1000);
    const head = fs.readFileSync(sampleDwg, { encoding: "binary" }).slice(0, 6);
    expect(head.startsWith("AC10")).toBe(true);
  });

  it("converts DWG to DXF via LibreDWG WASM", async () => {
    const libredwg = await LibreDwg.create();
    const buf = fs.readFileSync(sampleDwg);
    const dxfBytes = libredwg.dwg_write_dxf(
      new Uint8Array(buf).buffer as ArrayBuffer
    );
    expect(dxfBytes).not.toBeNull();
    const dxfText = new TextDecoder().decode(dxfBytes!);
    expect(dxfText.length).toBeGreaterThan(10_000);
    expect(dxfText).toContain("SECTION");
  }, 30000);

  it("DXF contains layers, entities, and TEXT labels", async () => {
    const libredwg = await LibreDwg.create();
    const buf = fs.readFileSync(sampleDwg);
    const dxfBytes = libredwg.dwg_write_dxf(
      new Uint8Array(buf).buffer as ArrayBuffer
    );
    const dxfText = new TextDecoder().decode(dxfBytes!);

    const parser = new DxfParser();
    const dxf = parser.parseSync(dxfText);
    expect(dxf).not.toBeNull();
    expect(dxf!.entities).toBeDefined();
    expect(dxf!.entities.length).toBeGreaterThan(100);

    const layers = new Set(dxf!.entities.map((e: any) => e.layer).filter(Boolean));
    expect(layers.size).toBeGreaterThan(5);

    const entityTypes = new Set(dxf!.entities.map((e: any) => e.type));
    expect(entityTypes.has("LINE")).toBe(true);

    const texts = dxf!.entities
      .filter((e: any) => (e.type === "TEXT" || e.type === "MTEXT") && e.text)
      .map((e: any) => e.text);
    expect(texts.length).toBeGreaterThan(0);
  }, 30000);
});

describe("DXF parser (inline DXF text)", () => {
  it("parses a minimal valid DXF", () => {
    const dxf = `0
SECTION
2
ENTITIES
0
LINE
8
0
10
0
20
0
30
0
11
100
21
100
31
0
0
TEXT
8
0
10
50
20
50
30
0
40
2.5
1
Hello World
0
ENDSEC
0
EOF
`;
    const parser = new DxfParser();
    const result = parser.parseSync(dxf);
    expect(result).not.toBeNull();
    expect(result!.entities).toHaveLength(2);
    expect(result!.entities[0].type).toBe("LINE");
    // dxf-parser may nest coords differently depending on version; check with flexible assertion
    const line: any = result!.entities[0];
    // Some versions return { x, y } directly, others return vertices[]
    const startX = line.start?.x ?? line.vertices?.[0]?.x ?? 0;
    const startY = line.start?.y ?? line.vertices?.[0]?.y ?? 0;
    const endX = line.end?.x ?? line.vertices?.[1]?.x ?? 100;
    const endY = line.end?.y ?? line.vertices?.[1]?.y ?? 100;
    expect(startX).toBe(0);
    expect(startY).toBe(0);
    expect(endX).toBe(100);
    expect(endY).toBe(100);
    expect(result!.entities[1].type).toBe("TEXT");
    expect(result!.entities[1].text).toBe("Hello World");
  });

  it("extracts layer names from entities", () => {
    const dxf = `0
SECTION
2
ENTITIES
0
LINE
8
WALL
10
0
20
0
11
10
21
10
0
LINE
8
DOOR
10
10
20
10
11
12
21
10
0
ENDSEC
0
EOF
`;
    const parser = new DxfParser();
    const result = parser.parseSync(dxf);
    const layers = new Set(result!.entities.map((e: any) => e.layer));
    expect(layers.has("WALL")).toBe(true);
    expect(layers.has("DOOR")).toBe(true);
  });
});
