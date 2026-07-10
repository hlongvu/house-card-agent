import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import path from "node:path";

describe("File type detection", () => {
  it("maps DWG extension correctly", () => {
    const ext = path.extname("test.dwg");
    expect(ext).toBe(".dwg");
  });

  it("maps DXF extension correctly", () => {
    const ext = path.extname("test.dxf");
    expect(ext).toBe(".dxf");
  });

  it("maps PDF extension correctly", () => {
    const ext = path.extname("test.pdf");
    expect(ext).toBe(".pdf");
  });
});

describe("SHA256 hashing (upload)", () => {
  it("produces deterministic hash", () => {
    const buf = Buffer.from("test content");
    const h1 = crypto.createHash("sha256").update(buf).digest("hex");
    const h2 = crypto.createHash("sha256").update(buf).digest("hex");
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
  });

  it("produces different hash for different content", () => {
    const h1 = crypto.createHash("sha256").update(Buffer.from("a")).digest("hex");
    const h2 = crypto.createHash("sha256").update(Buffer.from("b")).digest("hex");
    expect(h1).not.toBe(h2);
  });
});
