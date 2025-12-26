"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { addDays, isAfter, isBefore, startOfDay } from "date-fns";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import { MIN_CONFIRMATION_DATE } from "@/lib/constants";
import { ACTIVE_ENROLLMENT_STATUS } from "@/lib/enrollment-status";
import { computeRegistrationFee } from "@/lib/registration";
import {
  basicInfoSchema,
  confirmationScheduleSchema,
  courseSelectionSchema,
  paymentChoiceSchema,
  planSelectionSchema,
} from "@/lib/validators/enrollment";
import { CourseSelectionStatus, Prisma } from "@prisma/client";
import { ensurePreEnrollment } from "@/server/data/pre-enrollment";

async function getSessionUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Usuário não autenticado.");
  }

  return session.user;
}

async function recalculateTotals(preEnrollmentId: string) {
  const selections = await prisma.preEnrollmentCourseSelection.findMany({
    where: { preEnrollmentId },
    include: {
      plan: true,
    },
  });

  const planTotal = selections.reduce((acc, item) => {
    if (!item.plan) return acc;
    return acc + Number(item.plan.price);
  }, 0);

  const { value: registrationFee, hasDiscount } = computeRegistrationFee();

  await prisma.preEnrollment.update({
    where: { id: preEnrollmentId },
    data: {
      totalAmount: planTotal + registrationFee,
      registrationFee,
      registrationFeeDiscount: hasDiscount,
    },
  });
}

function invalidatePaths() {
  revalidatePath("/pre-matricula");
  revalidatePath("/painel");
  revalidatePath("/admin");
}

export async function saveBasicInfo(values: unknown) {
  const user = await getSessionUser();
  const parsed = basicInfoSchema.safeParse(values);

  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }

  const preEnrollment = await ensurePreEnrollment(user.id);
  const haveEnem = parsed.data.hasEnem && parsed.data.enemScore !== null;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        name: parsed.data.fullName,
      },
    });

    await tx.studentProfile.upsert({
      where: { userId: user.id },
      update: {
        age: parsed.data.age,
        school: parsed.data.school,
        grade: parsed.data.grade,
        objective: parsed.data.objective,
        level: parsed.data.level,
        hasEnem: parsed.data.hasEnem,
        enemScore: haveEnem ? parsed.data.enemScore ?? undefined : null,
      },
      create: {
        userId: user.id,
        age: parsed.data.age,
        school: parsed.data.school,
        grade: parsed.data.grade,
        objective: parsed.data.objective,
        level: parsed.data.level,
        hasEnem: parsed.data.hasEnem,
        enemScore: haveEnem ? parsed.data.enemScore ?? undefined : null,
      },
    });

    await tx.preEnrollment.update({
      where: { id: preEnrollment.id },
      data: {
        age: parsed.data.age,
        school: parsed.data.school,
        grade: parsed.data.grade,
        objective: parsed.data.objective,
        level: parsed.data.level,
        hasEnem: parsed.data.hasEnem,
        enemScore: haveEnem ? parsed.data.enemScore ?? undefined : null,
        studyGoal: parsed.data.studyGoal ?? undefined,
      },
    });
  });

  invalidatePaths();
  return { success: true };
}

export async function selectCourseSession(values: unknown) {
  const user = await getSessionUser();
  const parsed = courseSelectionSchema.safeParse(values);

  if (!parsed.success) {
    return { success: false, error: "Seleção inválida" };
  }

  const preEnrollment = await ensurePreEnrollment(user.id);
  const session = await prisma.courseSession.findUnique({
    where: { id: parsed.data.sessionId },
    include: { course: true },
  });

  if (!session) {
    return { success: false, error: "Turma não encontrada" };
  }

  const existing = await prisma.preEnrollmentCourseSelection.findFirst({
    where: { preEnrollmentId: preEnrollment.id, courseId: session.courseId },
  });

  await prisma.$transaction(async (tx) => {
    const reservedCount = await tx.preEnrollmentCourseSelection.count({
      where: {
        sessionId: session.id,
        status: "RESERVED",
        preEnrollment: {
          status: {
            in: ACTIVE_ENROLLMENT_STATUS,
          },
        },
        NOT: existing ? { id: existing.id } : undefined,
      },
    });

    const shouldWaitlist = reservedCount >= session.capacity;
    const waitlistCount = shouldWaitlist
      ? await tx.preEnrollmentCourseSelection.count({
          where: {
            sessionId: session.id,
            status: "WAITLIST",
          },
        })
      : 0;

    const data = {
      preEnrollmentId: preEnrollment.id,
      courseId: session.courseId,
      sessionId: session.id,
      planId: null as string | null,
      status: shouldWaitlist ? "WAITLIST" : ("RESERVED" as CourseSelectionStatus),
      waitlistPosition: shouldWaitlist ? waitlistCount + 1 : null,
    };

    if (existing) {
      await tx.preEnrollmentCourseSelection.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await tx.preEnrollmentCourseSelection.create({
        data,
      });
    }

    const hasWaitlist = await tx.preEnrollmentCourseSelection.count({
      where: { preEnrollmentId: preEnrollment.id, status: "WAITLIST" },
    });

    await tx.preEnrollment.update({
      where: { id: preEnrollment.id },
      data: { hasWaitlist: hasWaitlist > 0 },
    });
  });

  await recalculateTotals(preEnrollment.id);
  invalidatePaths();
  return { success: true };
}

export async function removeSelection(selectionId: string) {
  const user = await getSessionUser();
  const preEnrollment = await ensurePreEnrollment(user.id);

  const selection = await prisma.preEnrollmentCourseSelection.findUnique({
    where: { id: selectionId },
  });

  if (!selection || selection.preEnrollmentId !== preEnrollment.id) {
    return { success: false, error: "Seleção não encontrada." };
  }

  await prisma.preEnrollmentCourseSelection.delete({
    where: { id: selectionId },
  });

  const hasWaitlist = await prisma.preEnrollmentCourseSelection.count({
    where: { preEnrollmentId: preEnrollment.id, status: "WAITLIST" },
  });

  await prisma.preEnrollment.update({
    where: { id: preEnrollment.id },
    data: { hasWaitlist: hasWaitlist > 0 },
  });

  await recalculateTotals(preEnrollment.id);
  invalidatePaths();
  return { success: true };
}

export async function attachPlan(values: unknown) {
  const user = await getSessionUser();
  const parsed = planSelectionSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: "Plano inválido" };
  }

  const preEnrollment = await ensurePreEnrollment(user.id);
  const selection = await prisma.preEnrollmentCourseSelection.findUnique({
    where: { id: parsed.data.selectionId },
    include: { preEnrollment: true },
  });

  if (!selection || selection.preEnrollmentId !== preEnrollment.id) {
    return { success: false, error: "Seleção não encontrada" };
  }

  const plan = await prisma.paymentPlan.findUnique({
    where: { id: parsed.data.planId },
  });

  if (!plan || plan.courseId !== selection.courseId) {
    return { success: false, error: "Plano incompatível" };
  }

  await prisma.preEnrollmentCourseSelection.update({
    where: { id: parsed.data.selectionId },
    data: {
      planId: parsed.data.planId,
    },
  });

  await recalculateTotals(preEnrollment.id);
  invalidatePaths();
  return { success: true };
}

export async function selectPaymentMethod(values: unknown) {
  const user = await getSessionUser();
  const parsed = paymentChoiceSchema.safeParse(values);

  if (!parsed.success) {
    return { success: false, error: "Forma de pagamento inválida" };
  }

  const preEnrollment = await ensurePreEnrollment(user.id);
  await prisma.preEnrollment.update({
    where: { id: preEnrollment.id },
    data: {
      paymentMethod: parsed.data.paymentMethod,
    },
  });

  invalidatePaths();
  return { success: true };
}

export async function submitPreEnrollment() {
  const user = await getSessionUser();
  const preEnrollment = await ensurePreEnrollment(user.id);

  const selections = await prisma.preEnrollmentCourseSelection.findMany({
    where: { preEnrollmentId: preEnrollment.id },
  });

  if (!preEnrollment.age || !preEnrollment.school || !preEnrollment.objective) {
    return { success: false, error: "Preencha seus dados básicos primeiro." };
  }

  if (!selections.length) {
    return { success: false, error: "Escolha ao menos uma turma." };
  }

  const missingPlan = selections.some((item) => !item.planId);
  if (missingPlan) {
    return { success: false, error: "Escolha um plano para cada modalidade." };
  }

  if (!preEnrollment.paymentMethod) {
    return { success: false, error: "Selecione a forma de pagamento." };
  }

  await prisma.preEnrollment.update({
    where: { id: preEnrollment.id },
    data: { status: "SUBMITTED" },
  });

  invalidatePaths();
  return { success: true };
}

async function generateToken(tx: Prisma.TransactionClient) {
  const counter = await tx.tokenCounter.upsert({
    where: { id: 1 },
    update: { lastNumber: { increment: 1 } },
    create: { id: 1, lastNumber: 1 },
  });

  const tokenNumber = counter.lastNumber.toString().padStart(5, "0");
  return {
    token: `R${tokenNumber}`,
    sequence: counter.lastNumber,
  };
}

export async function scheduleConfirmation(values: unknown) {
  const user = await getSessionUser();
  const parsed = confirmationScheduleSchema.safeParse(values);

  if (!parsed.success) {
    return { success: false, error: "Data inválida." };
  }

  const targetDay = startOfDay(parsed.data.date);
  if (isBefore(targetDay, MIN_CONFIRMATION_DATE)) {
    return {
      success: false,
      error: "Escolha uma data a partir de 05/01/2026.",
    };
  }

  const maxRange = startOfDay(addDays(new Date(), 365));
  if (isAfter(targetDay, maxRange)) {
    return { success: false, error: "Escolha uma data dentro dos próximos 12 meses." };
  }

  const preEnrollment = await ensurePreEnrollment(user.id);

  if (preEnrollment.status === "DRAFT") {
    return {
      success: false,
      error: "Envie sua pré-matrícula antes de escolher a confirmação presencial.",
    };
  }

  await prisma.$transaction(async (tx) => {
    let token = preEnrollment.token;
    let sequence = preEnrollment.tokenSequence ?? undefined;

    if (!token) {
      const nextToken = await generateToken(tx);
      token = nextToken.token;
      sequence = nextToken.sequence;
    }

    await tx.preEnrollment.update({
      where: { id: preEnrollment.id },
      data: {
        confirmationDay: targetDay,
        status:
          preEnrollment.status === "SUBMITTED"
            ? "WAITING_PAYMENT"
            : preEnrollment.status,
        token,
        tokenSequence: sequence,
        confirmationDate: new Date(),
      },
    });
  });

  invalidatePaths();
  return { success: true };
}
