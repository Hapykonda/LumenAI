import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./lumenai-obsidian.css";
import "./lumenai-product.css";
import "./lumenai-studio.css";
import "./lumenai-agency.css";
import "./lumenai-editorial.css";

export const metadata: Metadata = {
  title: {
    default: "LumenAI — Inteligencia operativa para empresas",
    template: "%s | LumenAI",
  },
  description:
    "Atención, ventas, conocimiento e inteligencia empresarial conectados en un sistema vivo guiado por Pulse.",
  applicationName: "LumenAI",
  keywords: [
    "inteligencia artificial para empresas",
    "asistente para pymes",
    "chatbot empresarial",
    "ventas con IA",
    "soporte con IA",
  ],
  openGraph: {
    title: "LumenAI — Tu negocio convertido en un sistema vivo",
    description:
      "Conecta atención, ventas, conocimiento y decisiones con Pulse y LumenAI.",
    type: "website",
    locale: "es_CL",
  },
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
