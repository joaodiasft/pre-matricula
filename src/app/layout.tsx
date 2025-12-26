import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/components/providers/app-provider";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Redas — Pré-matrícula inteligente 2026",
  description:
    "Sistema completo de pré-matrículas para garantir vaga, organizar turmas e confirmar contratos presenciais a partir de janeiro de 2026.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${sans.variable} ${display.variable}`}>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
