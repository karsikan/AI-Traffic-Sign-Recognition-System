import { Link } from "react-router-dom";
import {
  Image, Shield, Compass, Info, CheckCircle2, ChevronRight
} from "lucide-react";
import RemindersBanner from "@/components/reminders/RemindersBanner";

const actions = [
  {
    to: "/detect/image",
    icon: Image,
    title: "Image Detection",
    desc: "Upload a snapshot of a road sign to identify rules instantly.",
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  {
    to: "/about",
    icon: Info,
    title: "About System",
    desc: "Learn about the AI models and architecture behind the system.",
    color: "bg-green-500/10 text-green-500 border-green-500/20",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-10 pb-8">
      {/* Anything falling due — renders nothing when there is nothing to say */}
      <RemindersBanner />

      {/* Hero Banner */}
      <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-asphalt-800 to-asphalt-900 text-white p-8 sm:p-12 shadow-xl border border-asphalt-700">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:20px_20px] opacity-60" />
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-signal/20 text-signal border border-signal/30 text-xs font-semibold">
            <Shield size={14} className="animate-pulse" />
            <span>Sri Lankan Smart Traffic Safety initiative</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight font-display">
            AI-Integrated Road Assistance & Sign Recognition
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Enhance driver safety and highway compliance in Sri Lanka. Upload sign snapshots, use real-time webcam mapping, or query our intelligent road rule AI assistant.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/detect/image"
              className="btn bg-signal text-asphalt-900 hover:bg-signal-600 font-bold shadow-md hover:scale-[1.02] transition"
            >
              Analyze Sign Now
            </Link>
            <Link
              to="/about"
              className="btn-ghost border-slate-600 hover:bg-slate-800 text-white font-medium"
            >
              About the System
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Actions Grid */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold font-display text-slate-800 dark:text-white flex items-center gap-2">
          <Compass className="text-signal" />
          <span>Quick Assistance Services</span>
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((act, idx) => {
            const Icon = act.icon;
            return (
              <Link
                key={idx}
                to={act.to}
                className="card flex flex-col justify-between hover:border-signal dark:hover:border-signal hover:shadow-md hover:-translate-y-1 transition duration-300"
              >
                <div>
                  <div className={`grid h-12 w-12 place-items-center rounded-xl border ${act.color} mb-4`}>
                    <Icon size={24} />
                  </div>
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white">{act.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{act.desc}</p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs text-signal font-semibold group cursor-pointer">
                  <span>Open Service</span>
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="card p-6 sm:p-8 space-y-6">
        <h2 className="text-2xl font-bold font-display text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-asphalt-700 pb-3">
          <Info className="text-signal" />
          <span>How It Works</span>
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-signal font-bold">
              <CheckCircle2 size={18} />
              <span>1. Select Interface</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Choose between Image upload, Video analysis, or Live Camera streams to capture Sri Lankan traffic signs.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-signal font-bold">
              <CheckCircle2 size={18} />
              <span>2. AI Analysis</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Our backend pipelines locate sign boundaries via YOLOv8 and classify the exact sign meaning using ResNet50.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-signal font-bold">
              <CheckCircle2 size={18} />
              <span>3. Smart Output</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Receive precise translation descriptions, voice alerts, safety rules, and direct navigations to nearby garages or hospitals.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
