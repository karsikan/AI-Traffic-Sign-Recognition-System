import { useRef, useState } from "react";
import { DetectionApi } from "@/services/api";
import { useSpeech } from "@/hooks/useSpeech";
import { useLang } from "@/context/LanguageContext";
import { Images, Upload, X, CheckCircle, AlertCircle, Download, RotateCcw, Loader } from "lucide-react";

interface BatchItem {
  file: File;
  preview: string;
  status: "pending" | "processing" | "done" | "error";
  result?: any;
  error?: string;
}

export default function BatchDetectionPage() {
  const { lang } = useLang();
  const { speak } = useSpeech(lang);
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [running, setRunning] = useState(false);

  const addFiles = (files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type.startsWith("image/")).slice(0, 10 - items.length);
    const newItems: BatchItem[] = arr.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      status: "pending",
    }));
    setItems(prev => [...prev, ...newItems].slice(0, 10));
  };

  const removeItem = (i: number) => {
    setItems(prev => prev.filter((_, idx) => idx !== i));
  };

  const runBatch = async () => {
    if (!items.length || running) return;
    setRunning(true);

    // Process one-by-one to show per-image progress
    for (let i = 0; i < items.length; i++) {
      setItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: "processing" } : it));
      try {
        const res = await DetectionApi.image(items[i].file);
        setItems(prev => prev.map((it, idx) =>
          idx === i ? { ...it, status: "done", result: res } : it
        ));
      } catch (e: any) {
        setItems(prev => prev.map((it, idx) =>
          idx === i ? { ...it, status: "error", error: e.message || "Detection failed" } : it
        ));
      }
    }
    setRunning(false);
  };

  const reset = () => {
    setItems([]);
    setRunning(false);
  };

  const exportCSV = () => {
    const rows = [["Filename", "Sign Detected", "Confidence (%)", "Meaning", "Engine", "Status"]];
    items.forEach(it => {
      if (it.status === "done" && it.result?.detections?.length) {
        it.result.detections.forEach((d: any) => {
          rows.push([
            it.file.name,
            d.label,
            ((d.confidence || 0) * 100).toFixed(1),
            d.meaning || "",
            it.result.engine || "",
            "Detected",
          ]);
        });
      } else {
        rows.push([it.file.name, "", "", "", "", it.status === "error" ? "Error" : "No sign found"]);
      }
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "batch_detection_results.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const done = items.filter(i => i.status === "done").length;
  const errors = items.filter(i => i.status === "error").length;

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold font-display flex items-center gap-2">
          <Images className="text-signal" size={28} />
          Batch Image Detection
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Upload up to 10 traffic sign images at once. Each is processed through the full AI pipeline and results are shown side by side.
        </p>
      </div>

      {/* Upload zone */}
      {items.length < 10 && (
        <div
          className="card border-2 border-dashed border-signal/40 hover:border-signal/80 transition-colors cursor-pointer flex flex-col items-center justify-center p-8 gap-3 text-center"
          onClick={() => inputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
        >
          <Upload size={32} className="text-signal opacity-60" />
          <div>
            <p className="font-bold text-slate-700 dark:text-slate-200">Drop images here or click to browse</p>
            <p className="text-xs text-slate-400 mt-1">PNG, JPG, JPEG · Up to 10 images · {10 - items.length} slots remaining</p>
          </div>
          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={e => e.target.files && addFiles(e.target.files)} />
        </div>
      )}

      {/* Controls */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={runBatch}
            disabled={running || items.every(i => i.status === "done" || i.status === "error")}
            className="btn-primary flex items-center gap-2 py-2"
          >
            {running
              ? <><Loader size={15} className="animate-spin" /> Analysing {done + errors + 1}/{items.length}...</>
              : <><Images size={15} /> Analyse All {items.length} Images</>
            }
          </button>
          {(done + errors) === items.length && items.length > 0 && (
            <button onClick={exportCSV} className="btn-ghost flex items-center gap-2 py-2 text-sm">
              <Download size={14} /> Export CSV
            </button>
          )}
          <button onClick={reset} className="btn-ghost flex items-center gap-2 py-2 text-sm text-slate-500">
            <RotateCcw size={14} /> Reset
          </button>
          <span className="text-xs text-slate-400 ml-auto">
            {done} done · {errors} errors · {items.filter(i => i.status === "pending").length} pending
          </span>
        </div>
      )}

      {/* Results grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it, idx) => (
          <div key={idx} className="card p-0 overflow-hidden flex flex-col">
            {/* Image preview */}
            <div className="relative bg-asphalt-900 aspect-video flex items-center justify-center overflow-hidden">
              <img src={it.preview} alt={it.file.name} className="object-contain w-full h-full max-h-44" />

              {/* Status overlay */}
              {it.status === "processing" && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2 text-white text-xs">
                    <div className="animate-spin h-6 w-6 border-b-2 border-signal rounded-full" />
                    Analysing...
                  </div>
                </div>
              )}
              {it.status === "done" && (
                <div className="absolute top-2 left-2 bg-go text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle size={10} /> Done
                </div>
              )}
              {it.status === "error" && (
                <div className="absolute top-2 left-2 bg-alert text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <AlertCircle size={10} /> Error
                </div>
              )}

              {/* Remove button */}
              {!running && it.status === "pending" && (
                <button onClick={() => removeItem(idx)} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/80">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Info */}
            <div className="p-3 flex-1 space-y-2">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{it.file.name}</p>
              <p className="text-[10px] text-slate-400">{(it.file.size / 1024).toFixed(0)} KB</p>

              {it.status === "done" && it.result?.detections?.length > 0 && (
                <div className="space-y-1.5">
                  {it.result.detections.slice(0, 3).map((d: any, di: number) => (
                    <div key={di} className="bg-slate-50 dark:bg-asphalt-700 rounded-lg p-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800 dark:text-slate-100 truncate">{d.label}</span>
                        <span className="text-signal font-semibold shrink-0 ml-1">{((d.confidence || 0) * 100).toFixed(0)}%</span>
                      </div>
                      {d.meaning && <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2 leading-snug">{d.meaning}</p>}
                    </div>
                  ))}
                  <button
                    onClick={() => { const d = it.result.detections[0]; speak(`${d.label}. ${d.meaning || ""}`); }}
                    className="text-[10px] text-signal hover:underline"
                  >
                    🔊 Read aloud
                  </button>
                </div>
              )}

              {it.status === "done" && (!it.result?.detections || it.result.detections.length === 0) && (
                <p className="text-[10px] text-slate-400 italic">No traffic signs detected</p>
              )}

              {it.status === "error" && (
                <p className="text-[10px] text-alert">{it.error}</p>
              )}

              {it.status === "pending" && (
                <p className="text-[10px] text-slate-400 italic">Waiting to be analysed...</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="card text-center p-12 space-y-3 text-slate-400">
          <Images size={40} className="mx-auto opacity-30" />
          <p className="text-sm">No images selected yet. Upload up to 10 images to start batch analysis.</p>
        </div>
      )}
    </div>
  );
}
