import type { ReactNode } from "react";
import {
  BotMessageSquare,
  BrainCircuit,
  Eye,
  HeartPulse,
  Search,
  ShieldCheck,
  WandSparkles,
  LayoutDashboard,
  MessagesSquare,
  Palette,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { LUMENAI_PILLAR_BY_ID } from "@/lib/lumenai/pillars";

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
    label: LUMENAI_PILLAR_BY_ID.overview.label,
    href: LUMENAI_PILLAR_BY_ID.overview.href,
    desc: LUMENAI_PILLAR_BY_ID.overview.responsibility,
    group: "center",
    icon: Icon(LayoutDashboard),
  },
  {
    label: LUMENAI_PILLAR_BY_ID.calibration.label,
    href: LUMENAI_PILLAR_BY_ID.calibration.href,
    desc: LUMENAI_PILLAR_BY_ID.calibration.responsibility,
    group: "builder",
    icon: Icon(SlidersHorizontal),
  },
  {
    label: LUMENAI_PILLAR_BY_ID["config-ai"].label,
    href: LUMENAI_PILLAR_BY_ID["config-ai"].href,
    desc: LUMENAI_PILLAR_BY_ID["config-ai"].responsibility,
    group: "builder",
    icon: Icon(WandSparkles),
  },
  {
    label: LUMENAI_PILLAR_BY_ID["lumen-eye"].label,
    href: LUMENAI_PILLAR_BY_ID["lumen-eye"].href,
    desc: LUMENAI_PILLAR_BY_ID["lumen-eye"].responsibility,
    group: "builder",
    icon: Icon(Eye),
  },
  {
    label: LUMENAI_PILLAR_BY_ID["pulse-radar"].label,
    href: LUMENAI_PILLAR_BY_ID["pulse-radar"].href,
    desc: LUMENAI_PILLAR_BY_ID["pulse-radar"].responsibility,
    group: "builder",
    icon: Icon(HeartPulse),
  },
  {
    label: LUMENAI_PILLAR_BY_ID.research.label,
    href: LUMENAI_PILLAR_BY_ID.research.href,
    desc: LUMENAI_PILLAR_BY_ID.research.responsibility,
    group: "builder",
    icon: Icon(Search),
  },
  {
    label: LUMENAI_PILLAR_BY_ID.widget.label,
    href: LUMENAI_PILLAR_BY_ID.widget.href,
    desc: LUMENAI_PILLAR_BY_ID.widget.responsibility,
    group: "operation",
    icon: Icon(BotMessageSquare),
  },
  {
    label: LUMENAI_PILLAR_BY_ID.chats.label,
    href: LUMENAI_PILLAR_BY_ID.chats.href,
    desc: LUMENAI_PILLAR_BY_ID.chats.responsibility,
    group: "operation",
    icon: Icon(MessagesSquare),
  },
  {
    label: LUMENAI_PILLAR_BY_ID.knowledge.label,
    href: LUMENAI_PILLAR_BY_ID.knowledge.href,
    desc: LUMENAI_PILLAR_BY_ID.knowledge.responsibility,
    group: "operation",
    icon: Icon(BrainCircuit),
  },
  {
    label: LUMENAI_PILLAR_BY_ID.interface.label,
    href: LUMENAI_PILLAR_BY_ID.interface.href,
    desc: LUMENAI_PILLAR_BY_ID.interface.responsibility,
    group: "system",
    icon: Icon(Palette),
  },
  { label: LUMENAI_PILLAR_BY_ID.access.label, href: LUMENAI_PILLAR_BY_ID.access.href, desc: LUMENAI_PILLAR_BY_ID.access.responsibility, group: "system", icon: Icon(ShieldCheck) },
];

export const PANEL_NAV_GROUP_LABELS: Record<NavGroup, string> = {
  center: "Comando",
  builder: "Inteligencia",
  operation: "Operación",
  system: "Sistema",
};
