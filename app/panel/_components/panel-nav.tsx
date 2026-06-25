import type { ReactNode } from "react";
import {
  BotMessageSquare,
  BrainCircuit,
  WandSparkles,
  LayoutDashboard,
  MessagesSquare,
  Palette,
  SlidersHorizontal,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type NavGroup = "center" | "builder" | "operation" | "system";

export type NavItem = {
  label: string;
  href: string;
  desc?: string;
  soon?: boolean;
  group?: NavGroup;
  icon?: ReactNode;
};

function Icon(Glyph: LucideIcon): ReactNode {
  return (
    <span className="lmn-nav-icon" aria-hidden="true">
      <Glyph size={15} strokeWidth={1.85} />
    </span>
  );
}

export function isPanelActive(pathname: string, href: string) {
  if (href === "/panel/overview") {
    return pathname === "/panel" || pathname === "/panel/overview";
  }

  return pathname === href || pathname.startsWith(href + "/");
}

export const PANEL_NAV: NavItem[] = [
  {
    label: "Inicio",
    href: "/panel/overview",
    desc: "Centro de mando",
    group: "center",
    icon: Icon(LayoutDashboard),
  },
  {
    label: "Calibracion",
    href: "/panel/calibration",
    desc: "IA, ventas y reglas",
    group: "center",
    icon: Icon(SlidersHorizontal),
  },
  {
    label: "Config IA",
    href: "/panel/autoconfig",
    desc: "Configurar hablando",
    group: "center",
    icon: Icon(WandSparkles),
  },
  {
    label: "Knowledge",
    href: "/panel/knowledge",
    desc: "Cerebro del negocio",
    group: "builder",
    icon: Icon(BrainCircuit),
  },
  {
    label: "Chat",
    href: "/panel/chat",
    desc: "Conversaciones reales",
    group: "operation",
    icon: Icon(MessagesSquare),
  },
  {
    label: "Leads",
    href: "/panel/leads",
    desc: "Oportunidades comerciales",
    group: "operation",
    icon: Icon(UsersRound),
  },
  {
    label: "Widget",
    href: "/panel/widget",
    desc: "Instalacion publica",
    group: "operation",
    icon: Icon(BotMessageSquare),
  },
  {
    label: "Settings",
    href: "/panel/settings",
    desc: "Ajustes tipo iOS",
    group: "system",
    icon: Icon(Palette),
  },
];

export const PANEL_NAV_GROUP_LABELS: Record<NavGroup, string> = {
  center: "Principal",
  builder: "Base IA",
  operation: "Operacion",
  system: "Sistema",
};
