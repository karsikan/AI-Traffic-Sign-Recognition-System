import { Shield, Cpu, BookOpen, Layers } from "lucide-react";
import StatCard from "@/components/common/StatCard";

export default function AboutPage() {
  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-bold font-display">About RoadSafety AI</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Technical specifications of the Sri Lanka Smart Traffic Sign Recognition and Road Assistance System.
        </p>
      </div>

      {/* Overview stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Cpu} title="Detection Engine" value="YOLOv8s" />
        <StatCard icon={Layers} title="Classification Model" value="ResNet50" />
        <StatCard icon={BookOpen} title="Training Datasets" value="GTSRB & GTSDB" />
        <StatCard icon={Shield} title="Rule Sets" value="Sri Lankan Highway Code" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card space-y-4">
          <h2 className="text-xl font-bold font-display text-slate-800 dark:text-white border-b border-slate-100 dark:border-asphalt-700 pb-2">
            System Capabilities
          </h2>
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <p>
              This final-year project integrates advanced Computer Vision and Large Language Models to assist drivers, tourists, and road safety officers in Sri Lanka.
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>Automatic localization of road signs in images using YOLOv8 bounding box regression.</li>
              <li>High-fidelity categorisation of standard and custom Sri Lankan signs via ResNet50.</li>
              <li>Multi-language translations in Sinhala (සිංහල) and Tamil (தமிழ்) using Google Gemini.</li>
              <li>Interactive Road Safety chatbot using Gemini API.</li>
              <li>Intelligent Emergency reporting routing to local helpline services.</li>
            </ul>
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="text-xl font-bold font-display text-slate-800 dark:text-white border-b border-slate-100 dark:border-asphalt-700 pb-2">
            Models & Performance
          </h2>
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <div>
              <h4 className="font-bold text-slate-700 dark:text-slate-200">YOLOv8s (Detection):</h4>
              <p className="text-xs text-slate-500">
                Trained on the German Traffic Sign Detection Benchmark (GTSDB) and augmented with local Sri Lankan sign templates for high IoU localization metrics.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-700 dark:text-slate-200">ResNet50 (Classification):</h4>
              <p className="text-xs text-slate-500">
                Fine-tuned using Transfer Learning on the German Traffic Sign Recognition Benchmark (GTSRB) spanning 43 core classes, plus custom Sri Lankan prohibitory, mandatory, and warning signs.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-700 dark:text-slate-200">System Integrations:</h4>
              <p className="text-xs text-slate-500">
                FastAPI backend, SQLite/MySQL persistence, PyTorch, OpenCV frame-processing layers, and standard Tailwind CSS responsive interface.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
