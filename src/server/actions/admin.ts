"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { hash } from "bcryptjs";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import {
  EnrollmentStatus,
  PaymentStatus,
  Prisma,
  CourseSelectionStatus,
} from "@prisma/client";
import { ACTIVE_ENROLLMENT_STATUS } from "@/lib/enrollment-status";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    throw new Error("Acesso negado");
  }
  return session.user;
}

function refresh() {
  revalidatePath("/admin");
  revalidatePath("/painel");
  revalidatePath("/pre-matricula");
}

export async function updateEnrollmentStatus(values: {
  id: string;
  status: EnrollmentStatus;
}) {
  await requireAdmin();
  await prisma.preEnrollment.update({
    where: { id: values.id },
    data: { status: values.status },
  });
  refresh();
  return { success: true };
}

async function handleRedacaoBonus(
  tx: Prisma.TransactionClient,
  enrollmentId: string
) {
  const enrollment = await tx.preEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      selections: {
        include: { course: true },
      },
    },
  });

  if (!enrollment || enrollment.promoBonusGranted) {
    return;
  }

  const selectedRedacao = enrollment.selections.some(
    (item) => item.course.modality === "REDACAO"
  );

  if (!selectedRedacao) {
    return;
  }

  const redacaoCourse = await tx.course.findUnique({
    where: { id: "redacao" },
  });

  if (!redacaoCourse || !redacaoCourse.bonusLimit) {
    return;
  }

  if (redacaoCourse.bonusAwarded >= redacaoCourse.bonusLimit) {
    return;
  }

  await tx.course.update({
    where: { id: "redacao" },
    data: { bonusAwarded: { increment: 1 } },
  });

  await tx.preEnrollment.update({
    where: { id: enrollmentId },
    data: { promoBonusGranted: true },
  });
}

export async function updatePaymentStatus(values: {
  id: string;
  status: PaymentStatus;
}) {
  await requireAdmin();

  await prisma.$transaction(async (tx) => {
    await tx.preEnrollment.update({
      where: { id: values.id },
      data: { paymentStatus: values.status },
    });

    if (values.status === "CONFIRMED") {
      await handleRedacaoBonus(tx, values.id);
    }
  });

  refresh();
  return { success: true };
}

export async function updateSessionDetails(values: {
  sessionId: string;
  capacity: number;
  weekday: string;
  startTime: string;
  endTime: string;
  level: string;
}) {
  await requireAdmin();

  const capacity = Math.max(1, values.capacity);
  const weekday = values.weekday.trim();
  const startTime = values.startTime.trim();
  const endTime = values.endTime.trim();
  const level = values.level.trim();

  if (!weekday || !startTime || !endTime || !level) {
    throw new Error("Dia, horarios e nivel sao obrigatorios.");
  }

  await prisma.courseSession.update({
    where: { id: values.sessionId },
    data: {
      capacity,
      weekday,
      startTime,
      endTime,
      level,
    },
  });
  refresh();
  return { success: true };
}

export async function setSessionWaitlistOnly(sessionId: string) {
  await requireAdmin();

  await prisma.$transaction(async (tx) => {
    const reservedCount = await tx.preEnrollmentCourseSelection.count({
      where: {
        sessionId,
        status: "RESERVED",
        preEnrollment: {
          status: { in: ACTIVE_ENROLLMENT_STATUS },
        },
      },
    });

    await tx.courseSession.update({
      where: { id: sessionId },
      data: { capacity: reservedCount },
    });

    await recomputeWaitlist(tx, sessionId);
  });

  refresh();
  return { success: true };
}

async function recomputeWaitlist(
  tx: Prisma.TransactionClient,
  sessionId: string
) {
  const session = await tx.courseSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) return;

  const confirmedSelections = await tx.preEnrollmentCourseSelection.findMany({
    where: {
      sessionId,
      preEnrollment: {
        status: {
          in: ACTIVE_ENROLLMENT_STATUS,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  let reserved = 0;
  let waitlistPosition = 1;

  for (const selection of confirmedSelections) {
    if (reserved < session.capacity) {
      await tx.preEnrollmentCourseSelection.update({
        where: { id: selection.id },
        data: { status: "RESERVED", waitlistPosition: null },
      });
      reserved += 1;
    } else {
      await tx.preEnrollmentCourseSelection.update({
        where: { id: selection.id },
        data: { status: "WAITLIST", waitlistPosition },
      });
      waitlistPosition += 1;
    }
  }
}

export async function moveSelection(values: {
  selectionId: string;
  sessionId: string;
}) {
  await requireAdmin();

  await prisma.$transaction(async (tx) => {
    const selection = await tx.preEnrollmentCourseSelection.findUnique({
      where: { id: values.selectionId },
    });
    const newSession = await tx.courseSession.findUnique({
      where: { id: values.sessionId },
    });

    if (!selection || !newSession) {
      throw new Error("Dados inválidos");
    }

    await tx.preEnrollmentCourseSelection.update({
      where: { id: values.selectionId },
      data: {
        sessionId: newSession.id,
      },
    });

    await recomputeWaitlist(tx, newSession.id);
  });

  refresh();
  return { success: true };
}

export async function forceWaitlist(values: {
  selectionId: string;
  status: CourseSelectionStatus;
}) {
  await requireAdmin();
  await prisma.preEnrollmentCourseSelection.update({
    where: { id: values.selectionId },
    data: { status: values.status },
  });
  refresh();
  return { success: true };
}

export async function setRedacaoBonusAwarded(value: number) {
  await requireAdmin();
  const safeValue = Math.max(0, value);
  await prisma.course.update({
    where: { id: "redacao" },
    data: { bonusAwarded: safeValue },
  });
  refresh();
  return { success: true };
}

export async function updateUserAccount(values: {
  userId: string;
  name: string;
  email: string;
  password?: string;
}) {
  await requireAdmin();
  const data: Prisma.UserUpdateInput = {
    name: values.name,
    email: values.email.toLowerCase(),
  };
  if (values.password) {
    data.password = await hash(values.password, 10);
  }

  try {
    await prisma.user.update({
      where: { id: values.userId },
      data,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { success: false, error: "Email ja esta sendo usado." };
    }
      return { success: false, error: "Não foi possível atualizar o cadastro." };
  }

  refresh();
  return { success: true };
}
