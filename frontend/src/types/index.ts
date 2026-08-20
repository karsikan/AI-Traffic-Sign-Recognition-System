export interface User {
  id: number;
  full_name: string;
  email: string;
  preferred_language: Lang;
  created_at: string;
}
export type Lang = "en" | "ta" | "si";

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Detection {
  label: string;
  confidence: number;
  bbox: number[];
  category?: string;
  meaning?: string;
  sign_id?: number;
  // Also sent by the pipeline — see _enrich_detection in pipeline_service.py
  sign_name?: string;
  class_id?: number;
  safety_advice?: string;
  classified_by?: string;
}
export interface DetectionResult {
  demo_mode: boolean;
  engine?: string;
  detections: Detection[];
  media_path?: string;
  prediction_id?: number;
}

export interface TrafficSign {
  id: number;
  class_id: number;
  name: string;
  category: string;
  meaning: string;
  safety_instruction: string;
  traffic_rule: string;
  image_path?: string;
}

export interface Prediction {
  id: number;
  source_type: string;
  media_path?: string;
  detected_name?: string;
  confidence?: number;
  created_at: string;
}

export interface Analytics {
  total_detections: number;
  total_users: number;
  average_confidence: number;
  most_detected: { name: string; count: number }[];
  detections_by_day: { date: string; count: number }[];
  accuracy_rate: number;
  wrong_predictions_count: number;
}

export interface NearbyPlace {
  name: string;
  address: string;
  rating?: number;
  latitude: number;
  longitude: number;
  distance_km: number;
  open_now?: boolean;
  phone?: string;
}
