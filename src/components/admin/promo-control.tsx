"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { setRedacaoBonusAwarded } from "@/server/actions/admin";

type Props = {
  awarded: number;
  limit: number;
};

export function PromoControl({ awarded, limit }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(String(awarded));
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > limit) {
      toast.error(`Informe um valor entre 0 e ${limit}.`);
      return;
    }

    startTransition(async () => {
      await setRedacaoBonusAwarded(parsed);
      toast.success("Contador ajustado.");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-rose-100 bg-rose-50/60 p-4">
      <div>
        <p className="text-sm font-semibold text-rose-700">
          Ajustar bonus Redacao + Gramatica
        </p>
        <p className="text-xs text-rose-600">
          Defina quantos bonus ja foram concedidos (limite {limit}).
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="number"
          min={0}
          max={limit}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="max-w-[120px]"
        />
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isPending}
          className="rounded-full"
        >
          Salvar ajuste
        </Button>
      </div>
    </div>
  );
}
