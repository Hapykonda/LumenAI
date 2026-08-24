import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import PanelShell from "./_components/PanelShell";
import { PanelProvider } from "./_components/panel-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  EMPTY_OWNER_PROFILE,
  hasManagedOwnerAvatar,
  ownerProfileAvatarEndpoint,
  ownerProfileFromMetadata,
} from "@/lib/owner-profile";
import { normalizeOperatorId } from "@/lib/operators/catalog";

export default async function PanelLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    redirect("/login?e=no_session");
  }

  let ownerProfile = {
    ...EMPTY_OWNER_PROFILE,
    email: user?.email ?? "",
  };

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_business_id,business_id,role,metadata,updated_at")
    .eq("id", user.id)
    .single();

  const businessId =
    (profile as { active_business_id?: string; business_id?: string } | null)
      ?.active_business_id ??
    (profile as { active_business_id?: string; business_id?: string } | null)
      ?.business_id;

  if (!businessId) {
    redirect("/onboarding");
  }

  const metadata = (profile as { metadata?: unknown } | null)?.metadata;
  ownerProfile = ownerProfileFromMetadata({
    metadata,
    role: (profile as { role?: unknown } | null)?.role,
    email: user.email,
    authMetadata: user.user_metadata,
    ...(hasManagedOwnerAvatar(metadata, {
      businessId,
      userId: user.id,
    })
      ? {
          avatarUrl: ownerProfileAvatarEndpoint(
            (profile as { updated_at?: unknown } | null)?.updated_at,
          ),
        }
      : {}),
  });

  const { data: widgetSettings } = await supabase
    .from("widget_settings")
    .select("operator_id,published_settings")
    .eq("business_id", businessId)
    .maybeSingle();

  const publishedSettings =
    widgetSettings?.published_settings &&
    typeof widgetSettings.published_settings === "object" &&
    !Array.isArray(widgetSettings.published_settings)
      ? (widgetSettings.published_settings as Record<string, unknown>)
      : {};
  const publishedWidget =
    publishedSettings.widget &&
    typeof publishedSettings.widget === "object" &&
    !Array.isArray(publishedSettings.widget)
      ? (publishedSettings.widget as Record<string, unknown>)
      : {};
  const operatorId = normalizeOperatorId(
    widgetSettings?.operator_id ?? publishedWidget.operatorId,
  );

  return (
    <PanelProvider
      userId={user.id}
      businessId={businessId}
      email={user.email ?? null}
      operatorId={operatorId}
    >
      <PanelShell userEmail={user.email} ownerProfile={ownerProfile}>
        {children}
      </PanelShell>
    </PanelProvider>
  );
}
