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
      background: `linear-gradient(135deg, rgba(${accentA}, .14), rgba(${accentB}, .075)), rgba(8,10,15,.86)`,
      boxShadow: `0 14px 34px rgba(0,0,0,.34), 0 0 18px rgba(${accentA}, .045), inset 0 1px 0 rgba(255,255,255,.045)`,
      borderRadius: 8,
    };
  }

  if (variant === "secondary") {
    return {
      borderColor: "rgba(255,255,255,.070)",
      background: "linear-gradient(145deg, rgba(255,255,255,.035), rgba(255,255,255,.010)), rgba(8,10,15,.76)",
      boxShadow: "0 10px 24px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.030)",
      borderRadius: 8,
    };
  }

  return {
    borderColor: "rgba(255,255,255,.030)",
    background: "rgba(8,10,15,.62)",
    borderRadius: 8,
  };
}

export function ActionButton(props: ActionButtonProps) {
  const variant = props.variant ?? "secondary";
  const disabled = props.disabled;

  const baseClass = cn(
    "apex-button lmn-action-button lmn-liquid-button lmn-focus-ring inline-flex h-10 items-center justify-center gap-2 border px-3 text-xs font-black text-white transition duration-150",
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
