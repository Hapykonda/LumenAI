"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

function safeNextPath(next: string | null) {
  if (!next) return "/panel";
  if (!next.startsWith("/")) return "/panel";
  return next;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [msg, setMsg] = useState("Procesando inicio de sesión…");

  useEffect(() => {
    const run = async () => {
      const code = sp.get("code");
      const next = safeNextPath(sp.get("next"));

      if (!code) {
        router.replace("/login?error=missing_code");
        return;
      }

      // 1) ✅ Exchange en CLIENTE -> guarda sesión en localStorage (supabase-js)
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        router.replace(`/login?error=${encodeURIComponent(error.message)}`);
        return;
      }

      const session =
        data?.session ?? (await supabase.auth.getSession()).data.session;

      if (!session?.access_token || !session?.refresh_token) {
        router.replace("/login?error=no_session_tokens");
        return;
      }

      setMsg("Sincronizando sesión…");

      // 2) ✅ Enviar tokens al SERVER -> guarda cookies SSR
      const res = await fetch("/api/auth/set-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        router.replace(`/login?error=${encodeURIComponent(j?.error ?? "set_session_failed")}`);
        return;
      }

      setMsg("Listo ✅ Entrando…");
      router.replace(next);
    };

    run().catch(() => router.replace("/login?error=callback_failed"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "rgba(10,10,12,0.96)",
        color: "white",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial',
        padding: 24,
      }}
    >
      <div
        style={{
          width: "min(720px, 92vw)",
          padding: 18,
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.04)",
        }}
      >
        <div style={{ fontWeight: 950, fontSize: 16 }}>{msg}</div>
        <div style={{ marginTop: 8, opacity: 0.7, fontSize: 13 }}>
          Si esto se queda pegado, mira la consola del navegador.
        </div>
      </div>
    </main>
  );
}