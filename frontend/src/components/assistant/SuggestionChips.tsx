interface SuggestionChipsProps {
  onChipClick: (text: string) => void;
  suggestions?: string[];
}

const DEFAULT_SUGGESTIONS = [
  "Roundabout rules in Sri Lanka",
  "Speed limit on Southern Expressway",
  "Pedestrian crossing instructions",
  "Sri Lankan fines for overtaking",
];

export default function SuggestionChips({
  onChipClick,
  suggestions = DEFAULT_SUGGESTIONS,
}: SuggestionChipsProps) {
  return (
    <div className="flex flex-wrap gap-2 py-2">
      {suggestions.map((s, idx) => (
        <button
          key={idx}
          onClick={() => onChipClick(s)}
          className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-asphalt-700 dark:hover:bg-asphalt-600 text-slate-600 dark:text-slate-300 font-medium px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-asphalt-700 transition"
        >
          {s}
        </button>
      ))}
    </div>
  );
}
