DROP INDEX IF EXISTS "DeliveryCycle_date_key";
ALTER TABLE "DeliveryCycle"
  ADD COLUMN "status" "CycleStatus" NOT NULL DEFAULT 'intake_open',
  ADD COLUMN "scopeLockedAt" TIMESTAMP(3),
  ADD COLUMN "projectId" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Company" ADD COLUMN "capacityLimit" INTEGER NOT NULL DEFAULT 12;
ALTER TABLE "Task"
  ADD COLUMN "clientDecision" TEXT,
  ADD COLUMN "clientFeedback" JSONB,
  ADD COLUMN "approvedAt" TIMESTAMP(3);

CREATE TABLE "AuditEvent" (
  "id" TEXT NOT NULL,
  "cycleId" TEXT,
  "taskId" TEXT,
  "actorId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DeliveryCycle_projectId_date_idx" ON "DeliveryCycle"("projectId", "date");
CREATE INDEX "AuditEvent_cycleId_createdAt_idx" ON "AuditEvent"("cycleId", "createdAt");
CREATE INDEX "AuditEvent_taskId_createdAt_idx" ON "AuditEvent"("taskId", "createdAt");
ALTER TABLE "DeliveryCycle" ADD CONSTRAINT "DeliveryCycle_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "DeliveryCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
