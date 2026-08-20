import { Volume2 } from "lucide-react";
import AutoTranslateText from "../AutoTranslateText";

interface ChatBubbleProps {
  sender: "user" | "assistant";
  text: string;
  timestamp?: string;
  onSpeak?: () => void;
}

export default function ChatBubble({
  sender,
  text,
  timestamp,
  onSpeak,
}: ChatBubbleProps) {
  const isUser = sender === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[75%] rounded-2xl p-4 shadow-sm relative group ${
          isUser
            ? "bg-signal text-asphalt-900 rounded-tr-none"
            : "bg-white dark:bg-asphalt-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-asphalt-700 rounded-tl-none"
        }`}
      >
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {isUser ? text : <AutoTranslateText text={text} />}
        </div>
        <div className="flex items-center justify-between mt-2 gap-4">
          <span className="text-[10px] opacity-60">
            {timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {!isUser && onSpeak && (
            <button
              onClick={onSpeak}
              className="text-slate-400 hover:text-signal transition p-1 rounded opacity-0 group-hover:opacity-100"
              title="Speak reply"
            >
              <Volume2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
