import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { AlertTriangle, LogIn, ShieldCheck, UserPlus, Lock } from "lucide-react";
import type { Lang } from "@/types";

/**
 * Sign in / create an account.
 *
 * One page for both, because the difference is two extra fields. It is the only place
 * that explains *why* an account exists at all — people are rightly wary of handing
 * details to a road app, so the answer is on the page rather than buried in a policy.
 */

const UI = {
  en: {
    signIn: "Sign in", signUp: "Create an account",
    signInSub: "Your fines, documents and incident records are private to you.",
    signUpSub: "Free. Name, email and a password — nothing else.",
    name: "Your name", email: "Email", password: "Password",
    language: "Preferred language",
    signInBtn: "Sign in", signUpBtn: "Create account",
    working: "Please wait…",
    noAccount: "No account yet?", haveAccount: "Already have an account?",
    switchToRegister: "Create one", switchToLogin: "Sign in",
    whyTitle: "Why an account?",
    whyBody: "Without one, everybody's saved fines and documents would sit in the same pile and anyone could read them. An account keeps yours yours.",
    storeTitle: "What is stored",
    storeBody: "Your name, email and a scrambled password. Never your NIC, licence or vehicle number — those only appear on records you choose to save, and are deleted with your account.",
    browseTitle: "You do not need an account to",
    browseBody: "Read the fine guide, your rights when police stop you, expressway tolls, fuel costs, insurance hotlines or road hazards. All of that is open to everyone.",
    browse: "Browse without signing in",
    pwHint: "At least 8 characters.",
    failed: "Could not reach the server. Is the backend running?",
  },
  ta: {
    signIn: "உள்நுழை", signUp: "கணக்கு உருவாக்கு",
    signInSub: "உங்கள் அபராதங்கள், ஆவணங்கள், நிகழ்வுப் பதிவுகள் உங்களுக்கு மட்டுமே.",
    signUpSub: "இலவசம். பெயர், மின்னஞ்சல், கடவுச்சொல் — வேறு எதுவும் இல்லை.",
    name: "உங்கள் பெயர்", email: "மின்னஞ்சல்", password: "கடவுச்சொல்",
    language: "விருப்ப மொழி",
    signInBtn: "உள்நுழை", signUpBtn: "கணக்கு உருவாக்கு",
    working: "காத்திருங்கள்…",
    noAccount: "கணக்கு இல்லையா?", haveAccount: "ஏற்கனவே கணக்கு இருக்கா?",
    switchToRegister: "உருவாக்குங்கள்", switchToLogin: "உள்நுழையுங்கள்",
    whyTitle: "ஏன் கணக்கு?",
    whyBody: "கணக்கு இல்லாட்டி எல்லாரோட அபராதங்களும் ஆவணங்களும் ஒரே இடத்துல இருக்கும், யார் வேணா படிக்கலாம். கணக்கு உங்களுடையதை உங்களுக்கே வைக்கும்.",
    storeTitle: "என்ன சேமிக்கப்படுது",
    storeBody: "உங்க பெயர், மின்னஞ்சல், மறைக்கப்பட்ட கடவுச்சொல். NIC, உரிமம், வாகன இலக்கம் ஒருபோதும் இல்லை — அவை நீங்க சேமிக்கத் தேர்ந்தெடுக்கும் பதிவுகளில் மட்டுமே, கணக்கை நீக்கினா அவையும் போயிடும்.",
    browseTitle: "கணக்கு இல்லாமலே பார்க்கலாம்",
    browseBody: "அபராத வழிகாட்டி, பொலிஸ் நிறுத்தினா உங்க உரிமைகள், நெடுஞ்சாலைக் கட்டணம், எரிபொருள் செலவு, காப்புறுதி எண்கள், வீதி அபாயங்கள் — இதெல்லாம் எல்லாருக்கும் திறந்திருக்கு.",
    browse: "உள்நுழையாமல் பார்",
    pwHint: "குறைந்தது 8 எழுத்துகள்.",
    failed: "Server-ஐ அணுக முடியவில்லை. Backend ஓடுதா?",
  },
  si: {
    signIn: "පිවිසෙන්න", signUp: "ගිණුමක් සාදන්න",
    signInSub: "ඔබේ දඩ, ලේඛන සහ සිද්ධි වාර්තා ඔබට පමණයි.",
    signUpSub: "නොමිලේ. නම, විද්‍යුත් තැපෑල සහ මුරපදයක් — වෙන කිසිවක් නැත.",
    name: "ඔබේ නම", email: "විද්‍යුත් තැපෑල", password: "මුරපදය",
    language: "කැමති භාෂාව",
    signInBtn: "පිවිසෙන්න", signUpBtn: "ගිණුම සාදන්න",
    working: "රැඳී සිටින්න…",
    noAccount: "තවම ගිණුමක් නැද්ද?", haveAccount: "දැනටමත් ගිණුමක් තිබේද?",
    switchToRegister: "සාදන්න", switchToLogin: "පිවිසෙන්න",
    whyTitle: "ගිණුමක් අවශ්‍ය ඇයි?",
    whyBody: "ගිණුමක් නොමැතිව සියලුම දෙනාගේ දඩ සහ ලේඛන එකම තැනක තිබෙනු ඇති අතර ඕනෑම කෙනෙකුට කියවිය හැක. ගිණුමක් ඔබේ දේ ඔබට තබා ගනී.",
    storeTitle: "ගබඩා කරන්නේ කුමක්ද",
    storeBody: "ඔබේ නම, විද්‍යුත් තැපෑල සහ සංකේතාත්මක මුරපදය. කිසිවිටෙක ඔබේ NIC, බලපත්‍රය හෝ වාහන අංකය නොවේ.",
    browseTitle: "ගිණුමක් නොමැතිව බැලිය හැක",
    browseBody: "දඩ මාර්ගෝපදේශය, ඔබේ අයිතිවාසිකම්, අධිවේගී ගාස්තු, ඉන්ධන වියදම්, රක්ෂණ අංක සහ මාර්ග අනතුරු — මේ සියල්ල සැමට විවෘතයි.",
    browse: "පිවිසීමකින් තොරව බලන්න",
    pwHint: "අවම වශයෙන් අකුරු 8ක්.",
    failed: "සේවාදායකයට ළඟා විය නොහැක. Backend ක්‍රියාත්මකද?",
  },
};

type LabelKey = keyof typeof UI.en;

export default function LoginPage({ mode = "login" }: { mode?: "login" | "register" }) {
  const { lang } = useLang();
  const tr = (k: LabelKey): string => UI[(lang as "en" | "ta" | "si")]?.[k] ?? UI.en[k];

  const { user, login, register, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };

  const [isRegister, setIsRegister] = useState(mode === "register");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [language, setLanguage] = useState<Lang>((lang as Lang) || "en");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Already signed in — go where they were headed
  if (!loading && user) {
    return <Navigate to={location.state?.from || "/"} replace />;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (isRegister) {
        await register({ full_name: fullName, email, password, preferred_language: language });
      } else {
        await login(email, password);
      }
      navigate(location.state?.from || "/", { replace: true });
    } catch (err: any) {
      setError(err?.message || tr("failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-asphalt-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid gap-6 lg:grid-cols-2">
        {/* Form */}
        <div className="card space-y-5">
          <div>
            <div className="text-xl font-bold text-signal flex items-center gap-2 font-display">
              <span>●</span> RoadSafety AI
            </div>
            <h1 className="text-2xl font-bold font-display mt-3">
              {isRegister ? tr("signUp") : tr("signIn")}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {isRegister ? tr("signUpSub") : tr("signInSub")}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-3">
            {isRegister && (
              <div>
                <label className="label text-xs" htmlFor="fullName">{tr("name")}</label>
                <input id="fullName" className="input py-2 text-sm" required minLength={2}
                  autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
            )}

            <div>
              <label className="label text-xs" htmlFor="email">{tr("email")}</label>
              <input id="email" className="input py-2 text-sm" type="email" required
                autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div>
              <label className="label text-xs" htmlFor="password">{tr("password")}</label>
              <input id="password" className="input py-2 text-sm" type="password" required
                minLength={isRegister ? 8 : 1}
                autoComplete={isRegister ? "new-password" : "current-password"}
                value={password} onChange={(e) => setPassword(e.target.value)} />
              {isRegister && <p className="text-[11px] text-slate-400 mt-1">{tr("pwHint")}</p>}
            </div>

            {isRegister && (
              <div>
                <label className="label text-xs" htmlFor="language">{tr("language")}</label>
                <select id="language" className="input py-2 text-sm" value={language}
                  onChange={(e) => setLanguage(e.target.value as Lang)}>
                  <option value="en">English</option>
                  <option value="ta">தமிழ்</option>
                  <option value="si">සිංහල</option>
                </select>
              </div>
            )}

            {error && (
              <p className="text-xs text-alert flex items-start gap-1.5">
                <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {error}
              </p>
            )}

            <button className="btn-primary w-full" type="submit" disabled={busy}>
              {isRegister ? <UserPlus size={16} /> : <LogIn size={16} />}
              {busy ? tr("working") : isRegister ? tr("signUpBtn") : tr("signInBtn")}
            </button>
          </form>

          <p className="text-xs text-slate-500 text-center">
            {isRegister ? tr("haveAccount") : tr("noAccount")}{" "}
            <button
              className="text-signal font-semibold hover:underline"
              onClick={() => { setIsRegister((v) => !v); setError(""); }}
            >
              {isRegister ? tr("switchToLogin") : tr("switchToRegister")}
            </button>
          </p>

          <Link to="/" className="btn-ghost w-full py-2 text-xs">{tr("browse")}</Link>
        </div>

        {/* Why — people are right to ask before handing over details */}
        <div className="space-y-4">
          <div className="card border-signal/30 bg-signal/5 flex gap-3">
            <ShieldCheck className="text-signal shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-bold mb-1">{tr("whyTitle")}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">{tr("whyBody")}</p>
            </div>
          </div>

          <div className="card flex gap-3">
            <Lock className="text-slate-400 shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-bold mb-1">{tr("storeTitle")}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">{tr("storeBody")}</p>
            </div>
          </div>

          <div className="card border-go/30 bg-go/5 flex gap-3">
            <div>
              <p className="text-sm font-bold mb-1">{tr("browseTitle")}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">{tr("browseBody")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
