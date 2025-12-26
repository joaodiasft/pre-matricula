"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  setSessionWaitlistOnly,
  updateSessionDetails,
} from "@/server/actions/admin";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SessionRow = {
  id: string;
  code: string;
  course: string;
  modality: string;
  weekday: string;
  time: string;
  startTime: string;
  endTime: string;
  level: string;
  capacity: number;
  reserved: number;
  available: number;
  waitlist: number;
};

type SessionFormValue = {
  capacity: string;
  weekday: string;
  startTime: string;
  endTime: string;
  level: string;
};

export function CapacityManager({ sessions }: { sessions: SessionRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<Record<string, SessionFormValue>>(() =>
    Object.fromEntries(
      sessions.map((session) => [
        session.id,
        {
          capacity: String(session.capacity),
          weekday: session.weekday,
          startTime: session.startTime,
          endTime: session.endTime,
          level: session.level || "Fundamental",
        },
      ])
    )
  );

  useEffect(() => {
    setValues(
      Object.fromEntries(
        sessions.map((session) => [
          session.id,
          {
            capacity: String(session.capacity),
            weekday: session.weekday,
            startTime: session.startTime,
            endTime: session.endTime,
            level: session.level || "Fundamental",
          },
        ])
      )
    );
  }, [sessions]);

  const totalReserved = useMemo(
    () => sessions.reduce((sum, session) => sum + session.reserved, 0),
    [sessions]
  );

  const totalAvailable = useMemo(
    () => sessions.reduce((sum, session) => sum + session.available, 0),
    [sessions]
  );

  const handleChange = (
    sessionId: string,
    field: keyof SessionFormValue,
    value: string
  ) => {
    setValues((prev) => ({
      ...prev,
      [sessionId]: {
        ...(prev[sessionId] ?? {
          capacity: "",
          weekday: "",
          startTime: "",
          endTime: "",
          level: "Fundamental",
        }),
        [field]: value,
      },
    }));
  };

  const handleSave = (sessionId: string) => {
    const current = values[sessionId];
    if (!current) return;

    const parsed = Number(current.capacity);
    if (!Number.isFinite(parsed) || parsed < 1) {
      toast.error("Informe um numero valido maior que zero.");
      return;
    }

    if (
      !current.weekday.trim() ||
      !current.startTime.trim() ||
      !current.endTime.trim() ||
      !current.level.trim()
    ) {
      toast.error("Dia, horario e nivel nao podem ficar vazios.");
      return;
    }

    startTransition(async () => {
      await updateSessionDetails({
        sessionId,
        capacity: parsed,
        weekday: current.weekday.trim(),
        startTime: current.startTime.trim(),
        endTime: current.endTime.trim(),
        level: current.level.trim(),
      });
      toast.success("Sessao atualizada.");
      router.refresh();
    });
  };

  const handleWaitlistOnly = (sessionId: string) => {
    startTransition(async () => {
      await setSessionWaitlistOnly(sessionId);
      toast.success("Turma marcada como espera sem vagas.");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">Gestao de vagas por turma</p>
          <p className="text-xs text-muted-foreground">
            Ajuste a capacidade oficial de cada sessao considerando reservas e lista de espera.
          </p>
        </div>
        <div className="flex gap-3 text-sm text-gray-700">
          <span>
            <strong>{totalReserved}</strong> reservadas
          </span>
          <span>
            <strong>{totalAvailable}</strong> livres
          </span>
        </div>
      </div>
      <div className="overflow-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="py-2 pr-4">Turma</th>
              <th className="py-2 pr-4 text-center">Nivel</th>
              <th className="py-2 pr-4 text-center">Dia</th>
              <th className="py-2 pr-4 text-center">Início</th>
              <th className="py-2 pr-4 text-center">Fim</th>
              <th className="py-2 pr-4 text-center">Capacidade</th>
              <th className="py-2 pr-4 text-center">Reservadas</th>
              <th className="py-2 pr-4 text-center">Disponiveis</th>
              <th className="py-2 pr-4 text-center">Lista de espera</th>
              <th className="py-2 pr-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sessions.map((session) => (
              <tr key={session.id} className="align-top">
                <td className="py-3 pr-4">
                  <p className="font-semibold text-gray-900">
                    {session.course} ({session.code})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {session.weekday} - {session.time}
                  </p>
                </td>
                <td className="py-3 pr-4 align-middle">
                  <div className="flex justify-center">
                    <Select
                      value={values[session.id]?.level || undefined}
                      onValueChange={(newValue) => handleChange(session.id, "level", newValue)}
                    >
                      <SelectTrigger className="h-10 w-36 rounded-full border-gray-200">
                        <SelectValue placeholder="Selecione o nivel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fundamental">Fundamental</SelectItem>
                        <SelectItem value="Ensino medio">Ensino medio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </td>
                <td className="py-3 pr-4 align-middle">
                  <Input
                    className="h-10 w-32 rounded-full border-gray-200 text-center"
                    value={values[session.id]?.weekday ?? ""}
                    onChange={(event) =>
                      handleChange(session.id, "weekday", event.target.value)
                    }
                  />
                </td>
                <td className="py-3 pr-4 align-middle">
                  <Input
                    type="time"
                    className="h-10 w-28 rounded-full border-gray-200 text-center"
                    value={values[session.id]?.startTime ?? ""}
                    onChange={(event) =>
                      handleChange(session.id, "startTime", event.target.value)
                    }
                  />
                </td>
                <td className="py-3 pr-4 align-middle">
                  <Input
                    type="time"
                    className="h-10 w-28 rounded-full border-gray-200 text-center"
                    value={values[session.id]?.endTime ?? ""}
                    onChange={(event) =>
                      handleChange(session.id, "endTime", event.target.value)
                    }
                  />
                </td>
                <td className="py-3 pr-4 align-middle">
                  <Input
                    type="number"
                    min={1}
                    className="h-10 w-24 rounded-full border-gray-200 text-center"
                    value={values[session.id]?.capacity ?? ""}
                    onChange={(event) =>
                      handleChange(session.id, "capacity", event.target.value)
                    }
                  />
                </td>
                <td className="py-3 pr-4 align-middle">
                  <div className="flex justify-center">
                    <Badge variant="secondary" className="rounded-full px-3 py-1">
                      {session.reserved}
                    </Badge>
                  </div>
                </td>
                <td className="py-3 pr-4 align-middle">
                  <div className="flex justify-center">
                    <Badge variant="success" className="rounded-full px-3 py-1">
                      {session.available}
                    </Badge>
                  </div>
                </td>
                <td className="py-3 pr-4 align-middle">
                  <div className="flex justify-center">
                    {session.waitlist > 0 ? (
                      <Badge variant="warning" className="rounded-full px-3 py-1">
                        {session.waitlist}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="rounded-full px-3 py-1">
                        0
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="py-3 pr-4 text-right align-middle">
                  <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => handleWaitlistOnly(session.id)}
                      className="h-9 rounded-full px-4"
                    >
                      Sem vagas
                    </Button>
                    <Button
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleSave(session.id)}
                      className="h-9 rounded-full px-6"
                    >
                      Salvar
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
