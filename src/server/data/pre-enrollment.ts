import { prisma } from "@/lib/prisma";
import { EnrollmentWithRelations } from "@/types/enrollment";

export async function ensurePreEnrollment(userId: string) {
  const current = await prisma.preEnrollment.findFirst({
    where: {
      userId,
      status: { notIn: ["CONFIRMED", "REJECTED"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (current) {
    return current;
  }

  return prisma.preEnrollment.create({
    data: { userId },
  });
}

export async function fetchEnrollmentWithRelations(
  userId: string
): Promise<EnrollmentWithRelations | null> {
  return prisma.preEnrollment.findFirst({
    where: {
      userId,
      status: { notIn: ["CONFIRMED", "REJECTED"] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      selections: {
        include: {
          course: true,
          session: true,
          plan: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}
