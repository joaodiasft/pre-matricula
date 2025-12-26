import { prisma } from "@/lib/prisma";
import { ACTIVE_ENROLLMENT_STATUS } from "@/lib/enrollment-status";
import { CourseWithStats } from "@/types/enrollment";

export async function fetchCoursesWithStats(): Promise<CourseWithStats[]> {
  const courses = await prisma.course.findMany({
    orderBy: { title: "asc" },
    include: {
      sessions: {
        orderBy: { startTime: "asc" },
      },
      plans: {
        where: { isActive: true },
        orderBy: { months: "asc" },
      },
    },
  });

  const group = await prisma.preEnrollmentCourseSelection.groupBy({
    by: ["sessionId", "status"],
    _count: { _all: true },
    where: {
      preEnrollment: {
        status: { in: ACTIVE_ENROLLMENT_STATUS },
      },
    },
  });

  const reservedMap = new Map<string, { reserved: number; waitlist: number }>();
  group.forEach((item) => {
    const entry = reservedMap.get(item.sessionId) ?? { reserved: 0, waitlist: 0 };
    if (item.status === "RESERVED") {
      entry.reserved += item._count._all;
    } else {
      entry.waitlist += item._count._all;
    }
    reservedMap.set(item.sessionId, entry);
  });

  return courses.map((course) => ({
    ...course,
    sessions: course.sessions.map((session) => {
      const counters = reservedMap.get(session.id) ?? {
        reserved: 0,
        waitlist: 0,
      };
      const available = Math.max(session.capacity - counters.reserved, 0);
      return {
        ...session,
        available,
        reserved: counters.reserved,
        waitlist: counters.waitlist,
      };
    }),
  }));
}
