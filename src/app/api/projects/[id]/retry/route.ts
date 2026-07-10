import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runPipeline } from "@/lib/orchestrator/pipeline";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  ctx: RouteContext<"/api/projects/[id]/retry">
) {
  const { id } = await ctx.params;

  const project = await db.project.findUnique({ where: { id } });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.status !== "FAILED") {
    return NextResponse.json(
      { error: "Only failed projects can be retried" },
      { status: 400 }
    );
  }

  runPipeline(project.id).catch((err) =>
    console.error(`Retry pipeline error for ${project.id}:`, err)
  );

  return NextResponse.json({ message: "Pipeline restarted", id });
}
