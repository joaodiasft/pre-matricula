
import bcrypt from "bcryptjs";
import { Prisma, PrismaClient } from "@prisma/client";
import { COURSE_DEFINITIONS } from "../src/data/course-definitions";

const prisma = new PrismaClient();

type CourseLookup = Record<
  string,
  {
    id: string;
    sessions: Record<string, string>;
    plans: Record<string, string>;
  }
>;

async function resetData() {
  await prisma.preEnrollmentCourseSelection.deleteMany();
  await prisma.preEnrollment.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tokenCounter.deleteMany();
}

async function seedCourses() {
  const courseMap: CourseLookup = {};

  for (const course of COURSE_DEFINITIONS) {
    const persisted = await prisma.course.upsert({
      where: { id: course.id },
      update: {
        title: course.title,
        modality: course.modality,
        description: course.description,
        materials: course.materials,
        audience: course.audience,
        bonusLimit: course.bonusLimit ?? null,
        isActive: true,
      },
      create: {
        id: course.id,
        title: course.title,
        modality: course.modality,
        description: course.description,
        materials: course.materials,
        audience: course.audience,
        bonusLimit: course.bonusLimit ?? null,
      },
    });

    const sessionMap: Record<string, string> = {};
    for (const session of course.sessions) {
      const savedSession = await prisma.courseSession.upsert({
        where: { code: session.code },
        update: {
          weekday: session.weekday,
          startTime: session.start,
          endTime: session.end,
          level: session.level,
          capacity: session.capacity,
          courseId: persisted.id,
        },
        create: {
          courseId: persisted.id,
          code: session.code,
          weekday: session.weekday,
          startTime: session.start,
          endTime: session.end,
          level: session.level,
          capacity: session.capacity,
        },
      });
      sessionMap[session.code] = savedSession.id;
    }

    const planMap: Record<string, string> = {};
    for (const plan of course.plans) {
      const planId = `${course.id}-${plan.label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")}`;
      const savedPlan = await prisma.paymentPlan.upsert({
        where: { id: planId },
        update: {
          label: plan.label,
          months: plan.months,
          price: new Prisma.Decimal(plan.price.toFixed(2)),
          discountPct: plan.discountPct
            ? new Prisma.Decimal(plan.discountPct)
            : null,
          description: plan.description,
          isActive: true,
        },
        create: {
          id: planId,
          courseId: persisted.id,
          label: plan.label,
          months: plan.months,
          price: new Prisma.Decimal(plan.price.toFixed(2)),
          discountPct: plan.discountPct
            ? new Prisma.Decimal(plan.discountPct)
            : null,
          description: plan.description,
        },
      });
      planMap[plan.label] = savedPlan.id;
    }

    courseMap[course.id] = {
      id: persisted.id,
      sessions: sessionMap,
      plans: planMap,
    };
  }

  return courseMap;
}

async function seedUsers() {
  const demoUsers = [
    {
      name: "Secretaria Redas",
      email: "admin@redas.com",
      password: "redasadmin123",
      role: "ADMIN" as const,
    },
    {
      name: "Aluno Experiencia",
      email: "aluno@redas.com",
      password: "redasaluno123",
      role: "STUDENT" as const,
    },
  ];

  for (const user of demoUsers) {
    const hashed = await bcrypt.hash(user.password, 10);
    await prisma.user.create({
      data: {
        name: user.name,
        email: user.email,
        password: hashed,
        role: user.role,
      },
    });
  }
}

async function main() {
  await resetData();
  await seedCourses();
  await seedUsers();

  await prisma.tokenCounter.upsert({
    where: { id: 1 },
    update: { lastNumber: 0 },
    create: { id: 1, lastNumber: 0 },
  });

  await prisma.course.updateMany({ data: { bonusAwarded: 0 } });

  console.log("Seed executed with success.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
