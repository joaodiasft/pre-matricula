import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { prisma } from "@/lib/prisma";
import { fetchCoursesWithStats } from "@/lib/queries/courses";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AdminTable, AdminEnrollment } from "@/components/admin/admin-table";
import { CapacityManager } from "@/components/admin/capacity-manager";
import { PromoControl } from "@/components/admin/promo-control";
import { EnrollmentStatusCopy, PaymentMethodCopy, PaymentStatusCopy } from "@/lib/enrollment";
import { currencyFormatter, fullDateFormatter } from "@/lib/utils";
import { CourseModality, Objective } from "@prisma/client";
import { SignOutButton } from "@/components/sign-out-button";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    redirect("/pre-matricula");
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    courses,
    enrollments,
    statusCounts,
    todayCount,
    weekCount,
    monthCount,
    planGroups,
    waitlistRows,
    paymentGroups,
    confirmationAppointments,
  ] = await Promise.all([
    fetchCoursesWithStats(),
    prisma.preEnrollment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: true,
        selections: {
          include: {
            course: true,
            session: true,
            plan: true,
          },
        },
      },
    }),
    prisma.preEnrollment.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.preEnrollment.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.preEnrollment.count({ where: { createdAt: { gte: startOfWeek } } }),
    prisma.preEnrollment.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.preEnrollmentCourseSelection.groupBy({
      by: ["planId"],
      _count: { _all: true },
    }),
    prisma.preEnrollmentCourseSelection.findMany({
      where: { status: "WAITLIST" },
      orderBy: { createdAt: "asc" },
      include: {
        session: true,
        course: true,
        preEnrollment: { include: { user: true } },
      },
    }),
    prisma.preEnrollment.groupBy({
      by: ["paymentStatus"],
      _count: { _all: true },
      _sum: { totalAmount: true },
    }),
    prisma.preEnrollment.findMany({
      where: {
        confirmationDay: { not: null, gte: new Date() },
      },
      orderBy: { confirmationDay: "asc" },
      take: 6,
      include: {
        user: true,
      },
    }),
  ]);

  const planIds = planGroups
    .map((group) => group.planId)
    .filter((value): value is string => Boolean(value));

  const planDetails = planIds.length
    ? await prisma.paymentPlan.findMany({
        where: { id: { in: planIds } },
        include: { course: true },
      })
    : [];

  const planMap = new Map(planDetails.map((plan) => [plan.id, plan]));

  const redacao = courses.find((course) => course.modality === "REDACAO");
  const bonusLimit = redacao?.bonusLimit;
  const bonusAwarded = redacao?.bonusAwarded ?? 0;
  const hasBonusLimit = typeof bonusLimit === "number";
  const safeBonusLimit = bonusLimit ?? 0;
  const bonusRemaining = hasBonusLimit
    ? Math.max(safeBonusLimit - bonusAwarded, 0)
    : null;

  const planTotal = planGroups.reduce((sum, group) => sum + group._count._all, 0);
  const planStats = planGroups
    .map((group) => {
      if (!group.planId) {
        return {
          id: "pending",
          label: "Plano pendente",
          count: group._count._all,
          percentage: planTotal ? Math.round((group._count._all / planTotal) * 100) : 0,
        };
      }
      const plan = planMap.get(group.planId);
      const label = plan
        ? `${plan.course.title} - ${plan.label}`
        : `Plano ${group.planId}`;
      return {
        id: group.planId,
        label,
        count: group._count._all,
        percentage: planTotal ? Math.round((group._count._all / planTotal) * 100) : 0,
      };
    })
    .sort((a, b) => b.count - a.count);

  const waitlistEntries = waitlistRows.map((row) => ({
    id: row.id,
    student: row.preEnrollment.user.name,
    token: row.preEnrollment.token ?? "Aguardando",
    course: row.course.title,
    session: row.session.code,
    weekday: row.session.weekday,
    createdAt: row.createdAt.toISOString(),
    position: row.waitlistPosition,
  }));
  const tokenEntries = enrollments
    .filter((item) => Boolean(item.token))
    .map((item) => ({
      id: item.id,
      token: item.token as string,
      student: item.user.name ?? "Sem nome",
      email: item.user.email ?? "Sem email",
      objective: item.objective,
      status: item.status,
      age: item.age,
      grade: item.grade,
      school: item.school,
      level: item.level,
      hasEnem: item.hasEnem,
      enemScore: item.enemScore,
      studyGoal: item.studyGoal,
      paymentMethod: item.paymentMethod,
      paymentStatus: item.paymentStatus,
      totalAmount: Number(item.totalAmount),
      confirmationDay: item.confirmationDay
        ? item.confirmationDay.toISOString()
        : null,
      createdAt: item.createdAt.toISOString(),
      selections: item.selections.map((selection) => ({
        id: selection.id,
        course: selection.course.title,
        session: selection.session.code,
        weekday: selection.session.weekday,
        startTime: selection.session.startTime,
        endTime: selection.session.endTime,
        plan: selection.plan?.label ?? "Plano pendente",
      })),
    }))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const adminEnrollments: AdminEnrollment[] = enrollments.map((item) => ({
    id: item.id,
    userId: item.user.id,
    name: item.user.name,
    email: item.user.email,
    objective: item.objective,
    grade: item.grade,
    age: item.age,
    status: item.status,
    paymentStatus: item.paymentStatus,
    paymentMethod: item.paymentMethod,
    token: item.token,
    totalAmount: Number(item.totalAmount),
    createdAt: item.createdAt.toISOString(),
    selections: item.selections.map((selection) => ({
      id: selection.id,
      course: selection.course.title,
      modality: selection.course.modality,
      session: `${selection.session.code} - ${selection.session.weekday}`,
      planLabel: selection.plan?.label ?? "Plano pendente",
      status: selection.status,
    })),
  }));

  const capacitySessions = courses.flatMap((course) =>
    course.sessions.map((session) => ({
      id: session.id,
      code: session.code,
      course: course.title,
      modality: course.modality,
      weekday: session.weekday,
      time: `${session.startTime} ate ${session.endTime}`,
      startTime: session.startTime,
      endTime: session.endTime,
      level: session.level,
      capacity: session.capacity,
      reserved: session.reserved,
      available: session.available,
      waitlist: session.waitlist,
    }))
  );

  const objectiveLabels: Record<Objective, string> = {
    ENEM: "ENEM",
    UFG_VESTIBULAR: "UFG / Vestibular",
    REFORCO: "Reforco",
    CONCURSOS: "Concursos",
  };

  const modalityLabels: Record<CourseModality, string> = {
    REDACAO: "Redacao",
    EXATAS: "Exatas",
    MATEMATICA: "Matematica",
    GRAMATICA: "Gramatica",
  };

  const paymentStatusLabels: Record<string, string> = {
    PENDING: "Pagamentos pendentes",
    CONFIRMED: "Pagamentos confirmados",
  };

  const selectionStatusCopy = {
    RESERVED: "Reservado",
    WAITLIST: "Lista de espera",
  } as const;

  const paymentStats = (["PENDING", "CONFIRMED"] as const).map((status) => {
    const group = paymentGroups.find((item) => item.paymentStatus === status);
    return {
      status,
      label: paymentStatusLabels[status],
      count: group?._count._all ?? 0,
      total: Number(group?._sum.totalAmount ?? 0),
    };
  });

  const upcomingConfirmations = confirmationAppointments.map((appointment) => ({
    id: appointment.id,
    student: appointment.user.name,
    email: appointment.user.email,
    date: appointment.confirmationDay
      ? new Date(appointment.confirmationDay)
      : null,
    token: appointment.token ?? "Aguardando",
    status: appointment.status,
  }));

  const modalityStats = (["REDACAO", "EXATAS", "MATEMATICA", "GRAMATICA"] as const).map(
    (modality) => {
      const related = courses.filter((course) => course.modality === modality);
      const capacity = related.reduce(
        (sum, course) =>
          sum + course.sessions.reduce((acc, session) => acc + session.capacity, 0),
        0
      );
      const reserved = related.reduce(
        (sum, course) =>
          sum + course.sessions.reduce((acc, session) => acc + session.reserved, 0),
        0
      );
      const waitlist = related.reduce(
        (sum, course) =>
          sum + course.sessions.reduce((acc, session) => acc + session.waitlist, 0),
        0
      );
      const usage = capacity ? Math.round((reserved / capacity) * 100) : 0;
      return {
        modality,
        label: modalityLabels[modality as CourseModality],
        capacity,
        reserved,
        waitlist,
        usage,
      };
    }
  );

  const sessionCards = courses.flatMap((course) =>
    course.sessions.map((session) => {
      const students = enrollments
        .map((enrollment) => {
          const selection = enrollment.selections.find(
            (item) => item.sessionId === session.id
          );
          if (!selection) return null;
          return {
            id: selection.id,
            student: enrollment.user.name,
            email: enrollment.user.email,
            plan: selection.plan?.label ?? "Plano pendente",
            selectionStatus: selection.status,
            token: enrollment.token ?? "Aguardando",
            paymentStatus: PaymentStatusCopy[enrollment.paymentStatus],
            paymentMethod: enrollment.paymentMethod
              ? PaymentMethodCopy[enrollment.paymentMethod]
              : "Nao definido",
            objective: enrollment.objective,
            grade: enrollment.grade,
            age: enrollment.age,
          };
        })
        .filter((value): value is NonNullable<typeof value> => Boolean(value));
      return {
        id: session.id,
        course: course.title,
        modality: modalityLabels[course.modality],
        schedule: `${session.weekday} - ${session.startTime} ate ${session.endTime}`,
        code: session.code,
        capacity: session.capacity,
        reserved: session.reserved,
        available: session.available,
        waitlist: session.waitlist,
        students,
      };
    })
  ).filter((item) => item.students.length > 0);

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-6 py-12">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge variant="secondary">Painel administrativo</Badge>
          <SignOutButton />
        </div>
        <h1 className="text-4xl font-semibold text-gray-900">
          Secretaria - Gestao de pre-matriculas
        </h1>
        <p className="text-gray-600">
          Acompanhe captacao, vagas e pagamentos para garantir respostas rapidas a cada aluno.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Hoje", value: todayCount },
          { label: "Semana", value: weekCount },
          { label: "Mes", value: monthCount },
        ].map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Pre-matriculas do {item.label.toLowerCase()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {statusCounts.map((count) => (
          <Card key={count.status}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {EnrollmentStatusCopy[count.status]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{count._count._all}</p>
            </CardContent>
          </Card>
        ))}
        {bonusRemaining !== null && hasBonusLimit && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Bonus Redacao + Gramatica
              </CardTitle>
              <CardDescription>10 primeiras confirmacoes pagas</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{bonusRemaining}</p>
            </CardContent>
            <CardContent>
              <PromoControl awarded={bonusAwarded} limit={safeBonusLimit} />
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {paymentStats.map((payment) => (
          <Card key={payment.status}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {payment.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{payment.count}</p>
              <p className="text-xs text-muted-foreground">
                Total acumulado: {currencyFormatter.format(payment.total)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-gray-100">
          <CardHeader>
            <CardTitle>Conversao por plano</CardTitle>
            <CardDescription>Visao rapida da preferencia de investimento.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {planStats.map((plan) => (
              <div key={plan.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <p className="font-medium text-gray-900">{plan.label}</p>
                  <span className="text-xs text-muted-foreground">
                    {plan.count} matriculas - {plan.percentage}%
                  </span>
                </div>
                <Progress value={plan.percentage} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border border-gray-100">
          <CardHeader>
            <CardTitle>Lista de espera automatica</CardTitle>
            <CardDescription>Ordem de chamada com token e turma.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {waitlistEntries.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum aluno aguardando.</p>
            )}
            {waitlistEntries.slice(0, 5).map((entry) => (
              <div
                key={entry.id}
                className="rounded-2xl border border-dashed border-gray-200 p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-900">{entry.student}</p>
                  <Badge variant="outline">Token {entry.token}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {entry.course} ({entry.session}) - {entry.weekday}
                </p>
                <p className="text-xs text-muted-foreground">
                  Posicao {entry.position ?? "NA"} - criado em{" "}
                  {new Date(entry.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
            {waitlistEntries.length > 5 && (
              <p className="text-xs text-muted-foreground">
                +{waitlistEntries.length - 5} aguardando.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border border-gray-100">
        <CardHeader>
          <CardTitle>Tokens por aluno</CardTitle>
          <CardDescription>
            Dados completos do aluno que já possui token gerado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tokenEntries.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum token ativo encontrado.
            </p>
          )}
          {tokenEntries.slice(0, 6).map((entry) => (
            <details
              key={entry.id}
              className="rounded-2xl border border-gray-100 bg-white p-4 text-sm text-gray-700"
            >
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{entry.student}</p>
                  <p className="text-xs text-gray-600">{entry.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Status: {EnrollmentStatusCopy[entry.status]} • Objetivo:{" "}
                    {entry.objective
                      ? objectiveLabels[entry.objective as Objective] ?? "Nao informado"
                      : "Nao informado"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">Token {entry.token}</Badge>
                  <span className="text-xs text-rose-600">Ver detalhes</span>
                </div>
              </summary>
              <div className="mt-3 space-y-4">
                <div className="grid gap-3 text-xs text-gray-600 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-900">
                      Dados do aluno
                    </p>
                    <p>
                      {entry.age ? `${entry.age} anos` : "Idade não informada"} •{" "}
                      {entry.grade ?? "Serie não informada"}
                    </p>
                    {entry.school && <p>{entry.school}</p>}
                    {entry.level && <p>Nivel declarado: {entry.level}</p>}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-900">
                      ENEM e metas
                    </p>
                    <p>
                      ENEM:{" "}
                      {entry.hasEnem
                        ? entry.enemScore
                          ? `${entry.enemScore} pontos`
                          : "Sim"
                        : "Nunca realizou"}
                    </p>
                    {entry.studyGoal && <p>Meta: {entry.studyGoal}</p>}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-900">
                      Pagamento
                    </p>
                    <p>
                      Forma:{" "}
                      {entry.paymentMethod
                        ? PaymentMethodCopy[entry.paymentMethod]
                        : "Não definido"}
                    </p>
                    <p>Status: {PaymentStatusCopy[entry.paymentStatus]}</p>
                    <p>Total: {currencyFormatter.format(entry.totalAmount)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-900">
                      Confirmação presencial
                    </p>
                    <p>
                      {entry.confirmationDay
                        ? fullDateFormatter.format(
                            new Date(entry.confirmationDay)
                          )
                        : "Ainda não agendado"}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 rounded-2xl border border-dashed border-gray-200 p-3">
                  <p className="text-sm font-semibold text-gray-900">
                    Modalidades e planos
                  </p>
                  {entry.selections.length === 0 && (
                    <p className="text-xs text-gray-500">
                      Nenhuma turma escolhida.
                    </p>
                  )}
                  {entry.selections.map((selection) => (
                    <div key={selection.id} className="text-xs text-gray-600">
                      <p className="font-semibold text-gray-900">
                        {selection.course} — {selection.session}
                      </p>
                      <p>
                        {selection.weekday} • {selection.startTime} ate{" "}
                        {selection.endTime}
                      </p>
                      <p>Plano: {selection.plan}</p>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          ))}
        </CardContent>
      </Card>

      <Card className="border border-gray-100">
        <CardHeader>
          <CardTitle>Agenda de confirmacoes presenciais</CardTitle>
          <CardDescription>
            Veja quem ja escolheu o dia da assinatura e organize o atendimento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {upcomingConfirmations.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma data marcada.</p>
          )}
          {upcomingConfirmations.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-dashed border-gray-200 p-4 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-gray-900">{item.student}</p>
                <Badge variant="outline">{item.token}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{item.email}</p>
              <p className="text-xs text-muted-foreground">
                {item.date ? fullDateFormatter.format(item.date) : "Sem data definida"}
              </p>
              <p className="text-xs text-muted-foreground">
                Status atual: {EnrollmentStatusCopy[item.status]}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border border-gray-100">
        <CardHeader>
          <CardTitle>Ocupacao por modalidade</CardTitle>
          <CardDescription>
            Capacidade total versus reservas e lista de espera por modalidade.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {modalityStats.map((stat) => (
            <div key={stat.modality} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <p className="font-medium text-gray-900">{stat.label}</p>
                <span className="text-xs text-muted-foreground">
                  {stat.reserved}/{stat.capacity} vagas
                </span>
              </div>
              <Progress value={stat.usage} className="h-2" />
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>{stat.waitlist} em lista de espera</span>
                <span>{stat.usage}% de ocupacao</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <CapacityManager sessions={capacitySessions} />

      <Card className="border border-gray-100">
        <CardHeader>
          <CardTitle>Distribuicao por objetivo e modalidade</CardTitle>
          <CardDescription>
            Utilize os dados abaixo para direcionar campanhas e mensagens.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-gray-900">Objetivos</p>
            <div className="mt-3 space-y-2 text-sm">
              {Object.entries(objectiveLabels).map(([key, label]) => {
                const total = enrollments.filter((item) => item.objective === key).length;
                return (
                  <div key={key} className="flex items-center justify-between">
                    <span>{label}</span>
                    <Badge variant="outline">{total}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Modalidades</p>
            <div className="mt-3 space-y-2 text-sm">
              {Object.entries(modalityLabels).map(([key, label]) => {
                const total = enrollments.filter((item) =>
                  item.selections.some((selection) => selection.course.modality === key)
                ).length;
                return (
                  <div key={key} className="flex items-center justify-between">
                    <span>{label}</span>
                    <Badge variant="outline">{total}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {sessionCards.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase text-rose-500">Turmas</p>
              <h2 className="text-2xl font-semibold text-gray-900">
                Painel detalhado por turma
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Abra cada card para ver todas as informacoes dos alunos matriculados.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {sessionCards.map((session) => (
              <Card key={session.id} className="border border-gray-100">
                <CardHeader className="space-y-2">
                  <div className="flex items-center justify-between">
                    <CardTitle>{session.course}</CardTitle>
                    <Badge variant="secondary">{session.modality}</Badge>
                  </div>
                  <CardDescription>
                    {session.code} - {session.schedule}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="success">{session.reserved} reservados</Badge>
                    <Badge variant={session.available > 0 ? "secondary" : "outline"}>
                      {session.available} livres
                    </Badge>
                    <Badge variant={session.waitlist > 0 ? "warning" : "outline"}>
                      {session.waitlist} espera
                    </Badge>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" className="rounded-full">
                        Saber mais
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[80vh] overflow-auto sm:max-w-[520px]">
                      <DialogHeader>
                        <DialogTitle>
                          {session.course} - {session.code}
                        </DialogTitle>
                        <DialogDescription>
                          {session.schedule} - {session.modality}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 text-sm">
                        {session.students.map((student) => (
                          <div
                            key={student.id}
                            className="rounded-2xl border border-dashed border-gray-200 p-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-semibold text-gray-900">{student.student}</p>
                              <Badge variant="outline">{student.token}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{student.email}</p>
                            <div className="mt-2 grid gap-1 text-xs text-gray-600">
                              <span>Plano: {student.plan}</span>
                              <span>
                                Status da turma:{" "}
                                {
                                  selectionStatusCopy[
                                    student.selectionStatus as keyof typeof selectionStatusCopy
                                  ]
                                }
                              </span>
                              <span>
                                Pagamento: {student.paymentStatus} ({student.paymentMethod})
                              </span>
                              <span>
                                Objetivo:{" "}
                                {student.objective
                                  ? objectiveLabels[student.objective as Objective] ?? "Nao informado"
                                  : "Nao informado"}
                              </span>
                              <span>
                                Serie/Nivel: {student.grade ?? "Nao informado"}{" "}
                                {student.age ? `- ${student.age} anos` : ""}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <AdminTable enrollments={adminEnrollments} />
    </div>
  );
}
