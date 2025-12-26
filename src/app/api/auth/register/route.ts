import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators/auth";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const parsed = registerSchema.safeParse(data);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    if (parsed.data.password !== parsed.data.confirmPassword) {
      return NextResponse.json(
        { error: { confirmPassword: ["Senhas não conferem"] } },
        { status: 422 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (existing) {
      return NextResponse.json(
        { error: { email: ["Este email já está em uso"] } },
        { status: 409 }
      );
    }

    const password = await hash(parsed.data.password, 10);

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        password,
        profile: {
          create: {},
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível criar sua conta agora." },
      { status: 500 }
    );
  }
}
