import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  variant?: "primary" | "secondary" | "success" | "warning" | "danger" | "info";
  className?: string;
}

export default function Badge({ children, variant = "info", className = "" }: Props) {
  const variantClass = {
    primary: "bg-signal/15 text-signal",
    secondary: "bg-slate-100 text-slate-700 dark:bg-asphalt-700 dark:text-slate-200",
    success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    danger: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    info: "bg-blue-500/15 text-blue-600 dark:text-blue-400"
  }[variant];

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${variantClass} ${className}`}>
      {children}
    </span>
  );
}
