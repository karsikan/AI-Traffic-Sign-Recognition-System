import { LucideIcon } from "lucide-react";
import Card from "./Card";

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export default function EmptyState({ icon: Icon, title, description, className = "" }: Props) {
  return (
    <Card className={`flex flex-col items-center justify-center text-center p-8 border-dashed ${className}`}>
      <div className="p-4 bg-slate-50 dark:bg-asphalt-700 text-slate-400 dark:text-slate-500 rounded-full mb-4">
        <Icon size={36} />
      </div>
      <h3 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
        {description}
      </p>
    </Card>
  );
}
