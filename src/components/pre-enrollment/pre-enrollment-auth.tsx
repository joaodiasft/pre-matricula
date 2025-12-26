"use client";

import { ReactNode, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { registerSchema } from "@/lib/validators/auth";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Informe sua senha"),
});

export function AuthTabs() {
  return (
    <Tabs defaultValue="register" className="rounded-3xl border bg-white p-6">
      <TabsList className="mb-6">
        <TabsTrigger value="register">Criar conta</TabsTrigger>
        <TabsTrigger value="login">Já tenho conta</TabsTrigger>
      </TabsList>
      <TabsContent value="register">
        <RegisterForm />
      </TabsContent>
      <TabsContent value="login">
        <LoginForm />
      </TabsContent>
    </Tabs>
  );
}

function RegisterForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });

        if (!response.ok) {
          const payload = await response.json();
          toast.error("Verifique os dados informados.");
          if (payload.error) {
            Object.entries(payload.error).forEach(([key, messages]) => {
              form.setError(key as keyof typeof values, {
                message: Array.isArray(messages) ? messages[0] : messages,
              });
            });
          }
          return;
        }

        await signIn("credentials", {
          email: values.email,
          password: values.password,
          redirect: false,
        });
        toast.success("Conta criada com sucesso.");
        router.refresh();
      } catch {
        toast.error("Não foi possível criar sua conta agora.");
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-2">
        <FieldHint>Digite nome e sobrenome exatamente como aparecem no documento.</FieldHint>
        <Label requiredMark>Nome completo</Label>
        <Input placeholder="Ex: Maria Andrade" {...form.register("name")} />
        <FormMessage message={form.formState.errors.name?.message} />
      </div>
      <div className="grid gap-2">
        <FieldHint>Digite o email que voce acessa todos os dias; enviaremos alertas e o token por ele.</FieldHint>
        <Label requiredMark>Email</Label>
        <Input
          type="email"
          placeholder="seuemail@email.com"
          {...form.register("email")}
        />
        <FormMessage message={form.formState.errors.email?.message} />
      </div>
      <div className="grid gap-2">
        <FieldHint>Crie uma senha com ao menos 6 caracteres misturando letras e numeros.</FieldHint>
        <Label requiredMark>Senha</Label>
        <Input
          type="password"
          placeholder="mínimo 6 caracteres"
          {...form.register("password")}
        />
        <FormMessage message={form.formState.errors.password?.message} />
      </div>
      <div className="grid gap-2">
        <FieldHint>Digite a mesma senha novamente para confirmar antes de salvar.</FieldHint>
        <Label requiredMark>Confirmar senha</Label>
        <Input type="password" {...form.register("confirmPassword")} />
        <FormMessage message={form.formState.errors.confirmPassword?.message} />
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        Criar minha conta
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Seus dados ficam salvos e você pode continuar o processo quando quiser.
      </p>
    </form>
  );
}

function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await signIn("credentials", {
        ...values,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Email ou senha inválidos.");
        return;
      }

      toast.success("Bem-vindo de volta!");
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-2">
        <FieldHint>Digite o mesmo email informado durante o cadastro.</FieldHint>
        <Label requiredMark>Email</Label>
        <Input
          type="email"
          placeholder="seuemail@email.com"
          {...form.register("email")}
        />
        <FormMessage message={form.formState.errors.email?.message} />
      </div>
      <div className="grid gap-2">
        <FieldHint>Digite a senha criada na fase 1; se nao lembrar, fale com a secretaria.</FieldHint>
        <Label requiredMark>Senha</Label>
        <Input type="password" {...form.register("password")} />
        <FormMessage message={form.formState.errors.password?.message} />
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        Entrar e continuar
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Esqueceu a senha? Entre em contato com a secretaria para redefinir.
      </p>
    </form>
  );
}

function FieldHint({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

function FormMessage({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}
