import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "ghost" | "soft";
};

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold transition duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bloom-400 disabled:pointer-events-none disabled:opacity-40";
  const styles = {
    primary:
      "bg-gradient-to-r from-bloom-500 to-bloom-400 text-dusk-950 shadow-glow hover:brightness-110 active:scale-[0.98]",
    ghost:
      "border border-white/15 bg-white/5 text-white hover:bg-white/10 active:scale-[0.98]",
    soft:
      "bg-white/10 text-white hover:bg-white/15 active:scale-[0.98]",
  }[variant];
  return (
    <button className={`${base} ${styles} ${className}`} {...props}>
      {children}
    </button>
  );
}
