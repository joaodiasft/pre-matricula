"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  updateEnrollmentStatus,
  updatePaymentStatus,
  updateUserAccount,
} from "@/server/actions/admin";
import { EnrollmentStatusCopy, PaymentStatusCopy } from "@/lib/enrollment";
import { EnrollmentStatus, PaymentStatus } from "@prisma/client";
import { currencyFormatter } from "@/lib/utils";

export type AdminEnrollment = {
  id: string;
  userId: string;
  name: string;
  email: string;
  objective: string | null;
  grade: string | null;
  age: number | null;
  status: EnrollmentStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
  token: string | null;
  totalAmount: number;
  createdAt: string;
  selections: {
    id: string;
    course: string;
    modality: string;
    session: string;
    planLabel: string;
    status: string;
  }[];
};

const statusOptions: EnrollmentStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "WAITING_PAYMENT",
  "CONFIRMED",
  "WAITLISTED",
  "REJECTED",
];

const paymentOptions: PaymentStatus[] = ["PENDING", "CONFIRMED"];

type Filters = {
  status: string;
  payment: string;
  modality: string;
  course: string;
  plan: string;
  objective: string;
  period: "ALL" | "DAY" | "WEEK" | "MONTH";
  search: string;
};

const objectiveLabels: Record<string, string> = {
  ENEM: "ENEM",
  UFG_VESTIBULAR: "UFG / Vestibular",
  REFORCO: "Reforco",
  CONCURSOS: "Concursos",
};

export function AdminTable({ enrollments }: { enrollments: AdminEnrollment[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filters, setFilters] = useState<Filters>({
    status: "ALL",
    payment: "ALL",
    modality: "ALL",
    course: "ALL",
    plan: "ALL",
    objective: "ALL",
    period: "ALL",
    search: "",
  });

  const boundaries = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startOfDay, startOfWeek, startOfMonth };
  }, []);

  const modalityOptions = useMemo(() => {
    return Array.from(
      new Set(
        enrollments.flatMap((enrollment) =>
          enrollment.selections.map((selection) => selection.modality)
        )
      )
    ).sort();
  }, [enrollments]);

  const courseOptions = useMemo(() => {
    return Array.from(
      new Set(
        enrollments.flatMap((enrollment) =>
          enrollment.selections.map((selection) => selection.course)
        )
      )
    ).sort();
  }, [enrollments]);

  const planOptions = useMemo(() => {
    return Array.from(
      new Set(
        enrollments.flatMap((enrollment) =>
          enrollment.selections.map((selection) => selection.planLabel)
        )
      )
    ).sort();
  }, [enrollments]);

  const filteredEnrollments = useMemo(() => {
    return enrollments.filter((enrollment) => {
      const createdAt = new Date(enrollment.createdAt);
      if (filters.status !== "ALL" && enrollment.status !== filters.status) {
        return false;
      }
      if (filters.payment !== "ALL" && enrollment.paymentStatus !== filters.payment) {
        return false;
      }
      if (
        filters.modality !== "ALL" &&
        !enrollment.selections.some((selection) => selection.modality === filters.modality)
      ) {
        return false;
      }
      if (
        filters.course !== "ALL" &&
        !enrollment.selections.some((selection) => selection.course === filters.course)
      ) {
        return false;
      }
      if (
        filters.plan !== "ALL" &&
        !enrollment.selections.some((selection) => selection.planLabel === filters.plan)
      ) {
        return false;
      }
      if (filters.objective !== "ALL" && (enrollment.objective ?? "NONE") !== filters.objective) {
        return false;
      }
      if (filters.period === "DAY" && createdAt < boundaries.startOfDay) {
        return false;
      }
      if (filters.period === "WEEK" && createdAt < boundaries.startOfWeek) {
        return false;
      }
      if (filters.period === "MONTH" && createdAt < boundaries.startOfMonth) {
        return false;
      }
      if (filters.search.trim().length > 0) {
        const query = filters.search.toLowerCase();
        const matchesName = enrollment.name.toLowerCase().includes(query);
        const matchesEmail = enrollment.email.toLowerCase().includes(query);
        const matchesToken = (enrollment.token ?? "").toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesToken) {
          return false;
        }
      }
      return true;
    });
  }, [enrollments, filters, boundaries]);

  const handleStatusChange = (id: string, status: EnrollmentStatus) => {
    startTransition(async () => {
      await updateEnrollmentStatus({ id, status });
      toast.success("Status atualizado.");
      router.refresh();
    });
  };

  const handlePaymentChange = (id: string, status: PaymentStatus) => {
    startTransition(async () => {
      await updatePaymentStatus({ id, status });
      toast.success("Pagamento atualizado.");
      router.refresh();
    });
  };

  const exportCsv = () => {
    const headers = [
      "Aluno",
      "Email",
      "Objetivo",
      "Status",
      "Pagamento",
      "Token",
      "Total",
      "Cursos",
    ];
    const rows = filteredEnrollments.map((enrollment) => [
      enrollment.name,
      enrollment.email,
      enrollment.objective ?? "Sem objetivo",
      EnrollmentStatusCopy[enrollment.status],
      PaymentStatusCopy[enrollment.paymentStatus],
      enrollment.token ?? "Aguardando",
      String(enrollment.totalAmount),
      enrollment.selections
        .map((selection) => `${selection.course} (${selection.session}) - ${selection.planLabel}`)
        .join(" | "),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pre-matriculas-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resetFilters = () =>
    setFilters({
      status: "ALL",
      payment: "ALL",
      modality: "ALL",
      course: "ALL",
      plan: "ALL",
      objective: "ALL",
      period: "ALL",
      search: "",
    });

  return (
    <div className="space-y-4 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="space-y-3 rounded-2xl border border-dashed border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase text-gray-500">
          <span>Filtros rapidos</span>
          <Button variant="ghost" size="sm" onClick={resetFilters} className="rounded-full text-xs">
            Limpar filtros
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            placeholder="Buscar por nome, email ou token"
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
          />
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os status</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {EnrollmentStatusCopy[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.payment}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, payment: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pagamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos pagamentos</SelectItem>
              {paymentOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {PaymentStatusCopy[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.modality}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, modality: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Modalidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas modalidades</SelectItem>
              {modalityOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.course}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, course: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Curso" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os cursos</SelectItem>
              {courseOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.plan}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, plan: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Plano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os planos</SelectItem>
              {planOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.objective}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, objective: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Objetivo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos objetivos</SelectItem>
              {Object.entries(objectiveLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
              <SelectItem value="NONE">Sem objetivo</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.period}
            onValueChange={(value: Filters["period"]) =>
              setFilters((prev) => ({ ...prev, period: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todo periodo</SelectItem>
              <SelectItem value="DAY">Hoje</SelectItem>
              <SelectItem value="WEEK">Esta semana</SelectItem>
              <SelectItem value="MONTH">Este mes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
        <p>
          {filteredEnrollments.length} de {enrollments.length} pre-matriculas exibidas
        </p>
        <Button variant="outline" size="sm" onClick={exportCsv} className="rounded-full">
          Exportar CSV
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Aluno</TableHead>
            <TableHead>Cursos</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Pagamento</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Token</TableHead>
          <TableHead>Cadastro</TableHead>
        </TableRow>
      </TableHeader>
        <TableBody>
          {filteredEnrollments.map((enrollment) => (
            <TableRow key={enrollment.id}>
              <TableCell>
                <div className="font-semibold">{enrollment.name}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(enrollment.createdAt).toLocaleDateString()}
                  {enrollment.objective
                    ? ` - ${objectiveLabels[enrollment.objective] ?? enrollment.objective}`
                    : ""}
                  {enrollment.age ? ` - ${enrollment.age} anos` : ""}
                  {enrollment.grade ? ` - ${enrollment.grade}` : ""}
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-2 text-sm text-gray-700">
                  {enrollment.selections.map((selection) => (
                    <div key={selection.id}>
                      <p className="font-medium">{selection.course}</p>
                      <p className="text-xs text-muted-foreground">
                        {selection.session} - {selection.planLabel}
                      </p>
                    </div>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <Select
                  value={enrollment.status}
                  onValueChange={(value: EnrollmentStatus) =>
                    handleStatusChange(enrollment.id, value)
                  }
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {EnrollmentStatusCopy[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Select
                  value={enrollment.paymentStatus}
                  onValueChange={(value: PaymentStatus) =>
                    handlePaymentChange(enrollment.id, value)
                  }
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {PaymentStatusCopy[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  {enrollment.paymentMethod ?? "sem forma definida"}
                </p>
              </TableCell>
              <TableCell>{currencyFormatter.format(enrollment.totalAmount)}</TableCell>
              <TableCell>
                <Badge variant="outline">{enrollment.token ?? "Aguardando"}</Badge>
              </TableCell>
              <TableCell>
                <EditUserDialog enrollment={enrollment} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

type EditUserDialogProps = {
  enrollment: AdminEnrollment;
};

function EditUserDialog({ enrollment }: EditUserDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(enrollment.name);
  const [email, setEmail] = useState(enrollment.email);
  const [password, setPassword] = useState("");
  const [isSaving, startTransition] = useTransition();

  const resetForm = () => {
    setName(enrollment.name);
    setEmail(enrollment.email);
    setPassword("");
  };

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (value) {
      resetForm();
    }
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) {
      toast.error("Nome e email sao obrigatorios.");
      return;
    }

    startTransition(async () => {
      const response = await updateUserAccount({
        userId: enrollment.userId,
        name: trimmedName,
        email: trimmedEmail,
        password: password ? password : undefined,
      });
      if (response?.error) {
        toast.error(response.error);
        return;
      }
      toast.success("Cadastro atualizado!");
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full">
          Editar cadastro
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Atualizar cadastro</DialogTitle>
          <DialogDescription>
            Ajuste nome, email ou gere uma nova senha para este aluno.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label requiredMark>Nome completo</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label requiredMark>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Nova senha (opcional)</Label>
            <Input
              type="password"
              placeholder="Deixe em branco para manter"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Envie manualmente a nova senha ao aluno. Ela substituira a anterior.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="ghost"
            onClick={() => {
              setOpen(false);
            }}
            className="rounded-full"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-full"
          >
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
