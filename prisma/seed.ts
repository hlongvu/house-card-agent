import { db } from "../src/lib/db";

async function main() {
  const definitions = [
    {
      name: "parser",
      version: 1,
      prompt:
        "You are a construction design parser. Extract structured building information from architectural blueprints.",
      tools: {},
    },
    {
      name: "quantifier",
      version: 1,
      prompt:
        "You are a quantity surveyor. Given a design specification, produce a comprehensive bill of quantities.",
      tools: {},
    },
    {
      name: "market-research",
      version: 1,
      prompt:
        "You are a construction market analyst. Given a bill of quantities, research current unit prices and labor rates.",
      tools: {},
    },
    {
      name: "scheduler",
      version: 1,
      prompt:
        "You are a construction project scheduler. Draft a feasible Gantt-style construction schedule with phases, dependencies, labor allocation, and critical path analysis.",
      tools: {},
    },
    {
      name: "estimator",
      version: 1,
      prompt:
        "You are a senior cost estimator. Produce a final project report including cost breakdown, timeline, risks, and materials summary.",
      tools: {},
    },
  ];

  for (const def of definitions) {
    await db.agentDefinition.upsert({
      where: { name: def.name },
      update: def,
      create: def,
    });
  }

  console.log("Seed complete — 4 agent definitions seeded.");
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
