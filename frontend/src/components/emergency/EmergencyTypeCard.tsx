import { Siren, ShieldAlert, HeartPulse, Hammer } from "lucide-react";

export type EmergencyType = "accident" | "breakdown" | "medical" | "tire";

interface EmergencyTypeCardProps {
  type: EmergencyType;
  selected: boolean;
  onClick: () => void;
}

const EMERGENCY_DETAILS = {
  accident: { label: "Accident / Collision", icon: Siren, color: "text-alert bg-alert/10 border-alert/25" },
  breakdown: { label: "Mechanical Failure", icon: ShieldAlert, color: "text-signal bg-signal/10 border-signal/25" },
  medical: { label: "Medical Emergency", icon: HeartPulse, color: "text-go bg-go/10 border-go/25" },
  tire: { label: "Flat Tire / Puncture", icon: Hammer, color: "text-slate-600 bg-slate-100 border-slate-300 dark:text-slate-300 dark:bg-asphalt-700 dark:border-asphalt-600" },
};

export default function EmergencyTypeCard({
  type,
  selected,
  onClick,
}: EmergencyTypeCardProps) {
  const { label, icon: Icon, color } = EMERGENCY_DETAILS[type];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`card flex flex-col items-center justify-center p-6 text-center border-2 transition-all hover:scale-[1.02] cursor-pointer w-full ${
        selected
          ? "border-signal bg-signal/5 shadow-md scale-[1.02]"
          : "border-slate-200 dark:border-asphalt-700 bg-white dark:bg-asphalt-800"
      }`}
    >
      <div className={`grid h-14 w-14 place-items-center rounded-2xl mb-4 ${color}`}>
        <Icon size={28} />
      </div>
      <h3 className="font-semibold text-slate-800 dark:text-slate-100">{label}</h3>
    </button>
  );
}
