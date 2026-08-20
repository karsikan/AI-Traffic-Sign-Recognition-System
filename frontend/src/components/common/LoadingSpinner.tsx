interface Props {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function LoadingSpinner({ size = "md", className = "" }: Props) {
  const sizeClass = {
    sm: "h-5 w-5 stroke-[3]",
    md: "h-8 w-8 stroke-[2]",
    lg: "h-12 w-12 stroke-[1.5]"
  }[size];

  return (
    <div className={`flex items-center justify-center p-4 ${className}`}>
      <svg
        className={`animate-spin text-signal ${sizeClass}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
}
