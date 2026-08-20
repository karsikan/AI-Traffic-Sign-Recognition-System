import { LucideIcon } from "lucide-react";
import Card from "./Card";

interface Props {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: string;
    positive: boolean;
  };
}

export default function StatCard({ title, value, icon: Icon, description, trend }: Props) {
  return (
    <Card className="flex items-center gap-4">
      <div className="p-3 bg-signal/10 text-signal rounded-xl">
        <Icon size={24} />
      </div>
      <div className="flex-1">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {title}
        </p>
        <h3 className="text-2xl font-bold mt-1 text-slate-800 dark:text-white">
          {value}
        </h3>
        {description && (
          <p className="text-xs text-slate-400 mt-1">{description}</p>
        )}
        {trend && (
          <p className={`text-xs font-medium mt-1 ${trend.positive ? "text-emerald-500" : "text-rose-500"}`}>
            {trend.value}
          </p>
        )}
      </div>
    </Card>
  );
}
