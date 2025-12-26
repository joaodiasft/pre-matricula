import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(3, "Informe seu nome completo"),
  email: z.string().email("Email inválido").transform((value) => value.toLowerCase()),
  password: z.string().min(6, "Senha precisa de no mínimo 6 caracteres"),
  confirmPassword: z.string().min(6),
});

export type RegisterInput = z.infer<typeof registerSchema>;
