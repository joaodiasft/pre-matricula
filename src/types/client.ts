import {
  CourseSelectionStatus,
  EnrollmentStatus,
  Level,
  Objective,
  PaymentMethod,
  PaymentStatus,
} from "@prisma/client";

export type ClientCourse = {
  id: string;
  title: string;
  modality: string;
  description: string;
  materials: string;
  audience: string;
  bonusLimit: number | null;
  bonusAwarded: number;
  sessions: {
    id: string;
    code: string;
    weekday: string;
    startTime: string;
    endTime: string;
    level: string;
    capacity: number;
    available: number;
    reserved: number;
    waitlist: number;
  }[];
  plans: {
    id: string;
    label: string;
    months: number;
    price: number;
    description: string | null;
  }[];
};

export type ClientEnrollment = {
  id: string;
  status: EnrollmentStatus;
  paymentMethod: PaymentMethod | null;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  registrationFee: number;
  registrationFeeDiscount: boolean;
  objective: Objective | null;
  level: Level | null;
  age: number | null;
  school: string | null;
  grade: string | null;
  studyGoal: string | null;
  hasEnem: boolean | null;
  enemScore: number | null;
  confirmationDay: string | null;
  token: string | null;
  selections: {
    id: string;
    courseId: string;
    sessionId: string;
    planId: string | null;
    status: CourseSelectionStatus;
    waitlistPosition: number | null;
    course: {
      id: string;
      title: string;
      modality: string;
    };
    session: {
      id: string;
      code: string;
      weekday: string;
      startTime: string;
      endTime: string;
      level: string;
    };
    plan: {
      id: string;
      label: string;
      price: number;
      months: number;
    } | null;
  }[];
};
