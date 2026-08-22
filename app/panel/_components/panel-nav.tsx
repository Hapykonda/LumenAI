import type { ReactNode } from "react";
import {
  BotMessageSquare,
  BrainCircuit,
  Eye,
  GitBranch,
  HeartPulse,
  Megaphone,
  Newspaper,
  Paintbrush,
  Search,
  TrendingUp,
  WandSparkles,
  LayoutDashboard,
  ListChecks,
  MessagesSquare,
  Palette,
  PlugZap,
  SlidersHorizontal,
  ShieldCheck,
  UsersRound,
  Workflow,
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
    label: "Lumenite",
    href: "/panel/lumenite",
    desc: "Planes y acciones",
    group: "center",
    icon: Icon(Workflow),
  },
  {
    label: "Aprobaciones",
    href: "/panel/approvals",
    desc: "Decisiones y ejecuciones",
    group: "center",
    icon: Icon(ListChecks),
  },
  {
    label: "Permisos",
    href: "/panel/permissions",
    desc: "Autonomia y politicas",
    group: "center",
    icon: Icon(ShieldCheck),
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
    label: "Radar",
    href: "/panel/radar",
    desc: "Senales ejecutivas",
    group: "builder",
    icon: Icon(Newspaper),
  },
  {
    label: "Lumen Eye",
    href: "/panel/lumen-eye",
    desc: "Ojo inteligente",
    group: "builder",
    icon: Icon(Eye),
  },
  {
    label: "Research",
    href: "/panel/research",
    desc: "Motor de investigacion",
    group: "builder",
    icon: Icon(Search),
  },
  {
    label: "Growth",
    href: "/panel/growth",
    desc: "Oportunidades con IA",
    group: "builder",
    icon: Icon(TrendingUp),
  },
  {
    label: "Business Twin",
    href: "/panel/twin",
    desc: "Simular decisiones",
    group: "builder",
    icon: Icon(GitBranch),
  },
  {
    label: "Campaigns",
    href: "/panel/campaigns",
    desc: "Campanas listas",
    group: "builder",
    icon: Icon(Megaphone),
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
    label: "Integraciones",
    href: "/panel/integrations",
    desc: "Conexiones autorizadas",
    group: "operation",
    icon: Icon(PlugZap),
  },
  {
    label: "Ajustes",
    href: "/panel/settings",
    desc: "Perfil y preferencias",
    group: "system",
    icon: Icon(Palette),
  },
  {
    label: "Apariencia",
    href: "/panel/color-mix",
    desc: "Tema y acentos",
    group: "system",
    icon: Icon(Paintbrush),
  },
  {
    label: "Salud",
    href: "/panel/system-health",
    desc: "QA operativo",
    group: "system",
    icon: Icon(HeartPulse),
  },
];

export const PANEL_NAV_GROUP_LABELS: Record<NavGroup, string> = {
  center: "Principal",
  builder: "Inteligencia",
  operation: "Operacion",
  system: "Sistema",
};
