import type { ReactNode } from "react";
import PanelShell from "./_components/PanelShell";
import { PanelProvider } from "./_components/panel-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function PanelLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  let businessId: string | undefined;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("active_business_id, business_id")
      .eq("id", user.id)
      .single();

    businessId =
      (profile as { active_business_id?: string; business_id?: string } | null)
        ?.active_business_id ??
      (profile as { active_business_id?: string; business_id?: string } | null)
        ?.business_id;
  }

  return (
    <PanelProvider
      userId={user?.id}
      businessId={businessId}
      email={user?.email ?? null}
    >
      <PanelShell userEmail={user?.email}>{children}</PanelShell>
    </PanelProvider>
  );
}
