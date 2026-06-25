// app/panel/_components/panel-context.tsx
"use client";

import type { ReactNode } from "react";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type PanelCtx = {
  loading: boolean;
  userId: string | null;
  email: string | null;
  businessId: string | null;
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
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
  userId: initialUserId,
  businessId: initialBusinessId,
  email: initialEmail,
}: PanelProviderProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(!(initialUserId && initialBusinessId));
  const [userId, setUserId] = useState<string | null>(initialUserId ?? null);
  const [email, setEmail] = useState<string | null>(initialEmail ?? null);
  const [businessId, setBusinessId] = useState<string | null>(initialBusinessId ?? null);

  const refresh = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false;
      if (!silent) setLoading(true);

      try {
        const { data: u, error: uErr } = await supabase.auth.getUser();
        const user = u?.user;

        if (uErr || !user) {
          // ✅ si veníamos “bien” desde el server, NO expulsamos de inmediato
          // (evita el "veo el panel 2s y me manda a login")
          if (initialUserId && initialBusinessId) {
            if (!silent) setLoading(false);
            return;
          }

          setUserId(null);
          setEmail(null);
          setBusinessId(null);
          if (!silent) setLoading(false);
          router.replace("/login");
          return;
        }

        setUserId(user.id);
        setEmail(user.email ?? null);

        const { data: p, error: pErr } = await supabase
          .from("profiles")
          .select("active_business_id, business_id")
          .eq("id", user.id)
          .single();

        if (pErr) {
          console.error("profiles error:", pErr.message);
          // si ya teníamos business desde server, mantenlo
          if (!initialBusinessId) setBusinessId(null);
          if (!silent) setLoading(false);
          return;
        }

        const bid = (p as any)?.active_business_id ?? (p as any)?.business_id ?? null;
        setBusinessId(bid);

        if (!silent) setLoading(false);

        if (!bid) router.replace("/onboarding");
      } catch (e) {
        console.error("panel refresh error:", e);

        if (initialUserId && initialBusinessId) {
          if (!silent) setLoading(false);
          return;
        }

        setUserId(null);
        setEmail(null);
        setBusinessId(null);
        if (!silent) setLoading(false);
        router.replace("/login");
      }
    },
    [router, initialUserId, initialBusinessId, initialBusinessId]
  );

  useEffect(() => {
    let mounted = true;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    if (initialUserId && initialBusinessId) {
      refreshTimer = setTimeout(() => {
        refresh({ silent: true }).catch(() => {});
      }, 1800);
    } else {
      refresh().catch(() => {});
    }

    let ignoreInitial = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return;

      if (ignoreInitial && event === "INITIAL_SESSION") {
        ignoreInitial = false;
        return;
      }
      ignoreInitial = false;

      refresh({ silent: true }).catch(() => {});
    });

    return () => {
      mounted = false;
      if (refreshTimer) clearTimeout(refreshTimer);
      sub?.subscription?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(() => ({ loading, userId, email, businessId, refresh }), [loading, userId, email, businessId, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePanel() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePanel debe usarse dentro de <PanelProvider>");
  return v;
}
