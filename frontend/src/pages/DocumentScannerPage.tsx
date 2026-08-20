import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DocumentApi, MyFinesApi } from "@/services/api";
import { useLang } from "@/context/LanguageContext";
import {
  RotateCcw, XCircle, CheckCircle2, AlertTriangle, Clock,
  Gavel, Car, ScrollText, ShieldAlert, FileCheck2, Infinity as InfinityIcon,
  Banknote, Siren, ChevronDown, BookmarkPlus,
} from "lucide-react";
import UploadBox from "@/components/detection/UploadBox";
import PaymentChannels from "@/components/fines/PaymentChannels";

const L = {
  title:    { en: "Road Document Scanner", ta: "வாகன ஆவண ஸ்கேனர்", si: "මාර්ග ලේඛන ස්කෑනරය" },
  subtitle: { en: "Upload any Sri Lankan road document — the AI works out what it is, reads it, and tells you when it expires.",
              ta: "எந்த இலங்கை வாகன ஆவணத்தையும் பதிவேற்றுங்கள் — AI அது என்னவென்று கண்டறிந்து, படித்து, எப்போது காலாவதியாகும் எனச் சொல்லும்.",
              si: "ඕනෑම ශ්‍රී ලංකා මාර්ග ලේඛනයක් උඩුගත කරන්න — AI එය හඳුනාගෙන, කියවා, කල් ඉකුත්වන දිනය කියයි." },
  supported:{ en: "Supported documents", ta: "ஆதரிக்கப்படும் ஆவணங்கள்", si: "සහාය දක්වන ලේඛන" },
  drag:     { en: "Drag and drop the document photo, or click to upload", ta: "ஆவணப் படத்தை இழுத்து விடுங்கள்", si: "ලේඛනයේ ඡායාරූපය මෙහි දමන්න" },
  sub:      { en: "JPG or PNG — a clear, well-lit photo of the whole document", ta: "JPG அல்லது PNG — முழு ஆவணமும் தெளிவாகத் தெரியவேண்டும்", si: "JPG හෝ PNG — සම්පූර්ණ ලේඛනය පැහැදිලිව" },
  reading:  { en: "Reading the document…", ta: "ஆவணம் படிக்கப்படுகிறது…", si: "ලේඛනය කියවමින්…" },
  results:  { en: "Extracted Details", ta: "எடுக்கப்பட்ட விவரங்கள்", si: "ලබාගත් විස්තර" },
  waiting:  { en: "Upload a document photo to begin.", ta: "தொடங்க ஒரு படத்தை பதிவேற்றுங்கள்.", si: "ආරම්භ කිරීමට ඡායාරූපයක් උඩුගත කරන්න." },
  failed:   { en: "Could not read the document", ta: "படிக்க முடியவில்லை", si: "කියවීමට නොහැකි විය" },
  reset:    { en: "Reset", ta: "மீட்டமை", si: "යළි පිහිටුවන්න" },
  details:  { en: "Document Information", ta: "ஆவண விவரம்", si: "ලේඛන තොරතුරු" },
  court:    { en: "Court", ta: "நீதிமன்றம்", si: "අධිකරණය" },
  allowed:  { en: "Vehicles You May Drive", ta: "ஓட்ட அனுமதிக்கப்பட்ட வாகனங்கள்", si: "ධාවනය කිරීමට අවසර ඇති වාහන" },
  provision:{ en: "Matching Spot-Fine Provision", ta: "பொருந்தும் அபராதப் பிரிவு", si: "අදාළ දඩ වගන්තිය" },
  payFine:  { en: "Fine Payment", ta: "அபராதம் செலுத்துதல்", si: "දඩ ගෙවීම" },
  payWhere: { en: "Where to pay", ta: "எங்கே செலுத்துவது", si: "ගෙවිය හැක්කේ කොහෙන්ද" },
  stopped:  { en: "Police stopped you — what to do", ta: "பொலிஸ் நிறுத்தினால் — என்ன செய்வது", si: "පොලිසිය නැවැත්වූ විට — කුමක් කළ යුතුද" },
  saveFine: { en: "Track this fine", ta: "இந்த அபராதத்தைக் கண்காணி", si: "මෙම දඩය නිරීක්ෂණය කරන්න" },
  saving:   { en: "Saving…", ta: "சேமிக்கப்படுகிறது…", si: "සුරකිමින්…" },
  saved:    { en: "Saved to My Fines", ta: "எனது அபராதங்களில் சேமிக்கப்பட்டது", si: "මගේ දඩ වෙත සුරකින ලදී" },
  openFines:{ en: "Open My Fines", ta: "எனது அபராதங்களைத் திற", si: "මගේ දඩ විවෘත කරන්න" },
  saveErr:  { en: "Could not save this fine.", ta: "இந்த அபராதத்தைச் சேமிக்க முடியவில்லை.", si: "මෙම දඩය සුරැකීමට නොහැකි විය." },
};

/** Pull the scanner's label/value pairs back into the field keys the tracker stores. */
function fieldValue(result: any, key: string): string | undefined {
  return result?.fields?.find((f: any) => f.key === key)?.value;
}

/** Gemini returns dates in several shapes — the API only accepts ISO. */
function toIsoDate(value?: string): string | undefined {
  if (!value) return undefined;
  const text = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const m = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (!m) return undefined;
  const [, d, mo, y] = m;
  const year = y.length === 2 ? `20${y}` : y;
  return `${year}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

const STATUS_STYLE: Record<string, { box: string; icon: any; tone: string; bar: string }> = {
  valid:          { box: "border-go/40 bg-go/5",         icon: CheckCircle2,  tone: "text-go",       bar: "bg-go" },
  expiring:       { box: "border-signal/40 bg-signal/5", icon: AlertTriangle, tone: "text-signal",   bar: "bg-signal" },
  expired:        { box: "border-alert/40 bg-alert/5",   icon: XCircle,       tone: "text-alert",    bar: "bg-alert" },
  not_applicable: { box: "border-slate-300 bg-slate-50 dark:bg-asphalt-700/40 dark:border-asphalt-700", icon: InfinityIcon,  tone: "text-slate-500", bar: "bg-slate-400" },
  unknown:        { box: "border-slate-300 bg-slate-50 dark:bg-asphalt-700/40 dark:border-asphalt-700", icon: AlertTriangle, tone: "text-slate-500", bar: "bg-slate-400" },
};

function headline(expiry: any): string {
  if (expiry.status === "not_applicable") return "No expiry";
  if (expiry.status === "expired") return "Expired";
  if (expiry.days_remaining !== null) return `${expiry.days_remaining} day(s) remaining`;
  return "Expiry unknown";
}

export default function DocumentScannerPage() {
  const { lang } = useLang();
  const tr = (k: keyof typeof L) => L[k][lang as "en" | "ta" | "si"] ?? L[k].en;

  const [types, setTypes] = useState<any[]>([]);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => { DocumentApi.types().then(setTypes).catch(() => setTypes([])); }, []);

  const runFile = async (file: File) => {
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setError(null);
    setSaveState("idle");
    setBusy(true);
    try {
      setResult(await DocumentApi.scan(file));
    } catch (err: any) {
      setError(err.message || "Failed to read the document. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => { setPreview(""); setResult(null); setError(null); setSaveState("idle"); };

  /** Send a scanned charge sheet straight to the My Fines tracker. */
  const trackFine = async () => {
    if (!result) return;
    setSaveState("saving");
    const issued = toIsoDate(fieldValue(result, "date_of_offence"));
    const amount = Number(
      String(fieldValue(result, "fine_amount_lkr") ?? "").replace(/[^\d.]/g, "")
    );
    try {
      await MyFinesApi.create({
        offence: fieldValue(result, "offence_description") || result.document_label,
        fine_amount_lkr: Number.isFinite(amount) && amount > 0 ? amount : 0,
        issued_date: issued ?? new Date().toISOString().slice(0, 10),
        due_date: toIsoDate(fieldValue(result, "payment_due_date")),
        reference_no: fieldValue(result, "charge_sheet_no"),
        section: fieldValue(result, "section"),
        place_of_offence: fieldValue(result, "place_of_offence"),
        vehicle_no: fieldValue(result, "vehicle_no"),
        police_station: fieldValue(result, "police_station"),
        officer_no: fieldValue(result, "officer_no"),
        court: fieldValue(result, "court"),
        court_date: toIsoDate(fieldValue(result, "court_date")),
        licence_withheld: result.document_type === "temporary_permit",
        notes: "Added from the Document Scanner — check the values against the paper.",
      });
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  const expiry = result?.expiry;
  const style = STATUS_STYLE[expiry?.status ?? "unknown"];
  const StatusIcon = style?.icon ?? AlertTriangle;
  const extras = result?.extras ?? {};

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display">{tr("title")}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">{tr("subtitle")}</p>
        </div>
        {preview && (
          <button className="btn-ghost text-slate-500 flex items-center gap-2 shrink-0" onClick={reset}>
            <RotateCcw size={16} /> {tr("reset")}
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Upload / preview */}
        <div className="lg:col-span-5 space-y-4">
          {!preview ? (
            <UploadBox onFileSelected={runFile} accept="image/*" label={tr("drag")} sublabel={tr("sub")} />
          ) : (
            <div className="card p-3">
              <img src={preview} alt="Uploaded document" className="w-full rounded-xl border border-slate-200 dark:border-asphalt-700" />
            </div>
          )}

          {types.length > 0 && !result && (
            <div className="card p-4 space-y-2">
              <p className="font-bold font-display text-sm flex items-center gap-2">
                <FileCheck2 size={15} /> {tr("supported")}
              </p>
              <ul className="space-y-1.5">
                {types.map((t) => (
                  <li key={t.key} className="flex items-start gap-2 text-xs">
                    <span className="text-signal mt-0.5">•</span>
                    <span>
                      <span className="font-medium text-slate-700 dark:text-slate-200">{t.label}</span>
                      {!t.expires && <span className="text-slate-400"> — no expiry</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card border-signal/30 bg-signal/5 flex gap-3 p-4">
            <ShieldAlert className="text-signal shrink-0 mt-0.5" size={18} />
            <p className="text-xs text-slate-600 dark:text-slate-300">
              These documents contain personal data (name, address, NIC, chassis number). The image is
              sent to the AI reader for this scan only and is not stored by the system. Use a redacted
              copy for demos and screenshots.
            </p>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-xl font-bold font-display tracking-tight">{tr("results")}</h2>

          {busy && (
            <div className="card flex flex-col items-center justify-center p-8 space-y-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-signal" />
              <p className="text-slate-600 dark:text-slate-300 font-medium">{tr("reading")}</p>
            </div>
          )}

          {!busy && error && (
            <div className="card border-alert/30 bg-alert/5 flex items-start gap-3 p-4">
              <XCircle className="text-alert shrink-0 mt-0.5" size={18} />
              <div>
                <p className="font-semibold text-alert text-sm">{tr("failed")}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {!busy && !result && !error && (
            <div className="card text-center p-8 text-slate-500 text-sm">{tr("waiting")}</div>
          )}

          {!busy && result && (
            <div className="space-y-4">
              {/* Detected type */}
              <div className="card flex items-center gap-3 p-4">
                <FileCheck2 className="text-signal shrink-0" size={18} />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Detected document</p>
                  <p className="text-sm font-semibold">{result.document_label}</p>
                </div>
              </div>

              {/* Expiry banner */}
              <div className={`card flex items-start gap-3 p-4 ${style.box}`}>
                <StatusIcon className={`${style.tone} shrink-0 mt-0.5`} size={20} />
                <div className="flex-1 space-y-2">
                  <p className={`font-bold ${style.tone}`}>{headline(expiry)}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{expiry.message}</p>
                  {expiry.percent_elapsed !== null && (
                    <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-asphalt-700 overflow-hidden">
                      <div className={`h-full rounded-full ${style.bar}`}
                        style={{ width: `${Math.min(100, expiry.percent_elapsed)}%` }} />
                    </div>
                  )}
                </div>
              </div>

              {/* Send a police-issued document to the My Fines tracker */}
              {extras.police_stop_guide?.length > 0 && (
                <div className="card p-4 flex flex-wrap items-center gap-3">
                  <BookmarkPlus className="text-signal shrink-0" size={18} />
                  {saveState === "saved" ? (
                    <>
                      <p className="text-sm font-semibold text-go flex items-center gap-1.5 flex-1">
                        <CheckCircle2 size={15} /> {tr("saved")}
                      </p>
                      <Link to="/my-fines" className="btn-ghost py-1.5 text-xs shrink-0">{tr("openFines")}</Link>
                    </>
                  ) : (
                    <>
                      <p className="text-sm flex-1 min-w-0">{tr("saveFine")}</p>
                      <button
                        className="btn-primary py-1.5 text-xs shrink-0"
                        onClick={trackFine}
                        disabled={saveState === "saving"}
                      >
                        {saveState === "saving" ? tr("saving") : tr("saveFine")}
                      </button>
                    </>
                  )}
                  {saveState === "error" && (
                    <p className="text-xs text-alert w-full">{tr("saveErr")}</p>
                  )}
                </div>
              )}

              {/* Court countdown (temporary permit only) */}
              {extras.court && (
                <div className="card flex items-center gap-3 p-4">
                  <Gavel className="text-signal shrink-0" size={18} />
                  <div>
                    <p className="text-sm font-semibold">{tr("court")} — {extras.court.court_date}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Clock size={12} /> {extras.court.message}
                    </p>
                  </div>
                </div>
              )}

              {/* Extracted fields */}
              {result.fields.length > 0 && (
                <div className="card p-4 space-y-3">
                  <p className="font-bold font-display text-sm">{tr("details")}</p>
                  <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                    {result.fields.map((f: any) => (
                      <div key={f.key} className="min-w-0">
                        <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{f.label}</dt>
                        <dd className="text-sm text-slate-700 dark:text-slate-200 break-words">{f.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {/* Decoded licence categories */}
              {extras.categories?.length > 0 && (
                <div className="card p-4 space-y-3">
                  <p className="font-bold font-display text-sm flex items-center gap-2"><Car size={15} /> {tr("allowed")}</p>
                  {extras.categories.map((c: any) => (
                    <div key={c.code} className="flex gap-3 items-start">
                      <span className="shrink-0 rounded-lg bg-signal/15 text-signal font-bold text-xs px-2.5 py-1">{c.code}</span>
                      <div>
                        <p className="text-sm font-medium">{c.vehicle}</p>
                        {c.description && <p className="text-xs text-slate-500 mt-0.5">{c.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Spot-fine payment — amount, deadline, where to pay */}
              {extras.payment && (
                <div className={`card p-4 space-y-3 ${
                  extras.payment.days_left !== null && extras.payment.days_left < 0
                    ? "border-alert/40 bg-alert/5"
                    : "border-signal/40 bg-signal/5"}`}>
                  <div className="flex items-start gap-3">
                    <Banknote className="text-signal shrink-0 mt-0.5" size={18} />
                    <div className="flex-1">
                      <p className="font-bold font-display text-sm">{tr("payFine")}</p>
                      {extras.payment.amount_lkr && (
                        <p className="display text-2xl font-bold text-signal mt-1">
                          {Number(extras.payment.amount_lkr).toLocaleString()} LKR
                        </p>
                      )}
                      {extras.payment.due_date && (
                        <p className="text-xs text-slate-500 mt-0.5">Due {extras.payment.due_date}</p>
                      )}
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5">{extras.payment.message}</p>
                    </div>
                  </div>
                  <div className="border-t border-slate-200 dark:border-asphalt-700 pt-3 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{tr("payWhere")}</p>
                    <PaymentChannels channels={extras.payment.channels} note={extras.payment.note} />
                  </div>
                </div>
              )}

              {/* Matched spot-fine provision */}
              {extras.offence && (
                <div className="card p-4 space-y-1">
                  <p className="font-bold font-display text-sm flex items-center gap-2"><ScrollText size={15} /> {tr("provision")}</p>
                  <p className="text-sm">
                    <span className="font-semibold text-signal">Section {extras.offence.section}</span> — {extras.offence.provision}
                  </p>
                  <p className="text-xs text-slate-500">Schedule item {extras.offence.serial}, Section 215A spot-fine list.</p>
                </div>
              )}

              {/* Police stop checklist — for any police-issued document */}
              {extras.police_stop_guide?.length > 0 && (
                <details className="card p-4 group">
                  <summary className="flex items-center gap-2 cursor-pointer list-none font-bold font-display text-sm">
                    <Siren size={15} className="text-alert" />
                    <span className="flex-1">{tr("stopped")}</span>
                    <ChevronDown size={15} className="text-slate-400 transition-transform group-open:rotate-180" />
                  </summary>
                  <ol className="mt-3 space-y-2.5">
                    {extras.police_stop_guide.map((s: any) => (
                      <li key={s.step} className="flex gap-3">
                        <span className="shrink-0 h-5 w-5 rounded-full bg-signal/15 text-signal text-[11px] font-bold flex items-center justify-center">
                          {s.step}
                        </span>
                        <div>
                          <p className="text-sm font-medium">{s.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{s.detail}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </details>
              )}

              {/* AI reliability notice */}
              <div className="card border-slate-200 dark:border-asphalt-700 flex gap-3 p-4">
                <AlertTriangle className="text-slate-400 shrink-0 mt-0.5" size={16} />
                <div className="text-xs text-slate-500 space-y-1">
                  <p>{result.notice}</p>
                  {result.confidence != null && <p>AI confidence: {Math.round(result.confidence * 100)}%</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
