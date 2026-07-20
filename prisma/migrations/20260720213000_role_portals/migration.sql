ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'qa';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'project_manager';

CREATE TABLE "RequirementDocument" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RequirementDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingRecord" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "dueDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RequirementDocument_companyId_status_idx" ON "RequirementDocument"("companyId", "status");
CREATE INDEX "BillingRecord_companyId_status_idx" ON "BillingRecord"("companyId", "status");
ALTER TABLE "RequirementDocument" ADD CONSTRAINT "RequirementDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RequirementDocument" ADD CONSTRAINT "RequirementDocument_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingRecord" ADD CONSTRAINT "BillingRecord_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
