import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const accentA = "var(--lmn-accent-rgb, 0,229,255)";
const accentB = "var(--lmn-accent-2-rgb, 27,67,255)";

type BaseProps = {
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
};

type ButtonProps = BaseProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: never;
  };

type LinkProps = BaseProps & {
  href: string;
};

type ActionButtonProps = ButtonProps | LinkProps;

function isLinkProps(props: ActionButtonProps): props is LinkProps {
  return typeof (props as { href?: unknown }).href === "string";
}

function getStyle(variant: "primary" | "secondary" | "ghost") {
  if (variant === "primary") {
    return {
      borderColor: `rgba(${accentA}, .34)`,
      background: `linear-gradient(135deg, rgba(${accentA}, .86), rgba(${accentB}, .78))`,
      boxShadow: `var(--lmn-glow), inset 0 1px 0 rgba(255,255,255,.20)`,
      color: "var(--lmn-bg)",
      borderRadius: "var(--lmn-radius-sm)",
    };
  }

  if (variant === "secondary") {
    return {
      borderColor: "var(--lmn-border)",
      background: "linear-gradient(145deg, rgba(255,255,255,.048), rgba(255,255,255,.012)), var(--lmn-surface)",
      boxShadow: "var(--lmn-shadow-soft), inset 0 1px 0 rgba(255,255,255,.040)",
      color: "var(--lmn-text)",
      borderRadius: "var(--lmn-radius-sm)",
    };
  }

  return {
    borderColor: "var(--lmn-border)",
    background: "transparent",
    color: "var(--lmn-text-soft)",
    borderRadius: "var(--lmn-radius-sm)",
  };
}

export function ActionButton(props: ActionButtonProps) {
  const variant = props.variant ?? "secondary";
  const disabled = props.disabled;

  const baseClass = cn(
    "apex-button lmn-action-button lmn-liquid-button lmn-focus-ring inline-flex h-10 items-center justify-center gap-2 border px-3 text-xs font-black transition duration-150",
    "hover:bg-white/[0.035] active:translate-y-px",
    disabled && "pointer-events-none opacity-50",
    props.className
  );

  const style = getStyle(variant);

  if (isLinkProps(props)) {
    const { href, children } = props;

    return (
      <Link href={href} className={baseClass} data-variant={variant} style={style}>
        {children}
      </Link>
    );
  }

  const {
    children,
    className: _className,
    variant: _variant,
    disabled: _disabled,
    type = "button",
    ...buttonProps
  } = props;
  void _className;
  void _variant;
  void _disabled;

  return (
    <button
      {...buttonProps}
      disabled={disabled}
      className={baseClass}
      data-variant={variant}
      style={style}
      type={type}
    >
      {children}
    </button>
  );
}
