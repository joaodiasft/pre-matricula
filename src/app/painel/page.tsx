export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { fetchEnrollmentWithRelations } from "@/server/data/pre-enrollment";
import { prisma } from "@/lib/prisma";
import { currencyFormatter, fullDateFormatter } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert } from "@/components/ui/alert";
import {
  EnrollmentStatusCopy,
  PaymentMethodCopy,
  PaymentStatusCopy,
} from "@/lib/enrollment";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/sign-out-button";

export default async function PainelPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/pre-matricula");
  }

  const enrollment = await fetchEnrollmentWithRelations(session.user.id);
  if (!enrollment) {
    redirect("/pre-matricula");
  }

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
  });

  const confirmationDate = enrollment.confirmationDay
    ? fullDateFormatter.format(enrollment.confirmationDay)
    : null;

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-6 py-12">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge variant="secondary">Painel do aluno</Badge>
          <SignOutButton />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold text-gray-900">
            Olá, {session.user.name?.split(" ")[0] ?? "aluno"}.
          </h1>
          <p className="text-gray-600">
            Acompanhe o status da sua pré-matrícula, vouchers e próximos passos.
          </p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Status geral</CardTitle>
            <CardDescription>Atualizado em tempo real</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-semibold text-gray-900">
              {EnrollmentStatusCopy[enrollment.status]}
            </p>
            <p className="text-sm text-muted-foreground">
              Token: {enrollment.token ?? "Aguardando"} · Forma de pagamento:{" "}
              {enrollment.paymentMethod
                ? PaymentMethodCopy[enrollment.paymentMethod]
                : "Defina sua forma de pagamento"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Informações financeiras</CardTitle>
            <CardDescription>
              Subtotal + matrícula {enrollment.registrationFeeDiscount ? "(50% OFF)" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-3xl font-semibold text-gray-900">
              {currencyFormatter.format(Number(enrollment.totalAmount))}
            </p>
            <p className="text-sm text-muted-foreground">
              Status do pagamento: {PaymentStatusCopy[enrollment.paymentStatus]}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Turmas e planos escolhidos</CardTitle>
          <CardDescription>
            Você pode editar qualquer etapa no fluxo de pré-matrícula.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Curso</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollment.selections.map((selection) => (
                <TableRow key={selection.id}>
                  <TableCell className="font-medium">
                    {selection.course.title}
                  </TableCell>
                  <TableCell>
                    {selection.session.weekday} · {selection.session.startTime} às{" "}
                    {selection.session.endTime}
                  </TableCell>
                  <TableCell>{selection.plan?.label ?? "Plano pendente"}</TableCell>
                  <TableCell>
                    {(() => {
                      const meta =
                        selection.status === "WAITLIST"
                          ? {
                              label: "Lista de espera",
                              variant: "warning" as const,
                            }
                          : enrollment.status === "CONFIRMED"
                          ? {
                              label: "Confirmada pela secretaria",
                              variant: "success" as const,
                            }
                          : {
                              label: "Pendente (aguardando secretaria)",
                              variant: "secondary" as const,
                            };
                      return <Badge variant={meta.variant}>{meta.label}</Badge>;
                    })()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Confirmação presencial</CardTitle>
            <CardDescription>
              Traga o token, documento e comprovante de pagamento.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {confirmationDate ? (
              <Alert tone="success">
                Sua assinatura presencial está agendada para {confirmationDate}.
              </Alert>
            ) : (
              <Alert tone="warning">
                Escolha o dia da assinatura no fluxo de pré-matrícula.
              </Alert>
            )}
            <Button asChild variant="outline">
              <Link href="/pre-matricula">Editar pré-matrícula</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Contato da secretaria</CardTitle>
            <CardDescription>
              Use seu token como identificação no WhatsApp.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-gray-600">
              Mensagem automática:
              <br />“Olá! Minha pré-matrícula é o token {enrollment.token ?? "R0000X"}.”
            </p>
            <Button asChild>
              <Link href="https://wa.me/5562981899570" target="_blank">
                Falar com a secretaria
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do aluno</CardTitle>
          <CardDescription>
            Mudou de escola ou objetivo? Atualize na etapa de dados básicos.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-gray-600 md:grid-cols-2">
          <p>
            <span className="font-semibold text-gray-900">Nome:</span>{" "}
            {session.user.name}
          </p>
          <p>
            <span className="font-semibold text-gray-900">Email:</span>{" "}
            {session.user.email}
          </p>
          <p>
            <span className="font-semibold text-gray-900">Escola atual:</span>{" "}
            {enrollment.school ?? profile?.school ?? "Atualize no formulário"}
          </p>
          <p>
            <span className="font-semibold text-gray-900">Objetivo:</span>{" "}
            {enrollment.objective ?? profile?.objective ?? "Não informado"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
