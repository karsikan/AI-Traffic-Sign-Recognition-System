import { useRef, useState } from "react";
import { Send, Mic, Square } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (msg: string) => void;
  listening: boolean;
  onStartListen: () => void;
  onStopListen: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function ChatInput({
  onSendMessage,
  listening,
  onStartListen,
  onStopListen,
  placeholder = "Ask about road rules...",
  disabled = false,
}: ChatInputProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSendMessage(text);
    setText("");
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center bg-white dark:bg-asphalt-800 p-3 rounded-2xl border border-slate-200 dark:border-asphalt-700 shadow-sm">
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
        placeholder={listening ? "Listening... Speak now." : placeholder}
        className="flex-1 bg-transparent border-0 outline-none text-slate-800 dark:text-slate-100 text-sm placeholder-slate-400 focus:ring-0 px-2 py-1"
      />
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={listening ? onStopListen : onStartListen}
          className={`p-2 rounded-xl transition ${
            listening
              ? "bg-alert/20 text-alert animate-pulse"
              : "hover:bg-slate-100 dark:hover:bg-asphalt-700 text-slate-500 dark:text-slate-400"
          }`}
          title={listening ? "Stop dictating" : "Dictate using mic"}
        >
          {listening ? <Square size={18} /> : <Mic size={18} />}
        </button>
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="p-2 rounded-xl bg-signal text-asphalt-900 hover:bg-signal-600 transition disabled:opacity-40 disabled:hover:bg-signal"
        >
          <Send size={18} />
        </button>
      </div>
    </form>
  );
}
