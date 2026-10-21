import React from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

export type ButtonProps = {
  variant?: ButtonVariant;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

function getVariantClasses(variant: ButtonVariant | undefined): string {
  switch (variant) {
    case "secondary":
      return "inline-flex h-11 min-h-[44px] items-center justify-center rounded-full bg-[var(--admin-surface-muted)] px-5 text-[15px] font-medium text-[var(--admin-text)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
    case "ghost":
      return "inline-flex h-11 items-center justify-center rounded-full bg-transparent px-3 text-[15px] font-medium text-[var(--admin-text)] transition hover:bg-[var(--admin-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50";
    case "primary":
    default:
      return "inline-flex h-11 min-h-[44px] items-center justify-center rounded-full bg-[var(--admin-accent)] px-6 text-[15px] font-semibold text-white transition hover:bg-[var(--admin-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50";
  }
}

export function Button({
  variant = "primary",
  className,
  type,
  ...props
}: ButtonProps): React.ReactElement {
  const resolvedType = type ?? "button";

  return (
    <button
      // eslint-disable-next-line react/button-has-type
      type={resolvedType}
      className={`${getVariantClasses(variant)} ${className ?? ""}`}
      {...props}
    />
  );
}

