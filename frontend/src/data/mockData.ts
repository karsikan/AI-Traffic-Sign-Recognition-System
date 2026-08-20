import type { TrafficSign, NearbyPlace, Prediction } from "@/types";

export const mockTrafficSigns: TrafficSign[] = [
  {
    id: 1,
    class_id: 100,
    name: "No Horn Zone",
    category: "prohibitory",
    meaning: "Use of vehicle horns is prohibited except to avoid a crash.",
    safety_instruction: "Keep silence; do not honk near hospitals or schools.",
    traffic_rule: "Drivers violating the silence zone rule are fined under Motor Traffic rules.",
  },
  {
    id: 2,
    class_id: 101,
    name: "One Way Right",
    category: "mandatory",
    meaning: "One way traffic direction to the right.",
    safety_instruction: "Follow the arrow direction. Do not enter from the opposite side.",
    traffic_rule: "Entering a one-way street from the wrong direction is a punishable offence.",
  },
  {
    id: 3,
    class_id: 102,
    name: "School Crossing Warning",
    category: "warning",
    meaning: "School zone crossing ahead.",
    safety_instruction: "Reduce speed to 20 km/h and yield to children.",
    traffic_rule: "Drivers must give priority to pedestrians and school children at crossings.",
  },
  {
    id: 4,
    class_id: 103,
    name: "No Parking Restricted",
    category: "prohibitory",
    meaning: "No parking allowed on this side of the road.",
    safety_instruction: "Find designated parking areas, do not leave your vehicle here.",
    traffic_rule: "Unauthorized parking will result in towing and a fine.",
  },
  {
    id: 5,
    class_id: 104,
    name: "Sri Lankan Hospital Info",
    category: "info",
    meaning: "Hospital or medical center nearby.",
    safety_instruction: "Slow down and avoid making excessive noise.",
    traffic_rule: "Maintain silence and proceed with caution near hospital entrances.",
  },
];

export const mockNearbyPlaces: Record<string, NearbyPlace[]> = {
  hospital: [
    {
      name: "Colombo National Hospital",
      address: "E W Perera Mawatha, Colombo 01000",
      latitude: 6.9189,
      longitude: 79.8732,
      distance_km: 1.2,
      rating: 4.3,
      open_now: true,
      phone: "+94 11 269 1111",
    },
    {
      name: "Asiri Central Hospital",
      address: "No. 114 Norris Canal Rd, Colombo 01000",
      latitude: 6.9194,
      longitude: 79.8705,
      distance_km: 1.5,
      rating: 4.1,
      open_now: true,
      phone: "+94 11 466 5500",
    },
  ],
  police: [
    {
      name: "Colombo Police Headquarters",
      address: "Police Headquarters, Colombo 00100",
      latitude: 6.9324,
      longitude: 79.8492,
      distance_km: 2.8,
      rating: 4.0,
      open_now: true,
      phone: "+94 11 242 1111",
    },
  ],
  garage: [
    {
      name: "Toyota Lanka Service Center",
      address: "No 337 Negombo Rd, Wattala",
      latitude: 6.9745,
      longitude: 79.8920,
      distance_km: 6.4,
      rating: 4.5,
      open_now: true,
      phone: "+94 11 293 9000",
    },
    {
      name: "Dimo Lanka Service Station",
      address: "Jetwing House, Colombo 14",
      latitude: 6.9422,
      longitude: 79.8690,
      distance_km: 3.1,
      rating: 4.2,
      open_now: false,
      phone: "+94 11 244 9797",
    },
  ],
};

export const mockPredictions: Prediction[] = [
  {
    id: 1,
    source_type: "image",
    detected_name: "No Horn Zone",
    confidence: 0.94,
    created_at: "2026-06-22T08:30:00Z",
  },
  {
    id: 2,
    source_type: "video",
    detected_name: "School Crossing Warning",
    confidence: 0.88,
    created_at: "2026-06-22T09:12:00Z",
  },
  {
    id: 3,
    source_type: "webcam",
    detected_name: "One Way Right",
    confidence: 0.91,
    created_at: "2026-06-22T10:05:00Z",
  },
];
