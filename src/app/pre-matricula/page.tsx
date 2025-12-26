export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { CalendarCheck, ShieldCheck } from "lucide-react";
import { authOptions } from "@/lib/auth/options";
import { fetchCoursesWithStats } from "@/lib/queries/courses";
import {
  ensurePreEnrollment,
  fetchEnrollmentWithRelations,
} from "@/server/data/pre-enrollment";
import { prisma } from "@/lib/prisma";
import { registrationDiscountActive } from "@/lib/registration";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PreEnrollmentFlow } from "@/components/pre-enrollment/pre-enrollment-flow";
import { AuthTabs } from "@/components/pre-enrollment/pre-enrollment-auth";
import { CONFIRMATION_WHATSAPP, REGISTRATION_FEE } from "@/lib/constants";
import { currencyFormatter } from "@/lib/utils";
import { CourseWithStats, EnrollmentWithRelations } from "@/types/enrollment";
import { ClientCourse, ClientEnrollment } from "@/types/client";

function toClientCourse(course: CourseWithStats): ClientCourse {
  return {
    id: course.id,
    title: course.title,
    modality: course.modality,
    description: course.description,
    materials: course.materials,
    audience: course.audience,
    bonusLimit: course.bonusLimit,
    bonusAwarded: course.bonusAwarded,
    sessions: course.sessions.map((session) => ({
      id: session.id,
      code: session.code,
      weekday: session.weekday,
      startTime: session.startTime,
      endTime: session.endTime,
      level: session.level,
      capacity: session.capacity,
      available: session.available,
      reserved: session.reserved,
      waitlist: session.waitlist,
    })),
    plans: course.plans.map((plan) => ({
      id: plan.id,
      label: plan.label,
      months: plan.months,
      price: Number(plan.price),
      description: plan.description,
    })),
  };
}

function toClientEnrollment(
  enrollment: EnrollmentWithRelations
): ClientEnrollment {
  return {
    ...enrollment,
    confirmationDay: enrollment.confirmationDay
      ? enrollment.confirmationDay.toISOString()
      : null,
    totalAmount: Number(enrollment.totalAmount),
    registrationFee: Number(enrollment.registrationFee),
    selections: enrollment.selections.map((selection) => ({
      ...selection,
      session: {
        id: selection.session.id,
        code: selection.session.code,
        weekday: selection.session.weekday,
        startTime: selection.session.startTime,
        endTime: selection.session.endTime,
        level: selection.session.level,
      },
      course: {
        id: selection.course.id,
        title: selection.course.title,
        modality: selection.course.modality,
      },
      plan: selection.plan
        ? {
            id: selection.plan.id,
            label: selection.plan.label,
            months: selection.plan.months,
            price: Number(selection.plan.price),
          }
        : null,
    })),
  };
}

export default async function PreMatriculaPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role === "ADMIN") {
    redirect("/admin");
  }

  const courses = await fetchCoursesWithStats();

  const plainCourses: ClientCourse[] = courses.map(toClientCourse);
  const discountActive = registrationDiscountActive();





  if (!session) {
    return (
      <div className="mx-auto max-w-5xl space-y-8 px-6 py-12">
        <div className="grid gap-6">
          <div className="rounded-[28px] border border-gray-100 bg-white/80 p-1 shadow-xl backdrop-blur">
            <div className="rounded-[24px] border border-dashed border-rose-100 bg-white p-2">
              <AuthTabs />
            </div>
          </div>
        </div>

        <Card className="rounded-3xl border border-gray-100">
          <CardContent className="space-y-4 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-500">
              Atendimento
            </p>
            <h2 className="text-2xl font-semibold text-gray-900">
              Precisa de ajuda com o preenchimento?
            </h2>
            <p className="text-sm text-gray-600">
              A equipe acompanha a fase 1 pelo mesmo painel. Se pintar dúvida sobre um campo, envie uma mensagem e continuamos juntos.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-full">
                <Link href={`https://wa.me/5562981899570`} target="_blank">
                  WhatsApp da secretaria
                </Link>
              </Button>
              <Button variant="outline" asChild className="rounded-full">
                <Link href="/painel">Ver como fica depois do login</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [profile, enrollment] = await Promise.all([
    prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
    }),
    (async () => {
      const existing = await fetchEnrollmentWithRelations(session.user.id);
      if (existing) return existing;
      await ensurePreEnrollment(session.user.id);
      return fetchEnrollmentWithRelations(session.user.id);
    })(),
  ]);

  if (!enrollment) {
    notFound();
  }

  const clientEnrollment = toClientEnrollment(enrollment);

  return (
    <div id="fluxo" className="mx-auto max-w-6xl space-y-10 px-6 py-12">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary">Pré-matrícula guiada</Badge>
          <Badge variant="outline">Token atual: {clientEnrollment.token ?? "Aguardando"}</Badge>
        </div>
        <h1 className="text-4xl font-semibold text-gray-900">
          Organize todas as etapas e chegue no presencial apenas para assinar.
        </h1>
        <p className="max-w-3xl text-lg text-gray-600">
          Salve seus dados, defina cursos e planos, confirme pagamentos e escolha
          o dia da assinatura presencial. Leve somente documento, comprovante e o
          token gerado automaticamente.
        </p>
        <div className="flex flex-wrap gap-4">
          <Card className="flex-1 rounded-3xl border border-gray-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-gray-700">
                Taxa de matrícula
              </CardTitle>
              <CardDescription>
                {discountActive
                  ? "50% de desconto válido até o dia 10 deste mês"
                  : "Valor integral aplicável em novas pré-matrículas"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-gray-900">
                {discountActive
                  ? currencyFormatter.format(REGISTRATION_FEE / 2)
                  : currencyFormatter.format(REGISTRATION_FEE)}
              </p>
            </CardContent>
          </Card>
          <Card className="flex-1 rounded-3xl border border-gray-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base text-gray-700">
                  Secretaria online
                </CardTitle>
                <CardDescription>
                  Fale com a equipe usando seu token
                </CardDescription>
              </div>
              <ShieldCheck className="h-8 w-8 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 text-lg font-medium text-gray-900">
                <CalendarCheck className="h-5 w-5 text-rose-500" />
                <Link
                  href={`https://wa.me/5562981899570`}
                  target="_blank"
                  className="underline decoration-dotted"
                >
                  {CONFIRMATION_WHATSAPP}
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </header>

      <PreEnrollmentFlow
        courses={plainCourses}
        enrollment={clientEnrollment}
        profile={profile}
        sessionUser={session.user}
        discountActive={discountActive}
      />
    </div>
  );
}
