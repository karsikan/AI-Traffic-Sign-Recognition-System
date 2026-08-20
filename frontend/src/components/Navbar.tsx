import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, MessageCircle, Calculator, Siren, MapPin, History,
  BookOpen, User as UserIcon, Plane, Moon, Sun, Image, Film, Camera
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useLang } from "@/context/LanguageContext";
import LanguageSwitcher from "./LanguageSwitcher";

const coreLinks = [
  { to: "/", icon: LayoutDashboard, key: "dashboard" },
  { to: "/assistant", icon: MessageCircle, key: "assistant" },
  { to: "/signs", icon: BookOpen, key: "signs" },
  { to: "/fines", icon: Calculator, key: "fines" },
  { to: "/nearby", icon: MapPin, key: "nearby" },
  { to: "/emergency", icon: Siren, key: "emergency" },
  { to: "/foreign", icon: Plane, key: "foreign" },
  { to: "/history", icon: History, key: "history" },
  { to: "/profile", icon: UserIcon, key: "profile" },
] as const;

const detectionLinks = [
  { to: "/detect/image", icon: Image, key: "imageDetection" },
  { to: "/detect/video", icon: Film, key: "videoDetection" },
  { to: "/detect/webcam", icon: Camera, key: "liveDetection" },
] as const;

export default function Navbar() {
  const { dark, toggle } = useTheme();
  const { t } = useLang();

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-slate-200
        dark:border-asphalt-700 bg-white dark:bg-asphalt-800 p-4">
      <div className="mb-6 px-2">
        <div className="display text-xl font-bold text-signal">● {t("appName")}</div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t("tagline")}</p>
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto">
        <div className="space-y-1">
          {coreLinks.map(({ to, icon: Icon, key }) => (
            <NavLink key={to} to={to} end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  isActive ? "bg-signal/15 text-signal font-semibold"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-asphalt-700"}`
              }>
              <Icon size={18} /> {t(key as any)}
            </NavLink>
          ))}
        </div>

        <div className="space-y-1 border-t border-slate-100 dark:border-asphalt-700 pt-3">
          <div className="px-3 mb-1 text-[10px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500">
            AI Detection
          </div>
          {detectionLinks.map(({ to, icon: Icon, key }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  isActive ? "bg-signal/15 text-signal font-semibold"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-asphalt-700"}`
              }>
              <Icon size={18} /> {t(key as any)}
            </NavLink>
          ))}
        </div>
      </nav>
      <div className="mt-4 space-y-3 border-t border-slate-200 dark:border-asphalt-700 pt-4">
        <LanguageSwitcher />
        <div className="flex gap-2">
          <button onClick={toggle} className="btn-ghost w-full flex items-center justify-center gap-2">
            {dark ? (
              <>
                <Sun size={16} /> <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon size={16} /> <span>Dark Mode</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
