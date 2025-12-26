import { EnrollmentStatus } from "@prisma/client";

export const ACTIVE_ENROLLMENT_STATUS: EnrollmentStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "WAITING_PAYMENT",
  "CONFIRMED",
];
