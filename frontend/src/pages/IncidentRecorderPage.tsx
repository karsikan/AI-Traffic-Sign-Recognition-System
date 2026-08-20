import { useEffect, useRef, useState } from "react";
import { useLang } from "@/context/LanguageContext";
import { IncidentApi } from "@/services/api";
import { localStore, onStoreChange } from "@/services/localStore";
import { mediaStore, blobUrl, downloadMedia, type MediaRecord } from "@/services/mediaStore";
import {
  Camera, Mic, Square, Plus, X, Trash2, MapPin, FileText, Copy,
  AlertTriangle, Info, ShieldAlert, Check, Clock, Image as ImageIcon, Download
} from "lucide-react";

// ── Trilingual UI labels ─────────────────────────────────────────────────────
const UI = {
  en: {
    title: "Incident Recorder",
    sub: "A timestamped, located note made while the details are fresh — with the photos and voice notes attached. Everything stays on this machine.",
    start: "Start a record", newTitle: "New incident", cancel: "Cancel", save: "Save and start capturing",
    type: "What happened", label: "Title", desc: "What happened, in your words",
    officerNo: "Officer's number", officerName: "Officer's name", station: "Police station",
    vehicle: "Vehicle no", other: "Other party / witnesses", place: "Where you are",
    useGps: "Use my location", gpsOn: "Location captured", gpsFail: "Location unavailable",
    capture: "Capture evidence", photo: "Photo", audio: "Voice note", recording: "Recording — tap to stop",
    micDenied: "Microphone permission denied.", camDenied: "Could not open the camera.",
    attached: "Attached", noMedia: "Nothing attached yet.",
    checklist: "What to capture, in order",
    statement: "Statement", makeStatement: "Write it up as a statement", copy: "Copy", copied: "Copied",
    delete: "Delete", confirmDelete: "Delete this record and all its files?",
    empty: "No records yet. Start one the moment something happens — not afterwards.",
    records: "Your records",
    download: "Save to device",
    mediaLocal: "Photos and recordings stay on this device. Tap one to save it as a file — browser data can be cleared.",
    loading: "Loading…", failed: "Could not load. Is the backend running on port 8000?",
    required: "Give the record a title first.",
    legal: "Before you record",
  },
  ta: {
    title: "சம்பவப் பதிவு",
    sub: "விவரங்கள் நினைவில் இருக்கும்போதே நேரம் மற்றும் இடத்துடன் பதிவு — படங்கள், குரல் குறிப்புகளுடன். எல்லாம் இந்தக் கணினியிலேயே இருக்கும்.",
    start: "பதிவு தொடங்கு", newTitle: "புதிய சம்பவம்", cancel: "ரத்து", save: "சேமித்து பதிவு தொடங்கு",
    type: "என்ன நடந்தது", label: "தலைப்பு", desc: "நடந்ததை உங்கள் வார்த்தையில்",
    officerNo: "அதிகாரி இலக்கம்", officerName: "அதிகாரி பெயர்", station: "பொலிஸ் நிலையம்",
    vehicle: "வாகன இலக்கம்", other: "மற்ற தரப்பு / சாட்சிகள்", place: "நீங்கள் இருக்கும் இடம்",
    useGps: "எனது இருப்பிடத்தைப் பயன்படுத்து", gpsOn: "இருப்பிடம் பதிவானது", gpsFail: "இருப்பிடம் கிடைக்கவில்லை",
    capture: "ஆதாரம் சேகரி", photo: "படம்", audio: "குரல் குறிப்பு", recording: "பதிவாகிறது — நிறுத்த அழுத்துங்கள்",
    micDenied: "மைக்ரோஃபோன் அனுமதி மறுக்கப்பட்டது.", camDenied: "கேமராவைத் திறக்க முடியவில்லை.",
    attached: "இணைக்கப்பட்டவை", noMedia: "இதுவரை எதுவும் இணைக்கப்படவில்லை.",
    checklist: "வரிசையாக என்ன சேகரிக்க வேண்டும்",
    statement: "அறிக்கை", makeStatement: "அறிக்கையாக எழுது", copy: "நகலெடு", copied: "நகலெடுக்கப்பட்டது",
    delete: "நீக்கு", confirmDelete: "இந்தப் பதிவையும் அதன் கோப்புகளையும் நீக்கவா?",
    empty: "இதுவரை பதிவு இல்லை. சம்பவம் நடந்த உடனேயே தொடங்குங்கள் — பிறகு அல்ல.",
    records: "உங்கள் பதிவுகள்",
    download: "சாதனத்தில் சேமி",
    mediaLocal: "படங்களும் ஒலிப்பதிவுகளும் இந்த சாதனத்திலேயே இருக்கும். File ஆ சேமிக்க அழுத்துங்கள் — browser data அழிக்கப்பட்டால் போயிடும்.",
    loading: "ஏற்றப்படுகிறது…", failed: "ஏற்ற முடியவில்லை. Backend port 8000-ல் இயங்குகிறதா?",
    required: "முதலில் தலைப்பு கொடுங்கள்.",
    legal: "பதிவு செய்வதற்கு முன்",
  },
  si: {
    title: "සිද්ධි වාර්තාකරණය",
    sub: "විස්තර මතකයේ ඇති විටම වේලාව සහ ස්ථානය සමඟ සටහනක් — ඡායාරූප සහ හඬ සටහන් සමඟ. සියල්ල මෙම පරිගණකයේම රැඳේ.",
    start: "වාර්තාවක් ආරම්භ කරන්න", newTitle: "නව සිද්ධිය", cancel: "අවලංගු", save: "සුරකා ආරම්භ කරන්න",
    type: "සිදුවූයේ කුමක්ද", label: "මාතෘකාව", desc: "සිදුවූ දේ ඔබේ වචනවලින්",
    officerNo: "නිලධාරි අංකය", officerName: "නිලධාරියාගේ නම", station: "පොලිස් ස්ථානය",
    vehicle: "වාහන අංකය", other: "අනෙක් පාර්ශ්වය / සාක්ෂිකරුවන්", place: "ඔබ සිටින ස්ථානය",
    useGps: "මගේ ස්ථානය භාවිතා කරන්න", gpsOn: "ස්ථානය සටහන් විය", gpsFail: "ස්ථානය ලබාගත නොහැක",
    capture: "සාක්ෂි එකතු කරන්න", photo: "ඡායාරූපය", audio: "හඬ සටහන", recording: "පටිගත වෙමින් — නැවැත්වීමට තට්ටු කරන්න",
    micDenied: "මයික්‍රොෆෝන අවසරය ප්‍රතික්ෂේප විය.", camDenied: "කැමරාව විවෘත කළ නොහැකි විය.",
    attached: "අමුණා ඇත", noMedia: "තවම කිසිවක් අමුණා නැත.",
    checklist: "පිළිවෙලින් එකතු කළ යුතු දේ",
    statement: "ප්‍රකාශය", makeStatement: "ප්‍රකාශයක් ලෙස ලියන්න", copy: "පිටපත් කරන්න", copied: "පිටපත් විය",
    delete: "මකන්න", confirmDelete: "මෙම වාර්තාව සහ එහි ගොනු මකන්නද?",
    empty: "තවම වාර්තා නැත. සිද්ධිය සිදුවන විටම ආරම්භ කරන්න — පසුව නොවේ.",
    records: "ඔබේ වාර්තා",
    download: "උපාංගයට සුරකින්න",
    mediaLocal: "ඡායාරූප සහ පටිගත කිරීම් මෙම උපාංගයේම රැඳේ. ගොනුවක් ලෙස සුරැකීමට ඔබන්න — browser දත්ත මකා දැමුවහොත් නැති වේ.",
    loading: "පූරණය වෙමින්…", failed: "පූරණය කළ නොහැකි විය. Backend port 8000 හි ක්‍රියාත්මකද?",
    required: "පළමුව මාතෘකාවක් දෙන්න.",
    legal: "පටිගත කිරීමට පෙර",
  },
};

type LabelKey = keyof typeof UI.en;


export default function IncidentRecorderPage() {
  const { lang } = useLang();
  const tr = (k: LabelKey): string => UI[(lang as "en" | "ta" | "si")]?.[k] ?? UI.en[k];

  const [incidents, setIncidents] = useState<any[]>([]);
  const [guide, setGuide] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({ incident_type: "police_dispute" });
  const [formError, setFormError] = useState("");
  const [gps, setGps] = useState<"idle" | "ok" | "fail">("idle");

  const [activeId, setActiveId] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [statement, setStatement] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  /**
   * Incidents live on this device: the written record in localStorage, the photos and
   * voice notes in IndexedDB. None of it is uploaded — this is somebody's evidence.
   */
  const load = async () => {
    const stored = localStore.list("incidents");
    const withMedia = await Promise.all(
      stored.map(async (i) => {
        const media = await mediaStore.listFor(i.id).catch(() => [] as MediaRecord[]);
        return {
          ...i,
          media,
          media_count: media.length,
          maps_url:
            i.latitude != null && i.longitude != null
              ? `https://www.google.com/maps/search/?api=1&query=${i.latitude},${i.longitude}`
              : null,
        };
      })
    );
    setIncidents(withMedia);
    setError(false);
    setLoading(false);
  };

  useEffect(() => {
    load();
    IncidentApi.guide().then(setGuide).catch(() => setGuide(null));
    const off = onStoreChange(load);
    return () => {
      off();
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const grabLocation = () => {
    if (!navigator.geolocation) { setGps("fail"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
        setGps("ok");
      },
      () => setGps("fail"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const submit = async () => {
    if (!form.title) { setFormError(tr("required")); return; }
    try {
      const payload = { ...form, occurred_at: new Date().toISOString() };
      const created = localStore.create("incidents", payload);
      setForm({ incident_type: "police_dispute" });
      setGps("idle");
      setFormError("");
      setAdding(false);
      setActiveId(created.id);
    } catch (e: any) {
      setFormError(e.message || "Could not save.");
    }
  };

  const attachPhoto = async (file: File) => {
    if (activeId === null) return;
    setMediaError("");
    try {
      await mediaStore.add(activeId, "photo", file, file.name);
      load();
    } catch (e: any) {
      setMediaError(e.message || tr("camDenied"));
    }
  };

  const toggleRecording = async () => {
    if (activeId === null) return;
    setMediaError("");

    if (recording) {
      recorderRef.current?.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        try {
          await mediaStore.add(activeId, "audio", blob, "voice-note.webm");
          load();
        } catch (e: any) {
          setMediaError(e.message || "Could not attach the recording.");
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      setMediaError(tr("micDenied"));
    }
  };

  /**
   * The statement is written here rather than on the server, because sending the record
   * away to have it formatted would defeat the point of keeping it on the device.
   */
  const showStatement = (id: number) => {
    const incident = incidents.find((i) => i.id === id);
    if (!incident) return;

    const when = incident.occurred_at
      ? new Date(incident.occurred_at).toLocaleString("en-GB", {
          day: "numeric", month: "long", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        })
      : "an unrecorded time";

    const lines: string[] = [`On ${when} the following was recorded.`];
    if (incident.location_note) lines.push(`Location: ${incident.location_note}.`);
    if (incident.latitude != null && incident.longitude != null) {
      lines.push(`GPS position: ${Number(incident.latitude).toFixed(6)}, ${Number(incident.longitude).toFixed(6)}.`);
    }
    if (incident.vehicle_no) lines.push(`Vehicle driven: ${incident.vehicle_no}.`);

    const who = [
      incident.officer_no ? `officer number ${incident.officer_no}` : null,
      incident.officer_name ? `name given as ${incident.officer_name}` : null,
      incident.police_station ? `station ${incident.police_station}` : null,
    ].filter(Boolean).join(", ");
    if (who) lines.push(`Officer involved: ${who}.`);
    if (incident.other_party) lines.push(`Other party: ${incident.other_party}`);

    if (incident.description) {
      lines.push("", "Account:", incident.description);
    }

    const media: MediaRecord[] = incident.media ?? [];
    if (media.length) {
      const counts = media.reduce<Record<string, number>>((acc, m) => {
        acc[m.media_type] = (acc[m.media_type] || 0) + 1;
        return acc;
      }, {});
      const summary = Object.entries(counts)
        .map(([kind, n]) => `${n} ${kind}${n > 1 ? "s" : ""}`)
        .join(", ");
      lines.push("", `Attached evidence: ${summary}, captured at the time.`);
    }

    setStatement({
      incident_id: id,
      title: incident.title || "Incident record",
      statement: lines.join("\n"),
      media_count: media.length,
      note: "Generated from what you entered. Read it through and correct anything before relying on it — it is your statement, not a legal document.",
    });
    setCopied(false);
  };

  const copyStatement = async () => {
    if (!statement) return;
    await navigator.clipboard.writeText(statement.statement);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const remove = async (id: number) => {
    await mediaStore.removeFor(id).catch(() => {});
    localStore.remove("incidents", id);
    if (activeId === id) setActiveId(null);
    if (statement?.incident_id === id) setStatement(null);
  };

  if (error) {
    return (
      <div className="card border-alert/30 bg-alert/5 flex items-start gap-3">
        <AlertTriangle className="text-alert shrink-0 mt-0.5" size={18} />
        <p className="text-sm text-slate-600 dark:text-slate-300">{tr("failed")}</p>
      </div>
    );
  }

  const field = (key: string, label: string) => (
    <div>
      <label className="label text-xs">{label}</label>
      <input className="input py-2 text-sm" value={form[key] ?? ""}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display">{tr("title")}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">{tr("sub")}</p>
        </div>
        <button className="btn-primary shrink-0" onClick={() => setAdding((a) => !a)}>
          {adding ? <X size={16} /> : <Plus size={16} />} {adding ? tr("cancel") : tr("start")}
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="card space-y-4">
          <p className="font-bold font-display flex items-center gap-2">
            <Plus size={16} className="text-signal" /> {tr("newTitle")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label text-xs">{tr("type")}</label>
              <select className="input py-2 text-sm" value={form.incident_type ?? "other"}
                onChange={(e) => setForm((f) => ({ ...f, incident_type: e.target.value }))}>
                {(guide?.types ?? []).map((t: any) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">{field("title", tr("label"))}</div>
            {field("officer_no", tr("officerNo"))}
            {field("officer_name", tr("officerName"))}
            {field("police_station", tr("station"))}
            {field("vehicle_no", tr("vehicle"))}
            {field("location_note", tr("place"))}
            {field("other_party", tr("other"))}
          </div>
          <div>
            <label className="label text-xs">{tr("desc")}</label>
            <textarea className="input py-2 text-sm min-h-[90px]" value={form.description ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-ghost py-1.5 text-xs" onClick={grabLocation}>
              <MapPin size={13} /> {tr("useGps")}
            </button>
            {gps === "ok" && (
              <span className="text-xs text-go flex items-center gap-1">
                <Check size={13} /> {tr("gpsOn")} ({form.latitude?.toFixed(4)}, {form.longitude?.toFixed(4)})
              </span>
            )}
            {gps === "fail" && <span className="text-xs text-alert">{tr("gpsFail")}</span>}
          </div>
          {formError && <p className="text-xs text-alert">{formError}</p>}
          <div className="flex gap-2">
            <button className="btn-primary" onClick={submit}>{tr("save")}</button>
            <button className="btn-ghost" onClick={() => { setAdding(false); setFormError(""); }}>{tr("cancel")}</button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Records */}
        <div className="lg:col-span-7 space-y-4">
          <p className="font-bold font-display text-sm">{tr("records")}</p>

          {loading ? (
            <div className="card flex flex-col items-center justify-center p-10 space-y-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-signal" />
              <p className="text-slate-600 dark:text-slate-300 font-medium">{tr("loading")}</p>
            </div>
          ) : incidents.length === 0 ? (
            <div className="card text-center p-8 text-sm text-slate-500">{tr("empty")}</div>
          ) : (
            incidents.map((inc) => {
              const active = activeId === inc.id;
              return (
                <div key={inc.id} className={`card space-y-3 ${active ? "border-signal/40 bg-signal/5" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-snug">{inc.title || "Untitled record"}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1"><Clock size={11} />
                          {new Date(inc.occurred_at).toLocaleString()}
                        </span>
                        {inc.officer_no && <span>· {tr("officerNo")} {inc.officer_no}</span>}
                        {inc.vehicle_no && <span>· {inc.vehicle_no}</span>}
                        {inc.media_count > 0 && (
                          <span className="flex items-center gap-1">· <ImageIcon size={11} /> {inc.media_count}</span>
                        )}
                      </div>
                    </div>
                    <button className="btn-ghost shrink-0 px-2 py-1 text-alert border-alert/30"
                      aria-label={tr("delete")}
                      onClick={() => { if (window.confirm(tr("confirmDelete"))) remove(inc.id); }}>
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {inc.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-300">{inc.description}</p>
                  )}

                  {inc.maps_url && (
                    <a href={inc.maps_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-signal flex items-center gap-1 hover:underline w-fit">
                      <MapPin size={12} /> {inc.location_note || `${inc.latitude?.toFixed(5)}, ${inc.longitude?.toFixed(5)}`}
                    </a>
                  )}

                  {/* Attached media */}
                  {inc.media.length > 0 && (
                    <div className="space-y-2 border-t border-slate-100 dark:border-asphalt-700 pt-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{tr("attached")}</p>
                      <div className="flex flex-wrap gap-2">
                        {inc.media.filter((m: MediaRecord) => m.media_type === "photo").map((m: MediaRecord) => (
                          <button key={m.id} onClick={() => downloadMedia(m)}
                            title={`${m.original_name} — click to save`}
                            className="relative group">
                            <img src={blobUrl(m.blob)} alt={m.original_name || "evidence"}
                              className="h-20 w-20 rounded-lg object-cover border border-slate-200 dark:border-asphalt-700" />
                            <span className="absolute inset-0 flex items-center justify-center rounded-lg
                                bg-black/50 opacity-0 group-hover:opacity-100 transition">
                              <Download size={16} className="text-white" />
                            </span>
                          </button>
                        ))}
                      </div>
                      {inc.media.filter((m: MediaRecord) => m.media_type === "audio").map((m: MediaRecord) => (
                        <div key={m.id} className="flex items-center gap-2">
                          <audio controls src={blobUrl(m.blob)} className="w-full h-9" />
                          <button className="btn-ghost px-2 py-1.5 shrink-0" title={tr("download")}
                            onClick={() => downloadMedia(m)}>
                            <Download size={13} />
                          </button>
                        </div>
                      ))}
                      <p className="text-[10px] text-slate-400">{tr("mediaLocal")}</p>
                    </div>
                  )}

                  {/* Capture controls */}
                  <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-asphalt-700 pt-3">
                    {active ? (
                      <>
                        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) attachPhoto(f); e.target.value = ""; }} />
                        <button className="btn-ghost py-1.5 text-xs" onClick={() => fileRef.current?.click()}>
                          <Camera size={13} /> {tr("photo")}
                        </button>
                        <button
                          className={`py-1.5 text-xs ${recording ? "btn-primary" : "btn-ghost"}`}
                          onClick={toggleRecording}
                        >
                          {recording ? <><Square size={13} /> {tr("recording")}</> : <><Mic size={13} /> {tr("audio")}</>}
                        </button>
                      </>
                    ) : (
                      <button className="btn-ghost py-1.5 text-xs" onClick={() => setActiveId(inc.id)}>
                        <Camera size={13} /> {tr("capture")}
                      </button>
                    )}
                    <button className="btn-ghost py-1.5 text-xs ml-auto" onClick={() => showStatement(inc.id)}>
                      <FileText size={13} /> {tr("makeStatement")}
                    </button>
                  </div>
                  {active && mediaError && <p className="text-xs text-alert">{mediaError}</p>}
                </div>
              );
            })
          )}
        </div>

        {/* Side panels */}
        <div className="lg:col-span-5 space-y-4">
          {statement && (
            <div className="card space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold font-display text-sm flex items-center gap-2">
                  <FileText size={15} className="text-signal" /> {tr("statement")}
                </p>
                <button className="btn-ghost py-1 px-2 text-xs" onClick={copyStatement}>
                  {copied ? <><Check size={12} /> {tr("copied")}</> : <><Copy size={12} /> {tr("copy")}</>}
                </button>
              </div>
              <pre className="text-xs whitespace-pre-wrap font-body text-slate-700 dark:text-slate-200
                  bg-slate-50 dark:bg-asphalt-700/40 rounded-xl p-3 max-h-80 overflow-y-auto">
                {statement.statement}
              </pre>
              <p className="text-[11px] text-slate-500 italic">{statement.note}</p>
            </div>
          )}

          {guide && (
            <>
              <div className="card space-y-3">
                <p className="font-bold font-display text-sm flex items-center gap-2">
                  <ShieldAlert size={15} className="text-signal" /> {tr("checklist")}
                </p>
                <ol className="space-y-2.5">
                  {guide.checklist.map((s: any) => (
                    <li key={s.step} className="flex gap-2.5">
                      <span className="shrink-0 h-[18px] w-[18px] rounded-full bg-signal/20 text-signal text-[10px] font-bold flex items-center justify-center">
                        {s.step}
                      </span>
                      <div>
                        <p className="text-xs font-medium">{s.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{s.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="card border-signal/30 bg-signal/5 flex gap-3">
                <Info className="text-signal shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="text-xs font-bold mb-1">{tr("legal")}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{guide.legal_note}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
