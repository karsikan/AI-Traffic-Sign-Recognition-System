import { useState, useMemo } from "react";
import { useT } from "@/hooks/useT";
import { Trophy, ChevronRight, RotateCcw, CheckCircle, XCircle, BookOpen } from "lucide-react";

interface Question {
  q: string;
  options: string[];
  answer: number;
  explanation: string;
}

const ALL_QUESTIONS: Question[] = [
  { q: "What is the maximum speed limit on Sri Lankan expressways?", options: ["80 km/h", "100 km/h", "110 km/h", "120 km/h"], answer: 2, explanation: "The speed limit on Sri Lankan expressways (E01, E03) is 110 km/h for cars." },
  { q: "At an uncontrolled intersection, who has right of way?", options: ["The faster vehicle", "Vehicle coming from the right", "Vehicle coming from the left", "The larger vehicle"], answer: 1, explanation: "In Sri Lanka, vehicles coming from the right have right of way at uncontrolled intersections." },
  { q: "What does a solid yellow line in the centre of the road mean?", options: ["Overtaking allowed", "No overtaking in either direction", "Road work ahead", "End of speed limit"], answer: 1, explanation: "A solid yellow centre line means overtaking is prohibited in both directions." },
  { q: "When must you use headlights in Sri Lanka?", options: ["Only at night", "30 minutes after sunset until 30 min before sunrise", "Only in rain", "Both B and C"], answer: 3, explanation: "Headlights are required from 30 minutes after sunset to 30 minutes before sunrise, and during poor visibility such as rain." },
  { q: "What is the blood alcohol limit for drivers in Sri Lanka?", options: ["0.08%", "0.05%", "0.00%", "0.10%"], answer: 0, explanation: "The legal BAC limit in Sri Lanka is 0.08% (80 mg per 100 ml of blood)." },
  { q: "A red circular sign with a white horizontal bar means:", options: ["No parking", "No entry", "Speed limit", "No overtaking"], answer: 1, explanation: "A red circle with white bar is the universal 'No Entry' sign — vehicles must not enter." },
  { q: "What should you do when a school bus has stopped and its red lights are flashing?", options: ["Overtake carefully", "Slow and prepare to stop", "Stop completely in both directions", "Honk and pass quickly"], answer: 2, explanation: "When a school bus shows flashing red lights, all traffic in both directions must stop completely." },
  { q: "On a two-lane road in Sri Lanka, you must drive on the:", options: ["Right lane", "Left lane", "Either lane", "Middle"], answer: 1, explanation: "In Sri Lanka, vehicles drive on the left side of the road — left-hand traffic rule." },
  { q: "A white triangular sign (pointing up) with a red border means:", options: ["Stop", "Give Way", "One Way", "Danger"], answer: 1, explanation: "An upward-pointing white triangle with red border is the 'Give Way' sign — yield to oncoming traffic." },
  { q: "What is the minimum following distance at 60 km/h on a dry road?", options: ["1 second", "2 seconds", "3 seconds", "4 seconds"], answer: 1, explanation: "The 2-second rule is the minimum safe following distance — more in wet or foggy conditions." },
  { q: "Flashing amber at a pedestrian crossing means:", options: ["Stop, pedestrians crossing", "Slow down, check for pedestrians", "Proceed — no one present", "Traffic signal failure"], answer: 1, explanation: "Flashing amber means slow down and check for pedestrians; stop if any are crossing." },
  { q: "You must NOT park within how many metres of a fire hydrant?", options: ["1 m", "3 m", "5 m", "10 m"], answer: 1, explanation: "Parking within 3 metres of a fire hydrant is prohibited in Sri Lanka." },
  { q: "A blue circular sign indicates:", options: ["Prohibition", "Warning", "Mandatory instruction", "Information"], answer: 2, explanation: "Blue circular signs in Sri Lanka give mandatory instructions that drivers must follow." },
  { q: "When can you use your horn in Sri Lanka?", options: ["To greet friends", "To warn of danger or overtaking", "In heavy traffic", "Anytime"], answer: 1, explanation: "Horns should only be used to warn of danger or signal when overtaking — excessive honking is an offence." },
  { q: "What does a flashing green traffic light mean?", options: ["Proceed — all clear", "Green phase is about to end — prepare to stop", "Emergency vehicle approaching", "Pedestrian phase active"], answer: 1, explanation: "In Sri Lanka, a flashing green light means the green phase is ending — prepare to stop." },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function QuizPage() {
  const { t } = useT();
  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [finished, setFinished] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const questions = useMemo(() => shuffle(ALL_QUESTIONS).slice(0, 10), [started]);

  const start = () => { setStarted(true); setCurrent(0); setSelected(null); setAnswers([]); setFinished(false); };
  const restart = () => { setStarted(false); setFinished(false); };

  const choose = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    setShowExplanation(true);
  };

  const next = () => {
    const newAnswers = [...answers, selected];
    if (current + 1 >= questions.length) {
      setAnswers(newAnswers);
      setFinished(true);
    } else {
      setAnswers(newAnswers);
      setCurrent(c => c + 1);
      setSelected(null);
      setShowExplanation(false);
    }
  };

  const score = answers.filter((a, i) => a === questions[i]?.answer).length;
  const passed = score >= 7;

  if (!started) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-8">
        <div>
          <h1 className="text-3xl font-bold font-display flex items-center gap-2">
            <BookOpen className="text-signal" size={28} />
            {t("quizTitle")}
          </h1>
          <p className="text-slate-500 mt-1">{t("quizSub")}</p>
        </div>
        <div className="card space-y-4">
          <h2 className="font-bold text-lg">Before you start:</h2>
          <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
            {["10 multiple-choice questions selected randomly", "Pass mark: 7 out of 10 (70%)", "Each question has an explanation after answering", "Based on Sri Lanka Motor Traffic Act"].map(item => (
              <li key={item} className="flex items-center gap-2"><CheckCircle size={14} className="text-go shrink-0" /> {item}</li>
            ))}
          </ul>
          <button onClick={start} className="btn-primary w-full py-3 text-base font-bold">
            {t("startQuiz")}
          </button>
        </div>
      </div>
    );
  }

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-8">
        <div className="card text-center space-y-4 p-8">
          <Trophy size={52} className={`mx-auto ${passed ? "text-signal" : "text-slate-400"}`} />
          <h2 className="text-3xl font-bold font-display">{t("yourScore")}</h2>
          <div className={`text-6xl font-bold ${passed ? "text-go" : "text-alert"}`}>{score}/{questions.length}</div>
          <div className="text-xl font-semibold text-slate-500">{pct}%</div>
          <div className={`inline-block px-4 py-2 rounded-full font-bold text-white ${passed ? "bg-go" : "bg-alert"}`}>
            {passed ? t("passed") : t("failed")}
          </div>

          {/* Per-question review */}
          <div className="text-left space-y-2 pt-4">
            {questions.map((q, i) => {
              const correct = answers[i] === q.answer;
              return (
                <div key={i} className={`rounded-xl p-3 text-xs border ${correct ? "border-go/30 bg-go/5" : "border-alert/30 bg-alert/5"}`}>
                  <div className="flex items-start gap-2">
                    {correct ? <CheckCircle size={13} className="text-go mt-0.5 shrink-0" /> : <XCircle size={13} className="text-alert mt-0.5 shrink-0" />}
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{q.q}</p>
                      {!correct && <p className="text-go mt-0.5">✓ {q.options[q.answer]}</p>}
                      <p className="text-slate-500 mt-0.5 italic">{q.explanation}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={restart} className="btn-primary flex items-center gap-2 mx-auto">
            <RotateCcw size={15} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  const q = questions[current];

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <BookOpen className="text-signal" size={22} /> {t("quizTitle")}
        </h1>
        <span className="text-sm font-semibold text-slate-500">
          {t("question")} {current + 1} {t("of")} {questions.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-100 dark:bg-asphalt-700 rounded-full overflow-hidden">
        <div className="h-2 bg-signal rounded-full transition-all" style={{ width: `${((current) / questions.length) * 100}%` }} />
      </div>

      <div className="card space-y-5">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-snug">{q.q}</h2>

        <div className="space-y-2">
          {q.options.map((opt, i) => {
            let cls = "border-slate-200 dark:border-asphalt-700 hover:border-signal/60 cursor-pointer";
            if (selected !== null) {
              if (i === q.answer) cls = "border-go bg-go/10 text-go font-semibold";
              else if (i === selected && i !== q.answer) cls = "border-alert bg-alert/10 text-alert";
              else cls = "border-slate-200 dark:border-asphalt-700 opacity-50 cursor-not-allowed";
            }
            return (
              <button key={i} onClick={() => choose(i)}
                className={`w-full text-left rounded-xl border-2 px-4 py-3 text-sm transition-all ${cls}`}
              >
                <span className="font-bold mr-2">{["A", "B", "C", "D"][i]}.</span> {opt}
              </button>
            );
          })}
        </div>

        {showExplanation && (
          <div className="rounded-xl bg-slate-50 dark:bg-asphalt-700 border border-slate-200 dark:border-asphalt-600 p-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <span className="font-bold text-slate-800 dark:text-slate-100">Explanation: </span>{q.explanation}
          </div>
        )}

        {selected !== null && (
          <button onClick={next} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
            {current + 1 < questions.length ? <>{t("nextQuestion")} <ChevronRight size={16} /></> : <>{t("submitQuiz")}</>}
          </button>
        )}
      </div>
    </div>
  );
}
