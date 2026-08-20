import { useLang } from "@/context/LanguageContext";
import { useAutoTranslate } from "@/hooks/useAutoTranslate";

interface AutoTranslateTextProps {
  text: string;
  className?: string;
  as?: "span" | "p" | "div" | "h1" | "h2" | "h3" | "h4";
}

export default function AutoTranslateText({
  text,
  className = "",
  as: Component = "span",
}: AutoTranslateTextProps) {
  const { lang } = useLang();
  const { translated, loading } = useAutoTranslate(text, lang);

  return (
    <Component
      className={`${className} ${
        loading ? "opacity-60 transition-opacity animate-pulse" : "transition-opacity duration-300"
      }`}
    >
      {translated}
    </Component>
  );
}
