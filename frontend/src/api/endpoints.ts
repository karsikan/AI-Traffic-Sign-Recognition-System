import api from "./client";
import type {
  AuthResponse, Analytics, DetectionResult, NearbyPlace,
  Prediction, TrafficSign, User, Lang,
} from "@/types";

export const AuthApi = {
  register: (d: { full_name: string; email: string; password: string; preferred_language: Lang }) =>
    api.post<AuthResponse>("/api/auth/register", d).then((r) => r.data),
  login: (email: string, password: string) => {
    const form = new URLSearchParams({ username: email, password });
    return api.post<AuthResponse>("/api/auth/login", form).then((r) => r.data);
  },
  me: () => api.get<User>("/api/auth/me").then((r) => r.data),
  update: (d: Partial<Pick<User, "full_name" | "preferred_language">>) =>
    api.put<User>("/api/auth/me", d).then((r) => r.data),
  logout: () => api.post("/api/auth/logout"),
};

export const DetectionApi = {
  image: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post<DetectionResult>("/api/detection/image", fd).then((r) => r.data);
  },
  history: (params?: { search?: string; source_type?: string }) =>
    api.get<Prediction[]>("/api/detection/history", { params }).then((r) => r.data),
};

export const SignsApi = {
  list: (category?: string) =>
    api.get<TrafficSign[]>("/api/signs", { params: { category } }).then((r) => r.data),
  get: (id: number) => api.get<TrafficSign>(`/api/signs/${id}`).then((r) => r.data),
};

export const AssistantApi = {
  chat: (question: string, language: Lang) =>
    api.post<{ answer: string; language: Lang }>("/api/assistant/chat", { question, language }).then((r) => r.data),
  translate: (text: string, target_language: Lang) =>
    api.post<{ translation: string }>("/api/assistant/translate", { text, target_language }).then((r) => r.data),
  history: () =>
    api.get<{ id: number; question: string; answer: string; language: Lang; created_at: string }[]>("/api/assistant/history").then((r) => r.data),
};

export const FineApi = {
  offences: () => api.get<Record<string, number>>("/api/fines/offences").then((r) => r.data),
  currencies: () => api.get<string[]>("/api/fines/currencies").then((r) => r.data),
  calculate: (offence: string, amount_lkr: number, target_currency: string) =>
    api.post("/api/fines", { offence, amount_lkr, target_currency }).then((r) => r.data),
};

export const EmergencyApi = {
  report: (d: { emergency_type: string; latitude: number; longitude: number; description?: string }) =>
    api.post("/api/emergency", d).then((r) => r.data),
  contacts: () => api.get<Record<string, string>>("/api/emergency/contacts").then((r) => r.data),
};

export const NearbyApi = {
  search: (latitude: number, longitude: number, service_type: string, radius = 5000) =>
    api.post<{ configured: boolean; results: NearbyPlace[]; message?: string }>(
      "/api/nearby", { latitude, longitude, service_type, radius }
    ).then((r) => r.data),
  config: () =>
    api.get<{ google_maps_api_key: string; use_google: boolean }>("/api/nearby/config").then((r) => r.data),
};

export const AnalyticsApi = {
  dashboard: () => api.get<Analytics>("/api/analytics").then((r) => r.data),
};

export const FeedbackApi = {
  submit: (d: { prediction_id: number; predicted_label: string; correct_label: string; comment?: string }) =>
    api.post("/api/feedback", d).then((r) => r.data),
};
