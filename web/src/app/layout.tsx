import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ScrollToTopOnRouteChange } from "@/components/ScrollToTopOnRouteChange";
import "./globals.css";

export const metadata: Metadata = {
  title: "Профиль Успеха",
  description: "HR-скрининг кандидатов",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ru" className="antialiased">
      <body className="flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground font-sans">
        <ScrollToTopOnRouteChange />
        {children}
      </body>
    </html>
  );
}

