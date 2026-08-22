"use client";

import type { ReactNode } from "react";

type SectionIntroGateProps = {
  title: ReactNode;
  description: ReactNode;
  bullets: string[];
  primaryActionLabel?: string;
  skipActionLabel?: string;
  storageKey: string;
  children: ReactNode;
  reverseLayout?: boolean;
};

export default function SectionIntroGate({ children }: SectionIntroGateProps) {
  return <>{children}</>;
}
