"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  StudentProfile,
  Level,
  Objective,
  PaymentMethod,
  EnrollmentStatus,
} from "@prisma/client";
import {
  BasicInfoFormValues,
  formSchema,
} from "@/components/pre-enrollment/pre-enrollment-forms";
import {
  saveBasicInfo,
  selectCourseSession,
  removeSelection,
  attachPlan,
  selectPaymentMethod,
  submitPreEnrollment,
  scheduleConfirmation,
} from "@/server/actions/pre-enrollment";
import { ClientCourse, ClientEnrollment } from "@/types/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert } from "@/components/ui/alert";
import { EnrollmentStatusCopy, PaymentMethodCopy } from "@/lib/enrollment";
import { cn, currencyFormatter, fullDateFormatter } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import {
  MIN_CONFIRMATION_DATE,
  CONFIRMATION_WHATSAPP,
} from "@/lib/constants";
import { SignOutButton } from "@/components/sign-out-button";

const objectives = [
  { label: "ENEM", value: "ENEM" },
  { label: "UFG / Vestibular", value: "UFG_VESTIBULAR" },
  { label: "Reforco", value: "REFORCO" },
  { label: "Concursos", value: "CONCURSOS" },
];

const levels = [
  { label: "Iniciante", value: "INICIANTE" },
  { label: "Intermediario", value: "INTERMEDIARIO" },
  { label: "Avancado", value: "AVANCADO" },
];

const BASIC_INFO_STORAGE_KEY = "redas-basic-info-cache";

const paymentOptions: {
  label: string;
  value: PaymentMethod;
  helper: string;
  detail: string;
}[] = [
  {
    label: "Pix",
    value: "PIX",
    helper: "Chave enviada por e-mail apos confirmar o plano.",
    detail:
      "Envie o comprovante para o WhatsApp assim que concluir a transferencia para validar a vaga.",
  },
  {
    label: "Cartao",
    value: "CARD",
    helper: "Parcelamento com confirmação digital assistida.",
    detail:
      "Finalizamos a cobrança com você e liberamos o token assim que o gateway confirmar o pagamento.",
  },
  {
    label: "Boleto",
    value: "BOLETO",
    helper: "Documento enviado automaticamente para o seu e-mail.",
    detail:
      "Pague ate a data limite e encaminhe o comprovante no WhatsApp para seguir com a validacao.",
  },
  {
    label: "Pagamento presencial",
    value: "PRESENTIAL",
    helper: "Garanta a vaga agora e quite presencialmente.",
    detail:
      "Combine com a secretaria logo apos gerar o token para finalizar o pagamento e manter a reserva.",
  },
];

const segmentFilters = [
  {
    label: "Todos os segmentos",
    value: "ALL",
    helper: "Mostrar todas as turmas.",
  },
  {
    label: "Ensino Medio",
    value: "MEDIO",
    helper: "Priorize horarios do ensino medio.",
  },
  {
    label: "Ensino Fundamental",
    value: "FUNDAMENTAL",
    helper: "Mostra apenas turmas do fundamental.",
  },
] as const;

type SegmentFilter = (typeof segmentFilters)[number]["value"];

const steps = [
  { id: 1, title: "Cadastro", description: "Conta criada e validada." },
  {
    id: 2,
    title: "Dados basicos",
    description: "Informacoes essenciais sobre o aluno.",
  },
  {
    id: 3,
    title: "Cursos e turmas",
    description: "Confirme uma turma por modalidade.",
  },
  {
    id: 4,
    title: "Planos e pagamento",
    description: "Defina valores e forma de pagamento.",
  },
  {
    id: 5,
    title: "Revisao geral",
    description: "Revise antes de enviar a pre matricula.",
  },
  {
    id: 6,
    title: "Dia presencial",
    description: "Agende a assinatura a partir de 05/01/2026.",
  },
  { id: 7, title: "Checklist", description: "Lista basica do que levar." },
  { id: 8, title: "Redes sociais", description: "Receba avisos e lembretes." },
];
type Props = {
  courses: ClientCourse[];
  enrollment: ClientEnrollment;
  profile: StudentProfile | null;
  sessionUser: {
    name?: string | null;
    email?: string | null;
  };
  discountActive: boolean;
};

export function PreEnrollmentFlow({
  courses,
  enrollment,
  profile,
  sessionUser,
  discountActive,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "local" | "success" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    []
  );
  const computedInitialStep = useMemo(
    () => determineInitialStep(enrollment),
    [enrollment]
  );
  const [activeStep, setActiveStep] = useState(computedInitialStep);

  useEffect(() => {
    setActiveStep(computedInitialStep);
  }, [computedInitialStep]);

  const form = useForm<BasicInfoFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: sessionUser.name ?? "",
      age: enrollment.age ?? profile?.age ?? undefined,
      school: enrollment.school ?? profile?.school ?? "",
      grade: enrollment.grade ?? profile?.grade ?? "",
      objective: enrollment.objective ?? profile?.objective ?? "ENEM",
      level: enrollment.level ?? profile?.level ?? "INICIANTE",
      hasEnem: enrollment.hasEnem ?? profile?.hasEnem ?? false,
      enemScore: enrollment.enemScore ?? profile?.enemScore ?? undefined,
      studyGoal: enrollment.studyGoal ?? "",
    },
  });

  const hasEnem = useWatch({
    control: form.control,
    name: "hasEnem",
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const cached = window.localStorage.getItem(BASIC_INFO_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as Partial<BasicInfoFormValues>;
        form.reset({
          ...form.getValues(),
          ...parsed,
        });
      }
    } catch (error) {
      console.error("Falha ao carregar cache local:", error);
    }
  }, [form]);

  const derivedSegment = useMemo(
    () => segmentFromGrade(enrollment.grade ?? profile?.grade ?? undefined),
    [enrollment.grade, profile?.grade]
  );

  const [segmentFilter, setSegmentFilter] =
    useState<SegmentFilter>(derivedSegment);

  useEffect(() => {
    setSegmentFilter(derivedSegment);
  }, [derivedSegment]);

  const selectionSignature = useMemo(
    () =>
      JSON.stringify(
        [...enrollment.selections]
          .map((selection) => ({
            courseId: selection.courseId,
            sessionId: selection.sessionId,
          }))
          .sort((a, b) => a.courseId.localeCompare(b.courseId))
      ),
    [enrollment.selections]
  );

  const paymentLabel = enrollment.paymentMethod
    ? PaymentMethodCopy[enrollment.paymentMethod]
    : "Selecione uma forma de pagamento";

  const bookedDate = enrollment.confirmationDay
    ? fullDateFormatter.format(new Date(enrollment.confirmationDay))
    : null;

  const progress =
    steps.length > 1
      ? ((activeStep - 1) / (steps.length - 1)) * 100
      : 100;

  const isBasicInfoComplete = Boolean(
    enrollment.age && enrollment.school && enrollment.grade && enrollment.objective
  );

  const [hasSavedBasicInfo, setHasSavedBasicInfo] = useState(isBasicInfoComplete);

  useEffect(() => {
    setHasSavedBasicInfo(isBasicInfoComplete);
  }, [isBasicInfoComplete]);

  const basicInfoReady = hasSavedBasicInfo || isBasicInfoComplete;
  const hasAtLeastOneSelection = enrollment.selections.length >= 1;
  const allPlansDefined = enrollment.selections.every((sel) => Boolean(sel.planId));
  const paymentDefined = Boolean(enrollment.paymentMethod);
  const readyForReview = enrollment.status !== "DRAFT";
  const hasSchedule = Boolean(enrollment.confirmationDay);
  type TriggerResponse = { success?: boolean; error?: unknown };

  const trigger = (
    action: () => Promise<TriggerResponse | void>,
    options?: { nextStep?: number; successMessage?: string }
  ) => {
    startTransition(async () => {
      const response = await action();
      if (response && "success" in response && !response.success) {
        const errorMessage =
          typeof response.error === "string"
            ? response.error
            : "Não foi possível concluir.";
        toast.error(errorMessage);
        return;
      }
      toast.success(options?.successMessage ?? "Atualizacao registrada.");
      router.refresh();
      if (options?.nextStep) {
        setActiveStep(options.nextStep);
      }
    });
  };

  type BasicInfoActionResult =
    | { success: true }
    | { success: false; error?: string | Record<string, string[] | undefined> };

  const handleBasicInfoSubmit = form.handleSubmit((values) => {
    setIsSaving(true);
    setSaveStatus("saving");
    const payload = values;

    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          BASIC_INFO_STORAGE_KEY,
          JSON.stringify(payload)
        );
      }
    } catch (error) {
      console.error("Falha ao salvar localmente:", error);
    }

    setHasSavedBasicInfo(true);
    const now = new Date();
    setLastSavedAt(now);
    setActiveStep(3);
    setSaveStatus("local");
    setIsSaving(false);
    toast.success("Dados salvos localmente! Sincronizando com o servidor...");

    startTransition(() => {
      (async () => {
        const result: BasicInfoActionResult = await saveBasicInfo(payload);
      if (!result.success) {
        if (
          result.error &&
          typeof result.error === "object" &&
          !Array.isArray(result.error)
        ) {
          Object.entries(
            result.error as Record<string, string[] | undefined>
          ).forEach(([field, messages]) => {
            const message = messages?.[0];
            if (message) {
              form.setError(field as keyof BasicInfoFormValues, {
                message,
              });
            }
          });
          toast.error("Revise os campos destacados e tente novamente.");
          setActiveStep(2);
          setSaveStatus("error");
          return;
        }

        toast.error(
          typeof result.error === "string"
            ? result.error
            : "Não foi possível sincronizar com o servidor."
        );
        setSaveStatus("error");
        return;
      }

      setSaveStatus("success");
      toast.success("Dados sincronizados com sucesso!");
      router.refresh();
      })().catch(() => {
        setSaveStatus("error");
        toast.error("Não foi possível sincronizar com o servidor.");
      });
    });
  });

  return (
    <div className="space-y-10">
      <div className="rounded-3xl border border-rose-100 bg-gradient-to-tr from-rose-50 via-white to-rose-100 p-6 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-500">
              Fluxo em etapas
            </p>
            <h2 className="text-3xl font-semibold text-gray-900">
              {steps[activeStep - 1]?.title}
            </h2>
            <p className="text-sm text-gray-600">
              {steps[activeStep - 1]?.description}
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 text-sm text-gray-600 md:items-end">
            <Badge variant="outline" className="bg-white/80">
              Token atual: {enrollment.token ?? "aguardando"}
            </Badge>
            <SignOutButton />
          </div>
        </div>
        <div className="mt-6 flex items-center gap-4">
          <Progress value={progress} className="h-2 flex-1" />
          <span className="text-sm font-medium text-gray-600">
            {activeStep}/{steps.length}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-600">
          {steps.map((step) => (
            <button
              key={step.id}
              className={cn(
                "rounded-full px-3 py-1 transition",
                step.id === activeStep
                  ? "bg-rose-600 text-white shadow-lg"
                  : "bg-rose-100 text-rose-600"
              )}
              onClick={() => setActiveStep(step.id)}
            >
              {step.id}. {step.title}
            </button>
          ))}
        </div>
      </div>
      {activeStep === 2 && (
        <>
          <Card className="border-rose-100">
            <CardHeader>
              <CardTitle>Fase 2 - Dados básicos e objetivos</CardTitle>
              <CardDescription>
                Informe apenas o necessario. CPF, RG e endereco completo serao coletados no dia da assinatura do contrato.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBasicInfoSubmit}>
                <fieldset
                  disabled={isPending || isSaving}
                  className="grid gap-4 md:grid-cols-2 disabled:opacity-70"
                >
                <Field
                  className="col-span-2"
                  label="Nome completo"
                  required
                  error={form.formState.errors.fullName?.message}
                  hint="Digite nome e sobrenome exatamente como aparecem no documento."
                >
                  <Input
                    placeholder="Ex: Joao Claudio da Silva"
                    {...form.register("fullName")}
                  />
                </Field>
                <Field
                  label="Idade"
                  required
                  error={form.formState.errors.age?.message}
                  hint="Informe sua idade atual em anos completos."
                >
                  <Input
                    type="number"
                    placeholder="Ex: 17"
                    {...form.register("age", { valueAsNumber: true })}
                  />
                </Field>
                <Field
                  label="Onde estuda"
                  required
                  error={form.formState.errors.school?.message}
                  hint="Colégio, cursinho ou plataforma em que você estuda atualmente."
                >
                  <Input
                    placeholder="Ex: Colegio Estadual Central"
                    {...form.register("school")}
                  />
                </Field>
                <Field
                  label="Serie / Ano"
                  required
                  error={form.formState.errors.grade?.message}
                  hint="Exemplo: 9º ano, 3º ano EM ou curso tecnico."
                >
                  <Input
                    placeholder="Ex: 3º ano do ensino medio"
                    {...form.register("grade")}
                  />
                </Field>
                <Field
                  label="Objetivo principal"
                  required
                  error={form.formState.errors.objective?.message}
                  hint="Escolha o foco para organizarmos modalidades e vagas."
                >
                  <Select
                    onValueChange={(value: Objective) =>
                      form.setValue("objective", value)
                    }
                    defaultValue={form.getValues("objective")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {objectives.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field
                  label="Nivel de dominio"
                  required
                  error={form.formState.errors.level?.message}
                  hint="Indique o quão confortável você se sente com o conteúdo atual."
                >
                  <Select
                    onValueChange={(value: Level) => form.setValue("level", value)}
                    defaultValue={form.getValues("level")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {levels.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Já fez ENEM?" required hint="Já fez ENEM ou vestibular antes?">
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant={hasEnem ? "default" : "outline"}
                      onClick={() => form.setValue("hasEnem", true)}
                    >
                      Sim
                    </Button>
                    <Button
                      type="button"
                      variant={!hasEnem ? "default" : "outline"}
                      onClick={() => form.setValue("hasEnem", false)}
                    >
                      Não
                    </Button>
                  </div>
                </Field>
                {hasEnem && (
                  <Field error={form.formState.errors.enemScore?.message}>
                    <Label>Nota no ENEM</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 860"
                      {...form.register("enemScore", { valueAsNumber: true })}
                    />
                  </Field>
                )}
                <Field
                  className="col-span-2"
                  hint="Conte, em 1 ou 2 frases, o principal resultado que espera alcançar."
                >
                  <Label>Objetivo específico</Label>
                  <Textarea
                    rows={3}
                    placeholder="Ex: melhorar redação para garantir nota acima de 900."
                    {...form.register("studyGoal")}
                  />
                  <FormMessage message={form.formState.errors.studyGoal?.message} />
                </Field>
                </fieldset>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <Button type="submit" disabled={isPending || isSaving}>
                    {isPending || isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar dados básicos"
                    )}
                  </Button>
                  <div className="flex flex-col gap-1 text-xs text-gray-500">
                    <span>
                      {basicInfoReady
                        ? "Pronto! Você pode avançar para a fase de cursos."
                        : "Assim que salvar, destravamos a fase de cursos."}
                    </span>
                    {saveStatus === "local" && (
                      <span className="flex items-center gap-1 text-rose-600">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Dados salvos localmente. Sincronizando...
                      </span>
                    )}
                    {saveStatus === "success" && lastSavedAt && (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Salvo às {timeFormatter.format(lastSavedAt)}.
                      </span>
                    )}
                    {saveStatus === "error" && (
                      <span className="flex items-center gap-1 text-destructive">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Não foi possível salvar. Revise os campos.
                      </span>
                    )}
                    {saveStatus === "saving" && (
                      <span className="flex items-center gap-1 text-rose-600">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Salvando alterações...
                      </span>
                    )}
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
          <PhaseFooter
            label="Ir para Fase 3 - Cursos"
            disabled={!basicInfoReady}
            onContinue={() => setActiveStep(3)}
          />
        </>
      )}
      {activeStep === 3 && (
        <>
          <CourseSelection
            courses={courses}
            selections={enrollment.selections}
            segmentFilter={segmentFilter}
            onSegmentChange={setSegmentFilter}
            onRemove={(selectionId) =>
              trigger(() => removeSelection(selectionId), {
                successMessage: "Turma removida.",
              })
            }
            selectionSignature={selectionSignature}
            onConfirmAll={(pairs) =>
              trigger(
                async () => {
                  await Promise.all(
                    pairs.map(({ courseId, sessionId }) =>
                      selectCourseSession({ courseId, sessionId })
                    )
                  );
                },
                {
                  nextStep: 4,
                  successMessage: "Turmas confirmadas!",
                }
              )
            }
          />
          <PhaseFooter
            label="Ir para Fase 4 - Planos"
            disabled={!hasAtLeastOneSelection}
            onContinue={() => setActiveStep(4)}
          />
        </>
      )}

      {activeStep === 4 && (
        <>
          <PlanSelection
            courses={courses}
            enrollment={enrollment}
            discountActive={discountActive}
            onPlanChange={(selectionId, planId) =>
              trigger(() => attachPlan({ selectionId, planId }), {
                successMessage: "Plano atualizado!",
              })
            }
            onPaymentChange={(paymentMethod) =>
              trigger(() => selectPaymentMethod({ paymentMethod }), {
                successMessage: "Forma de pagamento escolhida!",
              })
            }
            paymentLabel={paymentLabel}
          />
          <PhaseFooter
            label="Ir para Fase 5 - Revisao"
            disabled={!(
              hasAtLeastOneSelection &&
              allPlansDefined &&
              paymentDefined
            )}
            onContinue={() => setActiveStep(5)}
          />
        </>
      )}

      {activeStep === 5 && (
        <>
          <ReviewStep
            enrollment={enrollment}
            onConfirm={() =>
              trigger(() => submitPreEnrollment(), {
                nextStep: 6,
                successMessage: "Pre matricula enviada!",
              })
            }
          />
          <PhaseFooter
            label="Ir para Fase 6 - Agendar presencial"
            disabled={!readyForReview}
            onContinue={() => setActiveStep(6)}
          />
        </>
      )}

      {activeStep === 6 && (
        <>
          <ScheduleStep
            currentDate={bookedDate}
            status={enrollment.status as EnrollmentStatus}
            onSelectDate={(date) =>
              trigger(() => scheduleConfirmation({ date }), {
                nextStep: 7,
                successMessage: "Data confirmada!",
              })
            }
          />
          <PhaseFooter
            label="Ir para Fase 7 - Checklist"
            disabled={!hasSchedule}
            onContinue={() => setActiveStep(7)}
          />
        </>
      )}

      {activeStep === 7 && (
        <>
          <ChecklistStep token={enrollment.token} />
          <PhaseFooter
            label="Ir para Fase 8 - Redes sociais"
            onContinue={() => setActiveStep(8)}
          />
        </>
      )}

      {activeStep === 8 && <SocialStep />}
    </div>
  );
}
type FieldProps = {
  children: ReactNode;
  label?: string;
  required?: boolean;
  error?: string;
  className?: string;
  hint?: ReactNode;
};

function Field({ children, label, required, error, className, hint }: FieldProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      {label && (
        <div className="space-y-1">
          <Label className="text-base font-semibold text-gray-900" requiredMark={required}>
            {label}
          </Label>
          {hint && <p className="text-sm text-gray-600">{hint}</p>}
        </div>
      )}
      {!label && hint && <p className="text-sm text-gray-600">{hint}</p>}
      {children}
      {error && <FormMessage message={error} />}
    </div>
  );
}

type CourseSelectionProps = {
  courses: ClientCourse[];
  selections: ClientEnrollment["selections"];
  segmentFilter: SegmentFilter;
  onSegmentChange: (filter: SegmentFilter) => void;
  onRemove: (selectionId: string) => void;
  selectionSignature: string;
  onConfirmAll: (
    entries: Array<{ courseId: string; sessionId: string }>
  ) => void;
};

function CourseSelection({
  courses,
  selections,
  segmentFilter,
  onSegmentChange,
  onRemove,
  selectionSignature,
  onConfirmAll,
}: CourseSelectionProps) {
  const selectionByCourse = useMemo(() => {
    const map = new Map<string, ClientEnrollment["selections"][number]>();
    selections.forEach((selection) => map.set(selection.courseId, selection));
    return map;
  }, [selections]);

  const [pendingChoices, setPendingChoices] = useState<Record<string, string>>({});
  const [, startTransition] = useTransition();

  useEffect(() => {
    const parsed: { courseId: string; sessionId: string }[] = JSON.parse(
      selectionSignature
    );
    const defaults: Record<string, string> = {};
    courses.forEach((course) => {
      const match = parsed.find((item) => item.courseId === course.id);
      defaults[course.id] = match?.sessionId ?? "";
    });
    startTransition(() => {
      setPendingChoices(defaults);
    });
  }, [courses, selectionSignature, startTransition]);

  const handleChoice = (courseId: string, sessionId: string) => {
    setPendingChoices((prev) => ({ ...prev, [courseId]: sessionId }));
  };

  const courseSummaries = useMemo(() => {
    return courses.map((course) => {
      const selection = selectionByCourse.get(course.id);
      const pendingId = pendingChoices[course.id] ?? "";
      const pendingSession =
        pendingId && pendingId !== selection?.sessionId
          ? course.sessions.find((session) => session.id === pendingId)
          : undefined;

      return { course, selection, pendingSession };
    });
  }, [courses, selectionByCourse, pendingChoices]);

  const actionableSummaries = useMemo(
    () =>
      courseSummaries.filter(
        (summary) => summary.selection || summary.pendingSession
      ),
    [courseSummaries]
  );

  const pendingConfirmations = useMemo(
    () =>
      actionableSummaries
        .filter((summary) => summary.pendingSession)
        .map((summary) => ({
          courseId: summary.course.id,
          sessionId: summary.pendingSession!.id,
        })),
    [actionableSummaries]
  );

  return (
    <Card className="border-rose-100">
      <CardHeader>
        <CardTitle>Fase 3 - Cursos e turmas</CardTitle>
        <CardDescription>
          Confirme apenas uma turma por modalidade. Caso esteja lotada, adicionamos você automaticamente na lista de espera.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-3xl border border-dashed border-rose-100 bg-rose-50/50 p-4">
          <p className="text-sm font-semibold text-rose-700">Segmento</p>
          <p className="text-xs text-rose-600">Use o filtro para visualizar apenas horarios relevantes.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {segmentFilters.map((option) => (
              <button
                key={option.value}
                className={cn(
                  "rounded-full px-4 py-2 text-sm transition",
                  segmentFilter === option.value
                    ? "bg-rose-600 text-white shadow"
                    : "bg-white text-rose-600"
                )}
                onClick={() => onSegmentChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <Alert tone="info">
          Mínimo geral: escolha ao menos uma modalidade. Se quiser mais de um curso, confirme uma turma por modalidade.
        </Alert>
        {courses.map((course) => {
          const selection = selectionByCourse.get(course.id);
          const pending = pendingChoices[course.id] ?? "";
          const filteredSessions = course.sessions.filter((session) =>
            doesSessionMatchFilter(session.level, segmentFilter)
          );

          return (
            <div
              key={course.id}
              className="space-y-3 rounded-3xl border border-gray-100 bg-white/80 p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-gray-900">{course.title}</p>
                  <p className="text-sm text-gray-600">{course.materials}</p>
                </div>
                {selection ? (
                  <Badge variant="success">Confirmado ({selection.session.code})</Badge>
                ) : (
                  <Badge variant="outline">Aguardando confirmação</Badge>
                )}
              </div>

              {filteredSessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-sm text-gray-600">
                  Não há turmas para o filtro escolhido. Ajuste o segmento acima.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {filteredSessions.map((session) => {
                    const isPending = pending === session.id;
                    const isSelected = selection?.sessionId === session.id;
                    const isFull = session.available <= 0;
                    return (
                      <button
                        key={session.id}
                        type="button"
                        className={cn(
                          "text-left",
                          "rounded-2xl border p-4 transition",
                          isSelected
                            ? "border-rose-500 bg-rose-50"
                            : isPending
                            ? "border-rose-300 bg-rose-50/70"
                            : "border-gray-200 bg-white"
                        )}
                        onClick={() => handleChoice(course.id, session.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {session.weekday}
                            </p>
                            <p className="text-xs text-gray-600">
                              {session.startTime} ate {session.endTime} - {session.level}
                            </p>
                            <p className="text-xs text-gray-500">Codigo {session.code}</p>
                          </div>
                          <Badge variant={isFull ? "warning" : "success"}>
                            {isFull ? "Lista de espera" : `${session.available} vagas`}
                          </Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        <div className="space-y-4 rounded-3xl border border-gray-100 bg-white/70 p-5">
          <div>
            <p className="text-sm font-semibold text-gray-900">Minhas turmas</p>
            <p className="text-xs text-gray-600">
              Revise as escolhas e confirme abaixo as modalidades que deseja cursar.
            </p>
          </div>
          <div className="space-y-3">
            {actionableSummaries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-sm text-gray-600">
                Escolha uma turma em cada modalidade e ela aparecera aqui para revisao.
              </div>
            ) : (
              actionableSummaries.map(({ course, selection, pendingSession }) => (
                <div
                  key={course.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{course.title}</p>
                    <p className="text-xs text-gray-600">
                      {pendingSession
                        ? `${pendingSession.weekday} - ${pendingSession.startTime} ate ${pendingSession.endTime}`
                        : selection
                        ? `${selection.session.weekday} - ${selection.session.startTime} ate ${selection.session.endTime}`
                        : null}
                    </p>
                  </div>
                  <Badge variant={pendingSession ? "outline" : "success"}>
                    {pendingSession ? "Selecionada" : "Confirmada"}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
        {actionableSummaries.length > 0 && (
          <div className="space-y-4 rounded-3xl border border-gray-100 bg-white/80 p-5">
            <div>
              <p className="text-sm font-semibold text-gray-900">Resumo e confirmação</p>
              <p className="text-xs text-gray-600">
                Verifique as modalidades confirmadas antes de avançar para os planos.
              </p>
            </div>
            <div className="space-y-2">
              {actionableSummaries.map(({ course, selection, pendingSession }) => {
                const schedule = selection ? selection.session : pendingSession;
                return (
                  <div
                    key={course.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-3 text-sm text-gray-700"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">
                        {course.title}{" "}
                        {selection ? `— ${selection.session.code}` : ""}
                      </p>
                      {schedule && (
                        <p>
                          {schedule.weekday} · {schedule.startTime} ate{" "}
                          {schedule.endTime}
                        </p>
                      )}
                    </div>
                    {selection ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="success">Confirmada</Badge>
                        <Button
                          variant="ghost"
                          className="rounded-full"
                          onClick={() => onRemove(selection.id)}
                        >
                          Remover
                        </Button>
                      </div>
                    ) : (
                      <Badge variant="outline">Selecionada</Badge>
                    )}
                  </div>
                );
              })}
            </div>
            <Button
              className="rounded-full"
              disabled={pendingConfirmations.length === 0}
              onClick={() => onConfirmAll(pendingConfirmations)}
            >
              Confirmar turmas selecionadas
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
type PlanSelectionProps = {
  courses: ClientCourse[];
  enrollment: ClientEnrollment;
  discountActive: boolean;
  onPlanChange: (selectionId: string, planId: string) => void;
  onPaymentChange: (paymentMethod: PaymentMethod) => void;
  paymentLabel: string;
};

function PlanSelection({
  courses,
  enrollment,
  discountActive,
  onPlanChange,
  onPaymentChange,
  paymentLabel,
}: PlanSelectionProps) {
  const selectedPayment = paymentOptions.find(
    (option) => option.value === enrollment.paymentMethod
  );

  return (
    <Card className="border-gray-100">
      <CardHeader>
        <CardTitle>Fase 4 - Planos e pagamento</CardTitle>
        <CardDescription>
          Defina o plano de cada modalidade e escolha a forma de pagamento. Para validar pagamentos, envie os comprovantes para nosso WhatsApp apos gerar o token.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {enrollment.selections.length === 0 && (
          <Alert tone="warning">
            Escolha ao menos uma turma para liberar os planos de pagamento.
          </Alert>
        )}

        {enrollment.selections.map((selection) => {
          const course = courses.find((item) => item.id === selection.courseId);
          if (!course) return null;

          return (
            <div
              key={selection.id}
              className="space-y-3 rounded-3xl border border-gray-100 bg-white/80 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-gray-900">
                    {course.title} - {selection.session.code}
                  </p>
                  <p className="text-xs text-gray-600">
                    {selection.session.weekday} - {selection.session.startTime} ate {selection.session.endTime}
                  </p>
                </div>
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
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {course.plans.map((plan) => {
                  const isSelected = selection.planId === plan.id;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      className={cn(
                        "rounded-2xl border p-4 text-left transition",
                        isSelected
                          ? "border-rose-500 bg-rose-50 shadow"
                          : "border-gray-200 bg-white"
                      )}
                      onClick={() => onPlanChange(selection.id, plan.id)}
                    >
                      <p className="text-sm font-semibold text-gray-900">{plan.label}</p>
                      <p className="text-xs text-gray-500">{plan.months} meses</p>
                      <p className="mt-2 text-xl font-semibold text-gray-900">
                        {currencyFormatter.format(plan.price)}
                      </p>
                      {plan.description && (
                        <p className="text-xs text-gray-500">{plan.description}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {enrollment.selections.length > 0 && (
          <div className="space-y-4 rounded-3xl border border-gray-100 bg-white/80 p-5">
            <div>
              <p className="text-sm font-semibold text-gray-900">Modalidades de pagamento</p>
              <p className="text-xs text-gray-600">{paymentLabel}</p>
            </div>
            <div className="grid gap-6 md:grid-cols-[240px,1fr]">
              <div className="flex flex-col gap-2">
                {paymentOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      "rounded-2xl border px-4 py-3 text-left text-sm transition",
                      enrollment.paymentMethod === option.value
                        ? "border-rose-500 bg-rose-50"
                        : "border-gray-200 bg-white"
                    )}
                    onClick={() => onPaymentChange(option.value)}
                  >
                    <p className="font-semibold text-gray-900">{option.label}</p>
                    <p className="text-xs text-gray-600">{option.helper}</p>
                  </button>
                ))}
              </div>
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                {selectedPayment ? (
                  <>
                    <p className="font-semibold text-gray-900">
                      {selectedPayment.label}
                    </p>
                    <p className="mt-1">{selectedPayment.detail}</p>
                    <p className="mt-4 text-sm">
                      Pagamentos e comprovantes sao validados rapidamente pelo WhatsApp {CONFIRMATION_WHATSAPP}. Guarde o token para agilizar o atendimento.
                    </p>
                  </>
                ) : (
                  <p>Escolha uma modalidade para ver detalhes de confirmação.</p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Total estimado</p>
                <p className="text-xs text-gray-600">
                  Matricula {discountActive ? "com 50% de desconto ate o dia 10" : "com valor integral"}
                </p>
              </div>
              <p className="text-3xl font-semibold text-gray-900">
                {currencyFormatter.format(enrollment.totalAmount)}
              </p>
            </div>
            <Alert tone="info">
              Em caso de dúvidas ou para acelerar a confirmação, fale com a secretaria pelo WhatsApp {CONFIRMATION_WHATSAPP} assim que escolher a forma de pagamento.
            </Alert>
            <Alert tone="warning">
              A vaga fica como pendente até a equipe da secretaria revisar e confirmar. Assim que aprovarem você verá o selo de confirmada automaticamente.
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
type ReviewStepProps = {
  enrollment: ClientEnrollment;
  onConfirm: () => void;
};

function ReviewStep({ enrollment, onConfirm }: ReviewStepProps) {
  const canConfirm =
    enrollment.selections.length > 0 &&
    enrollment.selections.every((sel) => sel.planId) &&
    enrollment.paymentMethod &&
    enrollment.status === "DRAFT";

  return (
    <Card className="border-gray-100">
      <CardHeader>
        <CardTitle>Fase 5 - Revisao final</CardTitle>
        <CardDescription>
          Confirme os dados antes de enviar para a equipe analisar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-3xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-900">Cursos escolhidos</p>
          <ul className="mt-2 space-y-2 text-sm text-gray-600">
            {enrollment.selections.map((selection) => (
              <li key={selection.id}>
                {selection.course.title} - {selection.session.weekday} ({selection.session.startTime} ate {selection.session.endTime}) - {selection.plan?.label ?? "Plano pendente"}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-900">Forma de pagamento</p>
          <p className="mt-2 text-sm text-gray-600">
            {enrollment.paymentMethod
              ? PaymentMethodCopy[enrollment.paymentMethod]
              : "Defina uma forma de pagamento na fase anterior."}
          </p>
        </div>
        <div className="rounded-3xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-900">Valor total</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {currencyFormatter.format(enrollment.totalAmount)}
          </p>
        </div>
        <Button disabled={!canConfirm} onClick={onConfirm} className="rounded-full">
          Confirmar pre matricula
        </Button>
        {enrollment.status !== "DRAFT" && (
          <Alert tone="success">
            Pre matricula enviada. Status atual: {EnrollmentStatusCopy[enrollment.status as EnrollmentStatus]}.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

type ScheduleStepProps = {
  currentDate: string | null;
  status: EnrollmentStatus;
  onSelectDate: (date: Date) => void;
};

function ScheduleStep({ currentDate, status, onSelectDate }: ScheduleStepProps) {
  const [date, setDate] = useState<Date>();

  return (
    <Card className="border-gray-100">
      <CardHeader>
        <CardTitle>Fase 6 - Agendamento presencial</CardTitle>
        <CardDescription>
          Escolha uma data a partir de 05/01/2026 para levar o token e assinar o contrato.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !date && !currentDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date
                ? format(date, "dd/MM/yyyy")
                : currentDate ?? "Escolher data"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(selected) => {
                if (selected) {
                  setDate(selected);
                  onSelectDate(selected);
                }
              }}
              disabled={(day) => day < MIN_CONFIRMATION_DATE}
            />
          </PopoverContent>
        </Popover>
        {currentDate ? (
          <Alert tone="success">
            Data confirmada para {currentDate}. Status atual: {EnrollmentStatusCopy[status]}.
          </Alert>
        ) : (
            <Alert tone="warning">
              Escolha o dia ideal para confirmar presencialmente. Não esqueça e não perca seu token no dia da confirmação.
            </Alert>
        )}
      </CardContent>
    </Card>
  );
}

type ChecklistStepProps = {
  token: string | null;
};

function ChecklistStep({ token }: ChecklistStepProps) {
  return (
    <Card className="border-gray-100">
      <CardHeader>
        <CardTitle>Fase 7 - Checklist presencial</CardTitle>
        <CardDescription>Leve os itens essenciais no dia da confirmação.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-gray-700">
        <ul className="list-disc space-y-2 pl-5">
          <li>Documento oficial com foto (validaremos presencialmente).</li>
          <li>Comprovante de pagamento, se ja tiver realizado.</li>
          <li>
            Token impresso ou no celular: <span className="font-semibold">{token ?? "aguardando"}</span>
          </li>
        </ul>
        <Alert tone="info">
          Não esqueça e não perca o token no dia da confirmação presencial. Em caso de perda, fale com a secretaria informando seu e-mail.
        </Alert>
      </CardContent>
    </Card>
  );
}

function SocialStep() {
  return (
    <Card className="border-gray-100">
      <CardHeader>
        <CardTitle>Fase 8 - Redes sociais</CardTitle>
        <CardDescription>
          Receba lembretes, simulados e comunicados diretamente no Instagram.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Button asChild className="rounded-full">
          <Link href="https://instagram.com" target="_blank">
            Seguir no Instagram
          </Link>
        </Button>
        <Button variant="outline" asChild className="rounded-full">
          <Link href="/painel">Ir para o painel do aluno</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

type PhaseFooterProps = {
  label: string;
  onContinue: () => void;
  disabled?: boolean;
};

function PhaseFooter({ label, onContinue, disabled }: PhaseFooterProps) {
  return (
    <div className="flex items-center justify-end rounded-3xl border border-dashed border-rose-100 bg-white/70 px-6 py-4">
      <Button onClick={onContinue} disabled={disabled} className="rounded-full">
        {label}
      </Button>
    </div>
  );
}

function FormMessage({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}
function determineInitialStep(enrollment: ClientEnrollment) {
  if (!enrollment.age || !enrollment.school || !enrollment.objective) return 2;
  if (!enrollment.selections.length) return 3;
  if (!enrollment.selections.every((sel) => sel.planId) || !enrollment.paymentMethod)
    return 4;
  if (enrollment.status === "DRAFT") return 5;
  if (!enrollment.confirmationDay) return 6;
  return 7;
}

function segmentFromGrade(grade?: string | null): SegmentFilter {
  if (!grade) return "ALL";
  const normalized = normalizeText(grade);
  if (normalized.includes("fundamental")) return "FUNDAMENTAL";
  if (normalized.includes("medio")) return "MEDIO";
  return "ALL";
}

function doesSessionMatchFilter(level: string, filter: SegmentFilter) {
  if (filter === "ALL") return true;
  const normalized = normalizeText(level);
  if (filter === "MEDIO") return normalized.includes("medio");
  return normalized.includes("fundamental");
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[^a-zA-Z\s]/g, "")
    .toLowerCase();
}
