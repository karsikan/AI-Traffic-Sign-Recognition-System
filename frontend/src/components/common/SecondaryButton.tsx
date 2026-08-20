import { ButtonHTMLAttributes, ReactNode } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  className?: string;
}

export default function SecondaryButton({ children, className = "", ...props }: Props) {
  return (
    <button
      className={`btn btn-secondary flex items-center justify-center gap-2 transition-all ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
