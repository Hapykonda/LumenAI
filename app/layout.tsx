import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./lumenai-obsidian.css";

export const metadata: Metadata = {
  title: {
    default: "LumenAI Obsidian Intelligence OS",
    template: "%s | LumenAI",
  },
  description:
    "Sistema de inteligencia comercial y soporte para observar senales, priorizar oportunidades y actuar con contexto.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning className="font-sans">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "var(--lmn-bg, #050607)",
          color: "var(--lmn-text, #F5F7FA)",
        }}
      >
        {children}
      </body>
    </html>
  );
}
