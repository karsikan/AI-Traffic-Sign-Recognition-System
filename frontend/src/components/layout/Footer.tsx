import { Shield, Map, Phone } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 dark:border-asphalt-700 bg-white dark:bg-asphalt-800 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Shield className="text-signal w-5 h-5 animate-pulse" />
          <span className="text-xs text-slate-500 dark:text-slate-400">
            RoadSafety AI — Supporting Sri Lankan road safety initiatives.
          </span>
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1">
            <Map className="w-3.5 h-3.5" />
            <span>Sri Lanka Highway Code compliant</span>
          </div>
          <div className="flex items-center gap-1">
            <Phone className="w-3.5 h-3.5" />
            <span>Emergency Police: 119</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
