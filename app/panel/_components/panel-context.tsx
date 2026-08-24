"use client";

import type { ReactNode } from "react";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { normalizeOperatorId, type OperatorId } from "@/lib/operators/catalog";

export const PANEL_OPERATOR_EVENT = "lumenai:operator-update";

type PanelCtx = {
  loading: boolean;
  userId: string | null;
  email: string | null;
  businessId: string | null;
  operatorId: OperatorId;
};

const Ctx = createContext<PanelCtx | null>(null);

type PanelProviderProps = {
  children: ReactNode;
  userId?: string;
  businessId?: string;
  email?: string | null;
  operatorId?: OperatorId | string | null;
};

export function PanelProvider({
  children,
  userId,
  businessId,
  email,
  operatorId: initialOperatorId,
}: PanelProviderProps) {
  const [operatorId, setOperatorId] = useState<OperatorId>(() =>
    normalizeOperatorId(initialOperatorId),
  );

  useEffect(() => {
    const handleOperatorChange = (event: Event) => {
      const detail = (event as CustomEvent<{ operatorId?: unknown }>).detail;
      setOperatorId(normalizeOperatorId(detail?.operatorId));
    };

    window.addEventListener(PANEL_OPERATOR_EVENT, handleOperatorChange);
    return () => window.removeEventListener(PANEL_OPERATOR_EVENT, handleOperatorChange);
  }, []);

  const value = useMemo(
    () => ({
      loading: false,
      userId: userId ?? null,
      email: email ?? null,
      businessId: businessId ?? null,
      operatorId,
    }),
    [businessId, email, operatorId, userId],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePanel() {
  const value = useContext(Ctx);
  if (!value) throw new Error("usePanel debe usarse dentro de <PanelProvider>");
  return value;
}
