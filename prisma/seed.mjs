import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const email = "lumethaadmin@lumetha.lu";
const password = process.env.LUMETHA_BOOTSTRAP_PASSWORD ?? "LumethaAdmin.";

try {
  const admin = await prisma.user.upsert({
    where: { email },
    update: { name: "Lumetha Admin", password: await bcrypt.hash(password, 12), role: "admin" },
    create: { name: "Lumetha Admin", email, password: await bcrypt.hash(password, 12), role: "admin" },
  });
  const company = await prisma.company.upsert({
    where: { slug: "lumetha" },
    update: { ownerId: admin.id, emailDomain: "lumetha.lu" },
    create: { name: "Lumetha", slug: "lumetha", ownerId: admin.id, emailDomain: "lumetha.lu" },
  });
  await prisma.companyMember.upsert({ where: { companyId_userId: { companyId: company.id, userId: admin.id } }, update: { role: "company_admin" }, create: { companyId: company.id, userId: admin.id, role: "company_admin" } });
  await prisma.project.upsert({ where: { key: "LUM" }, update: { companyId: company.id, ownerId: admin.id }, create: { key: "LUM", name: "Lumetha Daybreak", description: "Dusk-to-dawn delivery operations", ownerId: admin.id, companyId: company.id } });
  console.log(`Seeded bootstrap administrator ${email}`);
} finally {
  await prisma.$disconnect();
}
