import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, MessageCircle, Siren, MapPin, History,
  Moon, Sun, Image, Film, Camera, Info, BookOpen, Globe,
  Languages, BarChart3, Images, BookCheck, Gauge, CloudSun, Car, ScanLine,
  ShieldAlert, Banknote, ReceiptText, FolderLock, Radar, NotebookPen,
  EyeOff, ScanFace, Wind, Route, Fuel, FileSignature, ShieldCheck,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useT } from "@/hooks/useT";
import LanguageSwitcher from "@/components/LanguageSwitcher";

function NavItem({ to, icon: Icon, label, end }: { to: string; icon: any; label: string; end?: boolean }) {
  return (
    <NavLink to={to} end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
          isActive
            ? "bg-signal/15 text-signal font-semibold"
            : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-asphalt-700"
        }`
      }>
      <Icon size={17} /> {label}
    </NavLink>
  );
}

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1 border-t border-slate-100 dark:border-asphalt-700 pt-3">
      <div className="px-3 mb-1 text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500">
        {title}
      </div>
      {children}
    </div>
  );
}

export default function Navbar() {
  const { dark, toggle } = useTheme();
  const { t, lang } = useT();

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-slate-200
        dark:border-asphalt-700 bg-white dark:bg-asphalt-800 p-4">
      <div className="mb-4 px-2">
        <div className="text-xl font-bold text-signal flex items-center gap-2">
          <span>●</span> RoadSafety AI
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">Sri Lankan Smart Traffic Assistant</p>
      </div>

      <nav className="flex-1 space-y-0 overflow-y-auto">
        {/* Core */}
        <div className="space-y-1">
          <NavItem to="/"          icon={LayoutDashboard} label={t("home")}           end />
          <NavItem to="/assistant" icon={MessageCircle}   label={t("aiAssistant")} />
          <NavItem to="/signs"     icon={BookOpen}        label={t("signGuide")} />
          <NavItem to="/translate" icon={Languages}       label={t("translation")} />
          <NavItem to="/foreign"   icon={Globe}           label={t("touristGuide")} />
          <NavItem to="/nearby"    icon={MapPin}          label={t("nearbyServices")} />
          <NavItem to="/emergency" icon={Siren}           label={t("emergencyHelp")} />
        </div>

        {/* Police & fines */}
        <NavSection title={lang === "ta" ? "பொலிஸ் & அபராதம்" : lang === "si" ? "පොලිසිය සහ දඩ" : "Police & Fines"}>
          <NavItem to="/police-stop" icon={ShieldAlert}
            label={lang === "ta" ? "பொலிஸ் நிறுத்தினால்" : lang === "si" ? "පොලිසිය නැවැත්වූ විට" : "Police Stopped You"} />
          <NavItem to="/fines" icon={Banknote}
            label={lang === "ta" ? "அபராத வழிகாட்டி" : lang === "si" ? "දඩ මාර්ගෝපදේශය" : "Fine & Violation Guide"} />
          <NavItem to="/my-fines" icon={ReceiptText}
            label={lang === "ta" ? "எனது அபராதங்கள்" : lang === "si" ? "මගේ දඩ" : "My Fines"} />
          <NavItem to="/demerit" icon={Gauge}
            label={lang === "ta" ? "குறைப் புள்ளிகள்" : lang === "si" ? "දඩ ලකුණු" : "Demerit Points"} />
          <NavItem to="/locker" icon={FolderLock}
            label={lang === "ta" ? "டிஜிட்டல் லாக்கர்" : lang === "si" ? "ඩිජිටල් ලොකරය" : "Digital Locker"} />
          <NavItem to="/incidents" icon={NotebookPen}
            label={lang === "ta" ? "சம்பவப் பதிவு" : lang === "si" ? "සිද්ධි වාර්තා" : "Incident Recorder"} />
        </NavSection>

        {/* Driving safety — live, while at the wheel */}
        <NavSection title={lang === "ta" ? "ஓட்டும்போது" : lang === "si" ? "රිය පදවන විට" : "While Driving"}>
          <NavItem to="/fatigue" icon={EyeOff}
            label={lang === "ta" ? "சோர்வு கண்காணிப்பு" : lang === "si" ? "වෙහෙස නිරීක්ෂණය" : "Fatigue Monitor"} />
          <NavItem to="/speedometer" icon={Gauge}
            label={lang === "ta" ? "வேகம் & மண்டலம்" : lang === "si" ? "වේගය සහ කලාප" : "Speed & Zones"} />
          <NavItem to="/checkpoints" icon={Radar}
            label={lang === "ta" ? "சாவடி & அபாயம்" : lang === "si" ? "බාධක සහ අනතුරු" : "Checkpoints & Hazards"} />
        </NavSection>

        {/* Owning and running a vehicle */}
        <NavSection title={lang === "ta" ? "வாகன விவகாரம்" : lang === "si" ? "වාහන කටයුතු" : "Vehicle Admin"}>
          <NavItem to="/clearance" icon={Wind}
            label={lang === "ta" ? "வருமான உரிமம் & புகை" : lang === "si" ? "ආදායම් බලපත්‍රය" : "Revenue & Emission"} />
          <NavItem to="/expressway" icon={Route}
            label={lang === "ta" ? "நெடுஞ்சாலை கட்டணம்" : lang === "si" ? "අධිවේගී ගාස්තු" : "Expressway Tolls"} />
          <NavItem to="/fuel" icon={Fuel}
            label={lang === "ta" ? "எரிபொருள் & செலவு" : lang === "si" ? "ඉන්ධන සහ වියදම" : "Fuel & Trip Cost"} />
          <NavItem to="/transfer" icon={FileSignature}
            label={lang === "ta" ? "உரிமை மாற்றம்" : lang === "si" ? "අයිතිය පැවරීම" : "Ownership Transfer"} />
          <NavItem to="/claim" icon={ShieldCheck}
            label={lang === "ta" ? "காப்புறுதி கோரிக்கை" : lang === "si" ? "රක්ෂණ හිමිකම්" : "Accident Claim"} />
        </NavSection>

        {/* Detection */}
        <NavSection title={t("aiSignDetection")}>
          <NavItem to="/detect/image"  icon={Image}   label={t("imageDetection")} />
          <NavItem to="/detect/video"  icon={Film}    label={t("videoDetection")} />
          <NavItem to="/detect/webcam" icon={Camera}  label={t("webcamDetection")} />
          <NavItem to="/detect/batch"  icon={Images}  label={t("batchDetection")} />
          <NavItem to="/trainer" icon={ScanFace}
            label={lang === "ta" ? "கேமரா பயிற்சி" : lang === "si" ? "කැමරා පුහුණුව" : "Camera Trainer"} />
        </NavSection>

        {/* Extra tools */}
        <NavSection title="Road Tools">
          <NavItem to="/quiz"           icon={BookCheck} label={t("roadRulesQuiz")} />
          <NavItem to="/speedlimits"  icon={Gauge}     label={t("speedLimits")} />
          <NavItem to="/weather"      icon={CloudSun}  label={t("weather")} />
          <NavItem to="/drivinglicense" icon={Car}    label={lang === "ta" ? "வாகன உரிம வழிகாட்டி" : lang === "si" ? "රිය බලපත්‍ර මාර්ගෝ." : "Driving Licence Guide"} />
          <NavItem to="/documents"    icon={ScanLine} label={lang === "ta" ? "வாகன ஆவண ஸ்கேனர்" : lang === "si" ? "මාර්ග ලේඛන ස්කෑනරය" : "Document Scanner"} />
        </NavSection>

        {/* Insights */}
        <NavSection title={t("insightsData")}>
          <NavItem to="/history"   icon={History}   label={t("predictionHistory")} />
          <NavItem to="/analytics" icon={BarChart3}  label={t("analytics")} />
          <NavItem to="/about"     icon={Info}       label={t("aboutSystem")} />
        </NavSection>
      </nav>

      <div className="mt-4 space-y-3 border-t border-slate-200 dark:border-asphalt-700 pt-4">
        <div className="px-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Language / மொழி / භාෂාව</p>
          <LanguageSwitcher />
        </div>
        <button onClick={toggle} className="btn-ghost w-full flex items-center justify-center gap-2 py-2 text-sm">
          {dark ? <><Sun size={15} /> Light Mode</> : <><Moon size={15} /> Dark Mode</>}
        </button>
      </div>
    </aside>
  );
}
