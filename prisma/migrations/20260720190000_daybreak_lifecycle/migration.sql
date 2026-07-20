CREATE TYPE "UserRole" AS ENUM ('client', 'developer', 'senior_engineer', 'admin');
CREATE TYPE "TaskStatus" AS ENUM ('dusk_intake', 'in_progress', 'pending_senior_review', 'dawn_shipped');

ALTER TABLE "User"
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'developer';

CREATE TABLE "DeliveryCycle" (
  "id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeliveryCycle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeliveryCycle_date_key" ON "DeliveryCycle"("date");
CREATE INDEX "DeliveryCycle_isActive_idx" ON "DeliveryCycle"("isActive");

ALTER TABLE "Task" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Task"
ALTER COLUMN "status" TYPE "TaskStatus"
USING (
  CASE "status"
    WHEN 'in_progress' THEN 'in_progress'
    WHEN 'progress' THEN 'in_progress'
    WHEN 'in_review' THEN 'pending_senior_review'
    WHEN 'pm_review' THEN 'pending_senior_review'
    WHEN 'testing' THEN 'pending_senior_review'
    WHEN 'done' THEN 'dawn_shipped'
    ELSE 'dusk_intake'
  END
)::"TaskStatus";
ALTER TABLE "Task" ALTER COLUMN "status" SET DEFAULT 'dusk_intake';

ALTER TABLE "Task"
ADD COLUMN "rawBrief" TEXT NOT NULL DEFAULT '',
ADD COLUMN "aiParsedChecklist" JSONB,
ADD COLUMN "technicalSummary" TEXT,
ADD COLUMN "reviewerId" TEXT,
ADD COLUMN "reviewChecklist" JSONB,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "deploymentUrl" TEXT,
ADD COLUMN "repositoryUrl" TEXT,
ADD COLUMN "cycleId" TEXT;

CREATE INDEX "Task_cycleId_status_idx" ON "Task"("cycleId", "status");
ALTER TABLE "Task" ADD CONSTRAINT "Task_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "DeliveryCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
