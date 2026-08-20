import { useLang } from "@/context/LanguageContext";
import type { Lang } from "@/types";

const langs: { code: Lang; label: string }[] = [
  { code: "en", label: "EN" }, { code: "ta", label: "தமிழ்" }, { code: "si", label: "සිං" },
];

export default function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex rounded-lg border border-slate-300 dark:border-asphalt-700 overflow-hidden">
      {langs.map((l) => (
        <button key={l.code} onClick={() => setLang(l.code)}
          className={`px-2.5 py-1 text-sm ${lang === l.code
            ? "bg-signal text-asphalt-900" : "hover:bg-slate-100 dark:hover:bg-asphalt-700"}`}>
          {l.label}
        </button>
      ))}
    </div>
  );
}
