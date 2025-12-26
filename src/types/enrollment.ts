import {
  Course,
  CourseSession,
  PaymentPlan,
  PreEnrollment,
  PreEnrollmentCourseSelection,
} from "@prisma/client";

export type CourseWithStats = Course & {
  sessions: Array<
    CourseSession & {
      available: number;
      reserved: number;
      waitlist: number;
    }
  >;
  plans: PaymentPlan[];
};

export type EnrollmentSelection = PreEnrollmentCourseSelection & {
  course: Course;
  session: CourseSession;
  plan: PaymentPlan | null;
};

export type EnrollmentWithRelations = PreEnrollment & {
  selections: EnrollmentSelection[];
};
