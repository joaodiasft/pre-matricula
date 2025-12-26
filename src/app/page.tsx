import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Info,
  PhoneCall,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fetchCoursesWithStats } from "@/lib/queries/courses";
import { currencyFormatter, shortDateFormatter } from "@/lib/utils";
import { CONFIRMATION_WHATSAPP } from "@/lib/constants";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const faqs = [
  {
    question: "Por que a confirmação presencial é somente a partir de janeiro?",
    answer:
      "Nossa operação presencial volta oficialmente em 05/01/2026. Até lá você garante sua vaga online e recebe o token digital.",
  },
  {
    question: "Preciso pagar a matrícula agora?",
    answer:
      "O pagamento pode ser feito por Pix, cartão, boleto ou presencialmente. Quem concluir até o dia 10 garante 50% off na taxa.",
  },
  {
    question: "Consigo escolher mais de um curso?",
    answer:
      "Sim! Você pode combinar modalidades diferentes (Redação, Exatas, Matemática e Gramática) respeitando o limite de uma turma por modalidade.",
  },
  {
    question: "A lista de espera funciona automático?",
    answer:
      "Quando a turma atinge a capacidade, a vaga entra automaticamente em lista de espera e a secretaria acompanha as liberações em tempo real.",
  },
];

const testimonials = [
  {
    name: "Isabella Nunes",
    course: "Medicina — UFG",
    content:
      "A plataforma de pré-matrícula me deu clareza de horários, investimentos e próxima etapa. No dia presencial bastou apresentar o token e assinar.",
  },
  {
    name: "Thiago Carvalho",
    course: "ENEM 2025",
    content:
      "Consegui garantir Redação + Gramática em minutos pelo celular. A equipe da secretaria já estava esperando com todas as minhas escolhas.",
  },
  {
    name: "Lorena Prado",
    course: "Exatas",
    content:
      "Gostei da transparência das vagas e das opções de plano. Escolhi o bimestral pelo desconto e fui lembrada do prazo da matrícula.",
  },
];

export default async function LandingPage() {
  const courses = await fetchCoursesWithStats();
  const redacao = courses.find((course) => course.modality === "REDACAO");
  const bonusRemaining = redacao?.bonusLimit
    ? Math.max(redacao.bonusLimit - redacao.bonusAwarded, 0)
    : null;

  const sessions = courses.flatMap((course) =>
    course.sessions.map((session) => ({
      code: session.code,
      course: course.title,
      weekday: session.weekday,
      time: `${session.startTime} às ${session.endTime}`,
      level: session.level,
      available: session.available,
    }))
  );

  return (
    <div className="space-y-24 pb-20">
      <section className="relative isolate overflow-hidden bg-gradient-to-b from-rose-50 to-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-16 md:flex-row md:items-center">
          <div className="flex-1 space-y-6">
            <Badge variant="secondary" className="w-fit px-4 py-1">
              Pré-matrículas abertas — 2026
            </Badge>
            <h1 className="text-4xl font-semibold leading-tight text-gray-900 sm:text-5xl">
              Garanta sua vaga com experiência 100% digital e assinatura
              presencial agendada.
            </h1>
            <p className="text-lg text-gray-600">
              Organize cursos, turmas, planos e pagamentos em etapas guiadas,
              com token exclusivo para confirmação a partir de 05 de janeiro de
              2026.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/pre-matricula">
                  Garantir minha vaga <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/pre-matricula#fluxo">Conhecer o fluxo</Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                {
                  title: "10 vagas bônus",
                  description:
                    "Gramática completa para os 10 primeiros da Redação com pagamento confirmado.",
                },
                {
                  title: "Token sequencial",
                  description:
                    "Comprovante digital R00001... para levar no dia da assinatura.",
                },
                {
                  title: "50% na matrícula",
                  description:
                    "Finalize até dia 10 do mês e pague apenas R$ 50 na taxa de matrícula.",
                },
              ].map((item) => (
                <Card
                  key={item.title}
                  className="bg-white/80 shadow-none backdrop-blur"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <Card className="flex-1 border border-rose-100 bg-white/90 shadow-lg">
            <CardHeader>
              <CardTitle>Checklist do aluno</CardTitle>
              <CardDescription>
                Tudo o que precisa antes do dia presencial.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                "Cadastro completo (nome, email e senha).",
                "Pré-matrícula salva com cursos e planos selecionados.",
                "Forma de pagamento escolhida e comprovante se já realizado.",
                "Token sequencial impresso ou no celular.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-rose-500" />
                  <p className="text-gray-700">{item}</p>
                </div>
              ))}
              <Separator />
              <div className="flex items-center gap-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-600">
                <Calendar className="h-5 w-5" />
                Confirmações presenciais a partir de{" "}
                {shortDateFormatter.format(new Date("2026-01-05"))}.
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase text-rose-500">Modalidades</p>
            <h2 className="mt-2 text-3xl font-semibold text-gray-900">
              Escolha a combinação perfeita
            </h2>
          </div>
          {bonusRemaining !== null && (
            <Badge variant="warning">
              Vagas bônus Redação + Gramática: {bonusRemaining}/
              {redacao?.bonusLimit}
            </Badge>
          )}
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {courses.map((course) => (
            <Card key={course.id} className="border border-gray-100">
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between">
                  <CardTitle>{course.title}</CardTitle>
                  <Badge variant="secondary">{course.modality}</Badge>
                </div>
                <CardDescription>{course.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {course.materials}
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {course.sessions.slice(0, 3).map((session) => (
                    <span
                      key={session.id}
                      className="rounded-full bg-muted px-3 py-1"
                    >
                      {session.code} · {session.weekday} · {session.startTime}h ·
                      {session.available} vagas
                    </span>
                  ))}
                </div>
                <Separator />
                <div className="flex flex-wrap gap-3 text-sm">
                  {course.plans.slice(0, 3).map((plan) => (
                    <div key={plan.id} className="rounded-2xl bg-gray-50 px-4 py-2">
                      <p className="font-medium">{plan.label}</p>
                      <p className="text-muted-foreground">
                        {currencyFormatter.format(Number(plan.price))}
                      </p>
                    </div>
                  ))}
                  <Button variant="ghost" className="ml-auto" asChild>
                    <Link href="/pre-matricula">
                      Detalhes e turmas <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-dashed border-rose-200 bg-rose-50/70 px-4 py-2 text-xs font-medium text-rose-600">
                  <Info className="h-4 w-4" />
                  <span>Valores pagos apenas na secretaria presencialmente.</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6" id="horarios">
        <div className="flex flex-col gap-3">
          <p className="text-sm uppercase text-rose-500">Horários 2026</p>
          <h2 className="text-3xl font-semibold text-gray-900">
            Turmas e códigos oficiais
          </h2>
          <p className="text-gray-600">
            Todas as turmas carregam o código oficial (R1, EX1, M2...) e exibem
            vagas restantes em tempo real considerando pré-matrículas enviadas.
          </p>
        </div>
        <div className="mt-8">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Dia / Horário</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead>Vagas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.code}>
                  <TableCell className="font-medium">{session.code}</TableCell>
                  <TableCell>{session.course}</TableCell>
                  <TableCell>
                    {session.weekday} · {session.time}
                  </TableCell>
                  <TableCell>{session.level}</TableCell>
                  <TableCell>
                    {session.available > 0 ? (
                      <Badge variant="success">
                        {session.available} vagas
                      </Badge>
                    ) : (
                      <Badge variant="warning">Lista de espera</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6" id="depoimentos">
        <div className="flex flex-col gap-3">
          <p className="text-sm uppercase text-rose-500">Quem já passou</p>
          <h2 className="text-3xl font-semibold text-gray-900">
            Experiências reais com o processo
          </h2>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.name} className="border border-gray-100">
              <CardContent className="space-y-4 p-6">
                <p className="text-gray-600">{testimonial.content}</p>
                <div>
                  <p className="font-semibold text-gray-900">
                    {testimonial.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.course}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6" id="faq">
        <div className="rounded-3xl bg-gray-50 p-8">
          <div className="flex flex-col gap-3">
            <p className="text-sm uppercase text-rose-500">FAQ</p>
            <h2 className="text-3xl font-semibold text-gray-900">
              Dúvidas frequentes respondidas
            </h2>
          </div>
          <div className="mt-8 space-y-6">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-2xl bg-white p-5 shadow-sm"
              >
                <p className="text-base font-semibold text-gray-900">
                  {faq.question}
                </p>
                <p className="mt-2 text-sm text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6">
        <Card className="border border-rose-100 bg-gradient-to-r from-rose-500 to-rose-600 text-white">
          <CardContent className="flex flex-col gap-6 p-8 text-white md:flex-row md:items-center">
            <div className="flex-1 space-y-3">
              <p className="text-sm uppercase tracking-[0.2em] text-white/70">
                Última etapa
              </p>
              <h3 className="text-3xl font-semibold">
                Pronto para garantir a sua vaga?
              </h3>
              <p className="text-white/90">
                Envie a pré-matrícula completa e fale com a secretaria via
                WhatsApp informando seu token.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button
                size="lg"
                variant="secondary"
                className="text-rose-600"
                asChild
              >
                <Link href="/pre-matricula">Iniciar agora</Link>
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="border-white/40 text-white hover:bg-white/20"
                asChild
              >
                <Link href={`https://wa.me/5562981899570`} target="_blank">
                  <PhoneCall className="mr-2 h-4 w-4" />
                  {CONFIRMATION_WHATSAPP}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
