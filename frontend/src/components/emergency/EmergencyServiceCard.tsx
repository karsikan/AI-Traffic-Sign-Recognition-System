import { PhoneCall } from "lucide-react";

interface EmergencyServiceCardProps {
  name: string;
  number: string;
  description: string;
}

export default function EmergencyServiceCard({
  name,
  number,
  description,
}: EmergencyServiceCardProps) {
  return (
    <div className="card flex items-center justify-between p-4 bg-white dark:bg-asphalt-800 border border-slate-200 dark:border-asphalt-700">
      <div>
        <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          {name}
          <span className="text-xs bg-slate-100 dark:bg-asphalt-700 text-slate-500 px-2 py-0.5 rounded font-mono">
            {number}
          </span>
        </h4>
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      </div>
      <a
        href={`tel:${number}`}
        className="flex items-center justify-center p-3 rounded-xl bg-alert hover:bg-alert/85 text-white transition-all shadow-sm hover:scale-105"
        title={`Call ${name}`}
      >
        <PhoneCall size={18} />
      </a>
    </div>
  );
}
