import React from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

export type ButtonProps = {
  variant?: ButtonVariant;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

function getVariantClasses(variant: ButtonVariant | undefined): string {
  switch (variant) {
    case "secondary":
      return "rounded-full border border-black/10 bg-white/70 px-5 py-3 text-foreground shadow-sm backdrop-blur transition hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed";
    case "ghost":
      return "rounded-full bg-transparent px-3 py-2 text-foreground/90 transition hover:bg-black/5 disabled:opacity-50 disabled:cursor-not-allowed";
    case "primary":
    default:
      return "rounded-[51px] bg-[#00B596] px-5 py-3 text-white transition hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed";
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

