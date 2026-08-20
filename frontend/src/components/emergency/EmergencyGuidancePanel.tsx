import { Info, HelpCircle } from "lucide-react";
import type { EmergencyType } from "./EmergencyTypeCard";

interface EmergencyGuidancePanelProps {
  type: EmergencyType | null;
}

const GUIDELINES = {
  accident: [
    "Turn on your hazard lights immediately.",
    "Do not block flow of traffic if cars can move, but note details.",
    "Ensure everyone steps behind the highway safety guardrails.",
    "If anyone is injured, immediately dial 1990 for Suwa Seriya Ambulance.",
  ],
  breakdown: [
    "Steer your vehicle to the hard shoulder or side of the road.",
    "Switch on hazard warning lights.",
    "Place a red reflective warning triangle at least 50 meters behind.",
    "Stay outside the vehicle on the embankment side.",
  ],
  medical: [
    "Stop the vehicle safely immediately in a clear area.",
    "Check responsiveness and breathing of the victim.",
    "Dial 1990 for Suwa Seriya ambulance immediately.",
    "Do not administer fluids unless specifically advised by paramedic.",
  ],
  tire: [
    "Find a flat, safe ground away from oncoming traffic.",
    "Apply handbrake and engage first gear or parking gear.",
    "Place wheel chocks/rocks to secure opposite wheels.",
    "Loosen lug nuts before raising the car with the jack.",
  ],
};

export default function EmergencyGuidancePanel({
  type,
}: EmergencyGuidancePanelProps) {
  const steps = type ? GUIDELINES[type] : [
    "Select an emergency type to receive tailored safety instructions.",
    "Ensure your vehicle hazard warning lamps are switched on.",
    "Keep emergency hotlines ready.",
  ];

  return (
    <div className="card border-signal/20 bg-signal/5 dark:bg-signal/5">
      <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-3">
        {type ? <Info className="text-signal w-5 h-5" /> : <HelpCircle className="text-slate-400 w-5 h-5" />}
        <span>Crucial Safety Guidelines</span>
      </h3>
      <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
        {steps.map((step, idx) => (
          <li key={idx} className="flex gap-2 items-start">
            <span className="text-signal font-bold shrink-0">{idx + 1}.</span>
            <span>{step}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
