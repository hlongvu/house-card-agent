import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/projects/[id]">
) {
  const { id } = await ctx.params;

  const project = await db.project.findUnique({
    where: { id },
    include: {
      inputFile: {
        select: { filename: true, mimeType: true, sizeBytes: true },
      },
      designSpec: {
        select: { summary: true, gfaM2: true, rooms: true, levels: true },
      },
      boq: {
        select: { totalItems: true, items: true },
      },
      marketData: {
        select: { fetchedAt: true },
      },
      agentRuns: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(project);
}
