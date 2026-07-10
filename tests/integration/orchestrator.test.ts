import { describe, expect, it, vi } from "vitest";

// Mock Prisma before importing the orchestrator
vi.mock("@/lib/db", () => ({
  db: createMockDb(),
}));

vi.mock("@/lib/llm/client", () => ({
  callLLMStructured: vi.fn().mockResolvedValue({ ok: true }),
  callLLMWithVision: vi.fn().mockResolvedValue({
    choices: [{ message: { content: '{"projectType": "house"}' } }],
  }),
}));

vi.mock("@/lib/llm/tools/webSearch", () => ({
  webSearch: vi.fn().mockResolvedValue([]),
}));

import { runPipeline } from "@/lib/orchestrator";

function createMockDb() {
  const store: Record<string, any[]> = {
    project: [mockProject()],
    agentDefinition: [],
    agentRun: [],
    designSpec: [],
    billOfQuantities: [],
    marketData: [],
    schedule: [],
    report: [],
    inputFile: [mockInputFile()],
  };

  return {
    project: {
      findUnique: async (args: any) => store.project.find((p) => p.id === args.where.id) || null,
      update: async (args: any) => {
        const p = store.project.find((p) => p.id === args.where.id);
        if (p) Object.assign(p, args.data);
        return p!;
      },
    },
    agentDefinition: {
      findFirst: async (args: any) => store.agentDefinition.find((d) => d.name === args.where.name) || mockAgentDef(args),
    },
    agentRun: {
      findUnique: async (args: any) => store.agentRun.find((r) => r.id === args.where.id) || null,
      create: async (args: any) => {
        const run = { id: `run-${store.agentRun.length}`, ...args.data };
        store.agentRun.push(run);
        return run;
      },
      update: async (args: any) => {
        const run = store.agentRun.find((r) => r.id === args.where.id);
        if (run) Object.assign(run, args.data);
        return run!;
      },
    },
    designSpec: {
      create: async (args: any) => { store.designSpec.push(args.data); return args.data; },
    },
    billOfQuantities: {
      create: async (args: any) => { store.billOfQuantities.push(args.data); return args.data; },
    },
    marketData: {
      create: async (args: any) => { store.marketData.push(args.data); return args.data; },
    },
    schedule: {
      create: async (args: any) => { store.schedule.push(args.data); return args.data; },
    },
    report: {
      create: async (args: any) => { store.report.push(args.data); return args.data; },
    },
    inputFile: {
      findUnique: async () => store.inputFile[0],
    },
    $disconnect: vi.fn(),
  };
}

function mockProject() {
  return {
    id: "test-project-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    title: "Test Project",
    region: "VN-HCM",
    status: "UPLOADED",
    inputFile: mockInputFile(),
    designSpec: null,
    boq: null,
    marketData: null,
    schedule: null,
    report: null,
  };
}

function mockInputFile() {
  return {
    id: "input-1",
    projectId: "test-project-1",
    filename: "test.dxf",
    mimeType: "application/dxf",
    sizeBytes: 1024,
    storagePath: "/dev/null",
    sha256: "abc123",
  };
}

function mockAgentDef(args: any) {
  return {
    id: `def-${args.where.name}`,
    name: args.where.name,
    version: 1,
    prompt: "mock",
    tools: {},
    isActive: true,
  };
}

describe("Orchestrator", () => {
  it("raises when called with an unknown project", async () => {
    // Doesn't pass anything to orchestrator, it uses the mocked DB
    // The mockDB.project.findUnique won't find it because agentRun.query fails
    // We just verify the pipeline runs without throwing on the mocked structure
    // since the agents are all mocked and don't do real work.
    await expect(runPipeline("nonexistent")).rejects.toThrow();
  });
});
