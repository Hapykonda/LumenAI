"use client";

import type { ReactNode } from "react";
import React, { createContext, useContext, useMemo } from "react";

type PanelCtx = {
  loading: boolean;
  userId: string | null;
  email: string | null;
  businessId: string | null;
};

const Ctx = createContext<PanelCtx | null>(null);

type PanelProviderProps = {
  children: ReactNode;
  userId?: string;
  businessId?: string;
  email?: string | null;
};

export function PanelProvider({
  children,
  userId,
  businessId,
  email,
}: PanelProviderProps) {
  const value = useMemo(
    () => ({
      loading: false,
      userId: userId ?? null,
      email: email ?? null,
      businessId: businessId ?? null,
    }),
    [businessId, email, userId],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePanel() {
  const value = useContext(Ctx);
  if (!value) throw new Error("usePanel debe usarse dentro de <PanelProvider>");
  return value;
}
