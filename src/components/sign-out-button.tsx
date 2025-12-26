"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

type Props = {
  variant?: "default" | "outline";
};

export function SignOutButton({ variant = "outline" }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    if (isPending) return;
    startTransition(async () => {
      await signOut({ callbackUrl: "/" });
    });
  };

  return (
    <Button
      variant={variant}
      onClick={handleSignOut}
      disabled={isPending}
      className="rounded-full"
    >
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Saindo...
        </>
      ) : (
        "Sair"
      )}
    </Button>
  );
}
