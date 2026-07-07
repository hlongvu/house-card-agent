import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runPipeline } from "@/lib/orchestrator";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const maxMb = parseInt(process.env.MAX_UPLOAD_MB || "25", 10);
    if (file.size > maxMb * 1024 * 1024) {
      return NextResponse.json(
        { error: `File too large. Max ${maxMb}MB` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

    const uploadDir = process.env.UPLOAD_DIR || "./uploads";
    fs.mkdirSync(/*turbopackIgnore: true*/ path.resolve(uploadDir), { recursive: true });

    const ext = path.extname(file.name);
    const storageName = `${Date.now()}-${sha256.slice(0, 8)}${ext}`;
    const storagePath = path.join(uploadDir, storageName);

    fs.writeFileSync(/*turbopackIgnore: true*/ path.resolve(storagePath), buffer);

    const title = formData.get("title")?.toString() || file.name;
    const region = formData.get("region")?.toString() || process.env.DEFAULT_REGION || "VN-HCM";

    // Map file extensions without a browser MIME to internal mimetypes
    const extMimeMap: Record<string, string> = {
      ".dwg": "application/acad",
      ".dxf": "application/dxf",
      ".skp": "application/x-sketchup",
      ".glb": "model/gltf-binary",
      ".gltf": "model/gltf+json",
      ".obj": "model/obj",
    };
    const resolvedMime = extMimeMap[ext] || file.type || "application/octet-stream";

    const project = await db.project.create({
      data: {
        title,
        region,
        status: "UPLOADED",
        inputFile: {
          create: {
            filename: file.name,
            mimeType: resolvedMime,
            sizeBytes: file.size,
            storagePath,
            sha256,
          },
        },
      },
      include: { inputFile: true },
    });

    // Kick off pipeline asynchronously (don't await)
    runPipeline(project.id).catch((err) =>
      console.error(`Pipeline error for ${project.id}:`, err)
    );

    return NextResponse.json(project, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Upload error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const projects = await db.project.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      inputFile: {
        select: { filename: true, mimeType: true },
      },
      agentRuns: {
        select: { agentName: true, status: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return NextResponse.json(projects);
}
