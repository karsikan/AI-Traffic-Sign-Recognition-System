import axios from "axios";
import type {
  DetectionResult, NearbyPlace,
  Prediction, TrafficSign, Lang,
} from "@/types";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

export const TOKEN_KEY = "roadsafety_token";

/** Read once per request rather than caching, so a sign-out takes effect immediately. */
client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Unwrap FastAPI success envelope
client.interceptors.response.use(
  (response) => {
    if (response.data && response.data.success === true && "data" in response.data) {
      return response.data.data;
    }
    return response.data;
  },
  (error) => {
    // A 401 means the token is gone, expired or never existed. Drop it and let the app
    // route to sign-in — but never bounce the user off the sign-in page itself, or a
    // failed login attempt would reload out from under them.
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      const path = window.location.pathname;
      if (path !== "/login" && path !== "/register") {
        window.dispatchEvent(new CustomEvent("auth:expired"));
      }
    }
    const resData = error.response?.data;
    if (resData && resData.success === false && resData.message) {
      return Promise.reject(new Error(resData.message));
    }
    return Promise.reject(error);
  }
);

export const AuthApi = {
  register: (d: { full_name: string; email: string; password: string; preferred_language: string }): Promise<any> =>
    client.post("/auth/register", d),
  login: (email: string, password: string): Promise<any> =>
    client.post("/auth/login", { email, password }),
  me: (): Promise<any> => client.get("/auth/me"),
  updateMe: (d: { full_name?: string; preferred_language?: string }): Promise<any> =>
    client.patch("/auth/me", d),
  changePassword: (current_password: string, new_password: string): Promise<any> =>
    client.post("/auth/change-password", { current_password, new_password }),
  deleteAccount: (): Promise<any> => client.delete("/auth/me"),
  logout: (): Promise<any> => client.post("/auth/logout", {}),
};

export const DetectionApi = {
  image: (file: File): Promise<DetectionResult> => {
    const fd = new FormData();
    fd.append("file", file);
    return client.post("/predict/image", fd);
  },
  video: (file: File): Promise<DetectionResult> => {
    const fd = new FormData();
    fd.append("file", file);
    return client.post("/predict/video", fd);
  },
  webcam: (file: File): Promise<DetectionResult> => {
    const fd = new FormData();
    fd.append("file", file);
    return client.post("/predict/webcam", fd);
  },
  batch: (files: File[]): Promise<{ items: any[]; total: number }> => {
    const fd = new FormData();
    files.forEach(f => fd.append("files", f));
    return client.post("/predict/batch", fd);
  },
  history: (params?: { page?: number; limit?: number; source_type?: string }): Promise<{ predictions: Prediction[]; total: number; page: number; limit: number }> => {
    return client.get("/history/predictions", { params });
  },
  analytics: (): Promise<any> => {
    return client.get("/history/analytics");
  },
};

export const SignsApi = {
  list: (category?: string): Promise<TrafficSign[]> => {
    return client.get("/api/signs", { params: { category } });
  },
  get: (id: number): Promise<TrafficSign> => {
    return client.get(`/api/signs/${id}`);
  },
};

export const FineApi = {
  offences: (): Promise<Record<string, number>> => {
    return client.get("/fines/offences");
  },
  currencies: (): Promise<string[]> => {
    return client.get("/fines/currencies");
  },
  calculate: (offence: string, amount_lkr: number, target_currency: string): Promise<any> => {
    return client.post("/fines", { offence, amount_lkr, target_currency });
  },
  violations:    (): Promise<any> => client.get("/fines/violations"),
  categories:    (): Promise<any> => client.get("/fines/categories"),
  paymentWindow: (): Promise<any> => client.get("/fines/payment-window"),
  demeritSystem: (): Promise<any> => client.get("/fines/demerit-system"),
};

export const MyFinesApi = {
  list:    (status?: string): Promise<any> => client.get("/my-fines", { params: { status } }),
  summary: (): Promise<any> => client.get("/my-fines/summary"),
  get:     (id: number): Promise<any> => client.get(`/my-fines/${id}`),
  create:  (payload: Record<string, any>): Promise<any> => client.post("/my-fines", payload),
  update:  (id: number, changes: Record<string, any>): Promise<any> => client.patch(`/my-fines/${id}`, changes),
  markPaid: (id: number, d: { paid_date?: string; receipt_no?: string }): Promise<any> =>
    client.post(`/my-fines/${id}/pay`, d),
  licenceRecovered: (id: number): Promise<any> => client.post(`/my-fines/${id}/licence-recovered`, {}),
  remove:  (id: number): Promise<any> => client.delete(`/my-fines/${id}`),
  paymentGuide: (): Promise<any> => client.get("/my-fines/payment-guide"),
  preview: (amount_lkr: number, issued_date: string, due_date?: string): Promise<any> =>
    client.get("/my-fines/preview", { params: { amount_lkr, issued_date, due_date } }),
};

export const LockerApi = {
  list:    (doc_type?: string): Promise<any> => client.get("/locker/documents", { params: { doc_type } }),
  types:   (): Promise<any> => client.get("/locker/types"),
  summary: (): Promise<any> => client.get("/locker/summary"),
  alerts:  (): Promise<any> => client.get("/locker/alerts"),
  create:  (payload: Record<string, any>): Promise<any> => client.post("/locker/documents", payload),
  update:  (id: number, changes: Record<string, any>): Promise<any> => client.patch(`/locker/documents/${id}`, changes),
  remove:  (id: number): Promise<any> => client.delete(`/locker/documents/${id}`),
};

export const DemeritApi = {
  overview:  (): Promise<any> => client.get("/locker/demerit"),
  catalogue: (): Promise<any> => client.get("/locker/demerit/catalogue"),
  add:       (payload: Record<string, any>): Promise<any> => client.post("/locker/demerit", payload),
  remove:    (id: number): Promise<any> => client.delete(`/locker/demerit/${id}`),
};

export const IncidentApi = {
  list:   (incident_type?: string): Promise<any> => client.get("/incidents", { params: { incident_type } }),
  guide:  (): Promise<any> => client.get("/incidents/guide"),
  get:    (id: number): Promise<any> => client.get(`/incidents/${id}`),
  create: (payload: Record<string, any>): Promise<any> => client.post("/incidents", payload),
  update: (id: number, changes: Record<string, any>): Promise<any> => client.patch(`/incidents/${id}`, changes),
  addMedia: (id: number, mediaType: "photo" | "audio" | "video", file: File | Blob, name?: string): Promise<any> => {
    const fd = new FormData();
    fd.append("media_type", mediaType);
    fd.append("file", file, name ?? (file instanceof File ? file.name : `${mediaType}.webm`));
    return client.post(`/incidents/${id}/media`, fd);
  },
  statement: (id: number): Promise<any> => client.get(`/incidents/${id}/statement`),
  remove:    (id: number): Promise<any> => client.delete(`/incidents/${id}`),
};

export const CheckpointApi = {
  kinds:  (): Promise<any> => client.get("/checkpoints/kinds"),
  list:   (include_expired = false): Promise<any> => client.get("/checkpoints", { params: { include_expired } }),
  nearby: (latitude: number, longitude: number, radius_km?: number, kind?: string): Promise<any> =>
    client.get("/checkpoints/nearby", { params: { latitude, longitude, radius_km, kind } }),
  report:  (payload: Record<string, any>): Promise<any> => client.post("/checkpoints", payload),
  confirm: (id: number): Promise<any> => client.post(`/checkpoints/${id}/confirm`, {}),
  clear:   (id: number): Promise<any> => client.post(`/checkpoints/${id}/clear`, {}),
};

export const NotificationApi = {
  due:       (): Promise<any> => client.get("/notifications/due"),
  providers: (): Promise<any> => client.get("/notifications/providers"),
  schedule:  (): Promise<any> => client.get("/notifications/schedule"),
  dispatch:  (to: string, provider = "log"): Promise<any> =>
    client.post("/notifications/dispatch", {}, { params: { to, provider } }),
};

export const FatigueApi = {
  config: (): Promise<any> => client.get("/fatigue/config"),
  analyze: (sessionId: string, frame: Blob): Promise<any> => {
    const fd = new FormData();
    fd.append("session_id", sessionId);
    fd.append("file", frame, "frame.jpg");
    return client.post("/fatigue/analyze", fd);
  },
  reset: (sessionId: string): Promise<any> => {
    const fd = new FormData();
    fd.append("session_id", sessionId);
    return client.post("/fatigue/reset", fd);
  },
};

export const ZonesApi = {
  limits:  (): Promise<any> => client.get("/zones/limits"),
  all:     (): Promise<any> => client.get("/zones/all"),
  current: (latitude: number, longitude: number): Promise<any> =>
    client.get("/zones/current", { params: { latitude, longitude } }),
  speedCheck: (latitude: number, longitude: number, speed_kmh?: number | null, road_class = "urban"): Promise<any> =>
    client.get("/zones/speed-check", { params: { latitude, longitude, speed_kmh, road_class } }),
  blackspots: (latitude?: number, longitude?: number, radius_km?: number): Promise<any> =>
    client.get("/zones/blackspots", { params: { latitude, longitude, radius_km } }),
};

export const ReportApi = {
  preview: (): Promise<any> => client.get("/reports/driver/preview"),
  downloadUrl: (driverName?: string): string => {
    const base = import.meta.env.VITE_API_URL || "http://localhost:8000";
    const q = driverName ? `?driver_name=${encodeURIComponent(driverName)}` : "";
    return `${base}/reports/driver.pdf${q}`;
  },
};

export const VehicleApi = {
  revenueLicence: (plate?: string): Promise<any> =>
    client.get("/vehicle/revenue-licence", { params: { plate } }),
  parsePlate: (plate: string): Promise<any> => client.get("/vehicle/plate", { params: { plate } }),
  provinces:  (): Promise<any> => client.get("/vehicle/provinces"),
  emission:   (): Promise<any> => client.get("/vehicle/emission"),
  transfer:   (): Promise<any> => client.get("/vehicle/transfer"),
};

export const ExpresswayApi = {
  info: (): Promise<any> => client.get("/expressway/info"),
  toll: (expressway: string, entry: string, exit: string, vehicle_class = "class1"): Promise<any> =>
    client.get("/expressway/toll", { params: { expressway, entry, exit, vehicle_class } }),
  fareTable: (expressway: string, entry: string, vehicle_class = "class1"): Promise<any> =>
    client.get("/expressway/fare-table", { params: { expressway, entry, vehicle_class } }),
  etc: (): Promise<any> => client.get("/expressway/etc"),
};

export const FuelApi = {
  prices:    (): Promise<any> => client.get("/fuel/prices"),
  reference: (): Promise<any> => client.get("/fuel/reference"),
  estimate: (distance_km: number, km_per_litre: number, fuel = "petrol_92",
             price_lkr?: number | null, return_trip = false): Promise<any> =>
    client.get("/fuel/estimate", { params: { distance_km, km_per_litre, fuel, price_lkr, return_trip } }),
  compare: (distance_km: number, km_per_litre: number, return_trip = false): Promise<any> =>
    client.get("/fuel/compare", { params: { distance_km, km_per_litre, return_trip } }),
};

export const InsuranceApi = {
  claimHub:      (): Promise<any> => client.get("/insurance/claim-hub"),
  insurers:      (): Promise<any> => client.get("/insurance/insurers"),
  photoChecklist:(): Promise<any> => client.get("/insurance/photo-checklist"),
};

/**
 * Derived values for records this device holds.
 *
 * These post records and get calculations back. Nothing is stored server-side — see
 * backend/app/api/routes/compute.py.
 */
export const ComputeApi = {
  fines: (fines: any[], today?: string): Promise<any> =>
    client.post("/compute/fines", { fines, today }),
  documents: (documents: any[], today?: string): Promise<any> =>
    client.post("/compute/documents", { documents, today }),
  demerit: (records: any[], today?: string): Promise<any> =>
    client.post("/compute/demerit", { records, today }),
  reminders: (fines: any[], documents: any[], today?: string): Promise<any> =>
    client.post("/compute/reminders", { fines, documents, today }),
};

export const RightsApi = {
  overview:       (): Promise<any> => client.get("/rights/overview"),
  hotlines:       (kind?: string): Promise<any> => client.get("/rights/hotlines", { params: { kind } }),
  breathalyser:   (): Promise<any> => client.get("/rights/breathalyser"),
  womenDrivers:   (): Promise<any> => client.get("/rights/women-drivers"),
  complaintSteps: (): Promise<any> => client.get("/rights/complaint-steps"),
};

export const ForeignDriverApi = {
  fineConvert: (offence: string, amount: number, currency: string, isToLkr: boolean): Promise<{
    offence: string; amount: number; currency: string;
    converted_amount: number; exchange_rate: number;
    fine_amount_lkr: number; offence_explanation: string; tourist_guidance: string;
  }> => {
    return client.post("/foreign-driver/fine-convert", { offence, amount, currency, is_to_lkr: isToLkr });
  },
  explain: (offence: string, language: Lang): Promise<{
    offence: string; offence_explanation: string; tourist_guidance: string;
  }> => {
    return client.post("/foreign-driver/explain", { offence, language });
  },
};

export const AssistantApi = {
  chat: (message: string, language: Lang, context_type?: string): Promise<{ user_message: string; reply: string; language: Lang; context_type?: string }> => {
    return client.post("/assistant/chat", { message, language, context_type });
  },
  translate: (text: string, target_language: Lang): Promise<{ original_text: string; translated_text: string; target_language: Lang }> => {
    return client.post("/assistant/translate", { text, target_language });
  },
  translateBatch: (texts: string[], target_language: Lang): Promise<{ translations: string[]; target_language: Lang }> => {
    return client.post("/assistant/translate/batch", { texts, target_language });
  },
};

export const EmergencyApi = {
  report: (d: { emergency_type: string; latitude: number; longitude: number; description?: string }): Promise<any> => {
    return client.post("/emergency/help", d);
  },
};

export const NearbyApi = {
  search: (latitude: number, longitude: number, category: string): Promise<NearbyPlace[]> => {
    return client.post("/nearby/services", { latitude, longitude, category });
  },
};

export const FeedbackApi = {
  submit: (d: { prediction_id: number; predicted_label: string; correct_label: string; comment?: string }): Promise<any> => {
    return client.post("/feedback", d);
  },
};

export const ModelApi = {
  metrics: (): Promise<any> => client.get("/model/metrics"),
  dataset: (): Promise<any> => client.get("/model/dataset"),
  comparison: (): Promise<any> => client.get("/model/comparison"),
  // Loads the weights on first call, so allow well over the default timeout
  benchmark: (runs = 8): Promise<any> =>
    client.get("/model/benchmark", { params: { runs }, timeout: 180000 }),
};

export const DocumentApi = {
  scan: (file: File): Promise<any> => {
    const fd = new FormData();
    fd.append("file", file);
    return client.post("/documents/scan", fd);
  },
  types:           (): Promise<any> => client.get("/documents/types"),
  permitGuide:     (): Promise<any> => client.get("/documents/permit-guide"),
  policeStopGuide: (): Promise<any> => client.get("/documents/police-stop-guide"),
};

export const LicenseApi = {
  info:           (): Promise<any> => client.get("/license/info"),
  allVehicleRules:(): Promise<any> => client.get("/license/all-vehicle-rules"),
  updates2026:    (): Promise<any> => client.get("/license/updates-2026"),
  theoryTopics:   (): Promise<any> => client.get("/license/theory-topics"),
  practicalTips:  (): Promise<any> => client.get("/license/practical-tips"),
};

export default client;
