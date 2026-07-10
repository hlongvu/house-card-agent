-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('UPLOADED', 'PARSING', 'QUANTIFYING', 'RESEARCHING', 'SCHEDULING', 'ESTIMATING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AgentRunStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'VN-HCM',
    "status" "ProjectStatus" NOT NULL DEFAULT 'UPLOADED',

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InputFile" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,

    CONSTRAINT "InputFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignSpec" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "rawJson" JSONB NOT NULL,
    "summary" TEXT,
    "gfaM2" DOUBLE PRECISION,
    "rooms" INTEGER,
    "levels" INTEGER,

    CONSTRAINT "DesignSpec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillOfQuantities" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "totalItems" INTEGER NOT NULL,

    CONSTRAINT "BillOfQuantities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketData" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "prices" JSONB NOT NULL,
    "labor" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "costJson" JSONB NOT NULL,
    "timelineJson" JSONB NOT NULL,
    "risks" JSONB NOT NULL,
    "materials" JSONB NOT NULL DEFAULT '[]',
    "labor" JSONB NOT NULL DEFAULT '[]',
    "citations" JSONB NOT NULL DEFAULT '[]',
    "markdown" TEXT NOT NULL,
    "assumptions" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "phases" JSONB NOT NULL,
    "totalDurationDays" INTEGER NOT NULL,
    "startDate" TEXT,
    "endDate" TEXT,
    "criticalPath" JSONB NOT NULL DEFAULT '[]',
    "riskFactors" JSONB NOT NULL DEFAULT '[]',
    "notes" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "tools" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "status" "AgentRunStatus" NOT NULL DEFAULT 'PENDING',
    "input" JSONB NOT NULL,
    "output" JSONB,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InputFile_projectId_key" ON "InputFile"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "DesignSpec_projectId_key" ON "DesignSpec"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "BillOfQuantities_projectId_key" ON "BillOfQuantities"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketData_projectId_key" ON "MarketData"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Report_projectId_key" ON "Report"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Schedule_projectId_key" ON "Schedule"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentDefinition_name_key" ON "AgentDefinition"("name");

-- CreateIndex
CREATE INDEX "AgentRun_projectId_agentName_idx" ON "AgentRun"("projectId", "agentName");

-- AddForeignKey
ALTER TABLE "InputFile" ADD CONSTRAINT "InputFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignSpec" ADD CONSTRAINT "DesignSpec_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillOfQuantities" ADD CONSTRAINT "BillOfQuantities_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketData" ADD CONSTRAINT "MarketData_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "AgentDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
