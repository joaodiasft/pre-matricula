"use client";

import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function AppProvider({ children }: Props) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="light">
        {children}
        <Toaster richColors closeButton theme="light" />
      </ThemeProvider>
    </SessionProvider>
  );
}
