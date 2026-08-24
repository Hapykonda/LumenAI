export type Role = "user" | "assistant";

export type Msg = {
  id: string;
  role: Role;
  content: string;
  ts: number;
};

export type WidgetTheme = {
  primaryColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  fontFamily?: string;
  radius?: number;
  blurStrength?: number;
  surfaceOpacity?: number;
  glowStrength?: number;
  launcherText?: string;
};

export type WidgetConfig = {
  businessName?: string | null;
  widgetEnabled?: boolean;
  greeting?: string | null;
  assistantName?: string | null;
  operatorId?: string | null;
  tone?: string | null;
  position?: "br" | "bl" | "tr" | "tl";
  theme?: WidgetTheme;

  whatsapp?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  brandLogoUrl?: string | null;

  // compat snake_case
  primary_color?: string | null;
  assistant_name?: string | null;
  operator_id?: string | null;
  business_name?: string | null;
  widget_enabled?: boolean;
  avatar_url?: string | null;
  logo_url?: string | null;

  // seguridad postMessage
  allowedParentOrigin?: string | null;
  quickActions?: string[];
};
