import type { ReactNode } from "react";
import "./panel-editorial.css";
import PanelShell from "./_components/PanelShell";
import { PanelProvider } from "./_components/panel-context";
import { requireBusiness } from "@/lib/supabase/lumen/requireBusiness";
import {
  EMPTY_OWNER_PROFILE,
  hasManagedOwnerAvatar,
  isRecord,
  ownerProfileAvatarEndpoint,
  ownerProfileFromMetadata,
} from "@/lib/owner-profile";
import { normalizeInterfacePreferences } from "@/lib/interface-preferences";

export default async function PanelLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, businessId, context } = await requireBusiness();
  const supabase = context.admin;

  let ownerProfile = {
    ...EMPTY_OWNER_PROFILE,
    email: user?.email ?? "",
  };

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_business_id,business_id,role,metadata,updated_at")
    .eq("id", user.id)
    .single();

  const metadata = (profile as { metadata?: unknown } | null)?.metadata;
  const interfacePreferences = normalizeInterfacePreferences(
    isRecord(metadata) ? metadata.interface_preferences : null,
  );
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

  return (
    <PanelProvider
      userId={user.id}
      businessId={businessId}
      email={user.email ?? null}
      operatorId={interfacePreferences.operatorId}
    >
      <PanelShell
        userEmail={user.email}
        ownerProfile={ownerProfile}
        interfacePreferences={interfacePreferences}
        privateAdmin={context.accessMode === "private-admin"}
      >
        {children}
      </PanelShell>
    </PanelProvider>
  );
}
