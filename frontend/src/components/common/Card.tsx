import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function Card({ children, className = "", onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={`card bg-white dark:bg-asphalt-800 border border-slate-100 dark:border-asphalt-700 shadow-sm rounded-2xl p-5 ${
        onClick ? "cursor-pointer hover:shadow-md transition-all active:scale-[0.99]" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
