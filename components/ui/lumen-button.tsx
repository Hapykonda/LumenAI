import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type LumenButtonVariant = "primary" | "secondary" | "ghost" | "subtle" | "danger" | "icon";

type LumenButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: LumenButtonVariant;
};

export function LumenButton({
  children,
  className,
  variant = "secondary",
  type = "button",
  ...props
}: LumenButtonProps) {
  return (
    <button
      {...props}
      className={cn("lmn-button", `is-${variant}`, className)}
      data-variant={variant}
      type={type}
    >
      {children}
    </button>
  );
}
