import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

type BaseProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  variant?: "primary" | "secondary" | "ghost" | "subtle" | "danger" | "icon";
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

export function ActionButton(props: ActionButtonProps) {
  const variant = props.variant ?? "secondary";
  const disabled = props.disabled;

  const baseClass = cn(
    "apex-button lmn-action-button lmn-focus-ring inline-flex h-10 items-center justify-center gap-2 border px-3 text-xs font-bold transition duration-150",
    "active:translate-y-px focus-visible:outline-none",
    variant === "icon" && "w-10 px-0",
    disabled && "pointer-events-none opacity-50",
    props.className
  );

  if (isLinkProps(props)) {
    const { href, children, style } = props;

    return (
      <Link
        href={href}
        className={baseClass}
        data-variant={variant}
        style={style}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : undefined}
      >
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
      type={type}
    >
      {children}
    </button>
  );
}
