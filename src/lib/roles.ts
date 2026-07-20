import "server-only";

import type { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";

export const assignableRoles = [
  "client",
  "developer",
  "qa",
  "project_manager",
  "senior_engineer",
  "admin",
] as const satisfies readonly UserRole[];

export type AssignableRole = (typeof assignableRoles)[number];

const priority: AssignableRole[] = [
  "admin",
  "client",
  "developer",
  "project_manager",
  "qa",
  "senior_engineer",
];

export function primaryRole(roles: AssignableRole[]): AssignableRole {
  return priority.find((role) => roles.includes(role)) ?? roles[0];
}

export async function rolesForUser(userId: string, legacyRole?: UserRole) {
  const assignments = await prisma.userRoleAssignment.findMany({
    where: { userId },
    select: { role: true },
  });
  if (assignments.length) return assignments.map(({ role }) => role);
  return legacyRole && legacyRole !== "pending" ? [legacyRole] : [];
}

export async function userHasRole(
  userId: string,
  roles: readonly UserRole[],
  legacyRole?: UserRole,
) {
  const assigned = await rolesForUser(userId, legacyRole);
  return assigned.some((role) => roles.includes(role));
}
