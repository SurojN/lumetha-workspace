ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'pending';
UPDATE "User" SET "role" = 'pending' WHERE "role" = 'developer' AND NOT EXISTS (
  SELECT 1 FROM "CompanyMember" WHERE "CompanyMember"."userId" = "User"."id"
);
