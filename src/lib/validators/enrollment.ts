import { z } from "zod";
import {
  Level,
  Objective,
  PaymentMethod,
  CourseModality,
} from "@prisma/client";

export const basicInfoSchema = z.object({
  fullName: z.string().min(3, "Informe o nome completo"),
  age: z.number().min(10).max(80),
  school: z.string().min(2, "Informe onde estuda"),
  grade: z.string().min(2, "Informe a série/ano"),
  objective: z.nativeEnum(Objective),
  level: z.nativeEnum(Level),
  hasEnem: z.boolean(),
  enemScore: z.number().min(0).max(1000).nullable(),
  studyGoal: z.string().min(3).max(200).nullable(),
});

export const courseSelectionSchema = z.object({
  courseId: z.string(),
  sessionId: z.string(),
});

export const planSelectionSchema = z.object({
  selectionId: z.string(),
  planId: z.string(),
});

export const paymentChoiceSchema = z.object({
  paymentMethod: z.nativeEnum(PaymentMethod),
});

export const confirmationScheduleSchema = z.object({
  date: z.coerce.date(),
});

export const modalityLimitSchema = z.object({
  modality: z.nativeEnum(CourseModality),
});
