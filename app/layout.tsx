import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "LumenAI",
  description: "LumenAI",
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
          background: "#05070B",
          color: "#F5F7FA",
        }}
      >
        {children}
      </body>
    </html>
  );
}
