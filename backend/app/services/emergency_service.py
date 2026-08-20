import math
from datetime import datetime
from urllib.parse import quote
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.logging import logger
from app.models.emergency_log import EmergencyLog
from app.services.gemini_service import generate_emergency_guidance

# Representative fallback locations in Sri Lanka
# How long an emergency lookup may wait on the map service before falling back.
# The lookups run alongside the guidance call rather than after it, so this can be
# generous enough for Overpass to actually answer without slowing the response down:
# the total cost is the slowest step, not the sum.
EMERGENCY_LOOKUP_TIMEOUT = 14

SRI_LANKA_SERVICES = {
    "hospital": [
        {"name": "National Hospital of Sri Lanka, Colombo", "lat": 6.9200, "lon": 79.8686, "city": "Colombo", "phone": "+94112691111"},
        {"name": "Colombo South Teaching Hospital, Kalubowila", "lat": 6.8710, "lon": 79.8885, "city": "Colombo", "phone": "+94112511111"},
        {"name": "Teaching Hospital, Karapitiya", "lat": 6.0712, "lon": 80.2225, "city": "Galle", "phone": "+94912222261"},
        {"name": "General Hospital, Kandy", "lat": 7.2911, "lon": 80.6350, "city": "Kandy", "phone": "+94812222337"},
        {"name": "Jaffna Teaching Hospital", "lat": 9.6614, "lon": 80.0205, "city": "Jaffna", "phone": "+94212222261"},
    ],
    "police": [
        {"name": "Fort Police Station, Colombo", "lat": 6.9319, "lon": 79.8437, "city": "Colombo", "phone": "+94112433333"},
        {"name": "Kollupitiya Police Station, Colombo", "lat": 6.9142, "lon": 79.8504, "city": "Colombo", "phone": "+94112580011"},
        {"name": "Kandy Police Station", "lat": 7.2929, "lon": 80.6390, "city": "Kandy", "phone": "+94812222222"},
        {"name": "Galle Police Station", "lat": 6.0360, "lon": 80.2170, "city": "Galle", "phone": "+94912222222"},
        {"name": "Jaffna Police Station", "lat": 9.6645, "lon": 80.0165, "city": "Jaffna", "phone": "+94212222222"},
    ],
    "petrol": [
        {"name": "Lanka IOC Fuel Station, Town Hall", "lat": 6.9185, "lon": 79.8630, "city": "Colombo", "phone": "+94112698888"},
        {"name": "Ceypetco Fuel Station, Fort", "lat": 6.9332, "lon": 79.8465, "city": "Colombo", "phone": "+94112421111"},
        {"name": "Kandy Ceypetco Shed", "lat": 7.2940, "lon": 80.6320, "city": "Kandy", "phone": "+94812231111"},
        {"name": "Galle IOC Fuel Station", "lat": 6.0385, "lon": 80.2140, "city": "Galle", "phone": "+94912231111"},
        {"name": "Jaffna Ceypetco Shed", "lat": 9.6670, "lon": 80.0120, "city": "Jaffna", "phone": "+94212231111"},
    ],
    "garage": [
        {"name": "Colombo Vehicle Auto Repair", "lat": 6.9110, "lon": 79.8710, "city": "Colombo", "phone": "+94112345678"},
        {"name": "Kandy Auto Clinic", "lat": 7.2890, "lon": 80.6280, "city": "Kandy", "phone": "+94812345678"},
        {"name": "Galle Engineering Repairs", "lat": 6.0410, "lon": 80.2080, "city": "Galle", "phone": "+94912345678"},
        {"name": "Jaffna Motors & Garage", "lat": 9.6690, "lon": 80.0150, "city": "Jaffna", "phone": "+94212345678"},
    ],
    "restaurant": [
        {"name": "Ministry of Crab, Colombo", "lat": 6.9312, "lon": 79.8436, "city": "Colombo", "phone": "+94112342722"},
        {"name": "Noorani Hotel, Colombo", "lat": 6.9175, "lon": 79.8505, "city": "Colombo", "phone": "+94112326915"},
        {"name": "Flower Drum Restaurant, Colombo", "lat": 6.9085, "lon": 79.8545, "city": "Colombo", "phone": "+94112573290"},
        {"name": "The Pub, Kandy", "lat": 7.2934, "lon": 80.6365, "city": "Kandy", "phone": "+94812224317"},
        {"name": "Devon Restaurant, Kandy", "lat": 7.2918, "lon": 80.6341, "city": "Kandy", "phone": "+94812222456"},
        {"name": "Mama's Roof Café, Galle Fort", "lat": 6.0279, "lon": 80.2170, "city": "Galle", "phone": "+94912246050"},
        {"name": "Heritage Tea Room, Galle", "lat": 6.0310, "lon": 80.2145, "city": "Galle", "phone": "+94912234567"},
        {"name": "Rio Ice Cream, Jaffna", "lat": 9.6634, "lon": 80.0189, "city": "Jaffna", "phone": "+94212223456"},
        {"name": "Green Cabin, Colombo", "lat": 6.9054, "lon": 79.8556, "city": "Colombo", "phone": "+94112588716"},
        {"name": "Palmyra Restaurant, Jaffna", "lat": 9.6620, "lon": 80.0225, "city": "Jaffna", "phone": "+94212221001"},
    ],
    "hotel": [
        {"name": "Cinnamon Grand Colombo", "lat": 6.9147, "lon": 79.8483, "city": "Colombo", "phone": "+94112437437"},
        {"name": "Shangri-La Colombo", "lat": 6.9269, "lon": 79.8441, "city": "Colombo", "phone": "+94112301222"},
        {"name": "Hilton Colombo", "lat": 6.9264, "lon": 79.8453, "city": "Colombo", "phone": "+94112544644"},
        {"name": "OZO Colombo", "lat": 6.9130, "lon": 79.8520, "city": "Colombo", "phone": "+94112491491"},
        {"name": "Hotel Suisse, Kandy", "lat": 7.2921, "lon": 80.6339, "city": "Kandy", "phone": "+94812222637"},
        {"name": "Amaya Hills, Kandy", "lat": 7.3155, "lon": 80.6372, "city": "Kandy", "phone": "+94812223521"},
        {"name": "Jetwing Lighthouse, Galle", "lat": 6.0254, "lon": 80.1994, "city": "Galle", "phone": "+94912223744"},
        {"name": "Fort Bazaar, Galle", "lat": 6.0283, "lon": 80.2157, "city": "Galle", "phone": "+94912246090"},
        {"name": "Tilko Jaffna City Hotel", "lat": 9.6580, "lon": 80.0185, "city": "Jaffna", "phone": "+94212229000"},
        {"name": "Lux* Maldives / Trinco Blu", "lat": 8.5850, "lon": 81.2110, "city": "Trincomalee", "phone": "+94262226311"},
    ],
    "post_office": [
        {"name": "Colombo Main Post Office", "lat": 6.9319, "lon": 79.8482, "city": "Colombo", "phone": "+94112326203"},
        {"name": "Bambalapitiya Post Office", "lat": 6.8998, "lon": 79.8548, "city": "Colombo", "phone": "+94112503050"},
        {"name": "Pettah Post Office, Colombo", "lat": 6.9374, "lon": 79.8518, "city": "Colombo", "phone": "+94112433205"},
        {"name": "Kandy Main Post Office", "lat": 7.2934, "lon": 80.6365, "city": "Kandy", "phone": "+94812222502"},
        {"name": "Galle Main Post Office", "lat": 6.0366, "lon": 80.2180, "city": "Galle", "phone": "+94912222502"},
        {"name": "Jaffna Head Post Office", "lat": 9.6652, "lon": 80.0198, "city": "Jaffna", "phone": "+94212222502"},
        {"name": "Trincomalee Post Office", "lat": 8.5890, "lon": 81.2148, "city": "Trincomalee", "phone": "+94262222502"},
        {"name": "Matara Post Office", "lat": 5.9556, "lon": 80.5540, "city": "Matara", "phone": "+94412222502"},
        {"name": "Kurunegala Post Office", "lat": 7.4880, "lon": 80.3650, "city": "Kurunegala", "phone": "+94372222502"},
        {"name": "Anuradhapura Post Office", "lat": 8.3145, "lon": 80.4045, "city": "Anuradhapura", "phone": "+94252222502"},
    ],
    "service_station": [
        {"name": "DIMO Service Centre, Colombo", "lat": 6.9210, "lon": 79.8670, "city": "Colombo", "phone": "+94112430000"},
        {"name": "United Motors Service, Colombo", "lat": 6.9080, "lon": 79.8720, "city": "Colombo", "phone": "+94112316700"},
        {"name": "Toyota Lanka Service, Colombo", "lat": 6.8970, "lon": 79.8810, "city": "Colombo", "phone": "+94112303000"},
        {"name": "Stafford Motors, Colombo", "lat": 6.9165, "lon": 79.8590, "city": "Colombo", "phone": "+94112338000"},
        {"name": "Kandy Motor Traders Service", "lat": 7.2880, "lon": 80.6290, "city": "Kandy", "phone": "+94812232890"},
        {"name": "Galle Motor Service Centre", "lat": 6.0420, "lon": 80.2080, "city": "Galle", "phone": "+94912234890"},
        {"name": "Jaffna Auto Service Centre", "lat": 9.6670, "lon": 80.0140, "city": "Jaffna", "phone": "+94212234890"},
        {"name": "Negombo Motor Service", "lat": 7.2110, "lon": 79.8400, "city": "Negombo", "phone": "+94312234890"},
        {"name": "Kurunegala Service Station", "lat": 7.4850, "lon": 80.3640, "city": "Kurunegala", "phone": "+94372234890"},
        {"name": "Matara Auto Works", "lat": 5.9570, "lon": 80.5520, "city": "Matara", "phone": "+94412234890"},
    ]
}

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    # Earth radius in kilometers
    R = 6371.0
    
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return round(R * c, 1)

def build_alert_links(phone: str, name: str, emergency_type: str, lat: float, lon: float, distance_km: float) -> dict:
    """Build one-click tel:/wa.me/sms: links carrying a pre-filled emergency message. No paid API needed."""
    maps_link = f"https://www.google.com/maps/search/?api=1&query={lat},{lon}"
    message = (
        f"EMERGENCY ALERT ({emergency_type.upper()}): I need urgent help. "
        f"My live location: {maps_link} "
        f"(approx {distance_km} km from {name}). Please respond immediately."
    )
    encoded = quote(message)
    # phone for wa.me must be digits only, no '+'
    wa_number = phone.replace("+", "").replace(" ", "")
    return {
        "call_url": f"tel:{phone}",
        "whatsapp_url": f"https://wa.me/{wa_number}?text={encoded}",
        "sms_url": f"sms:{phone}?body={encoded}",
        "message": message,
    }


class EmergencyService:
    @staticmethod
    def get_nearest_location(lat: float, lon: float, category: str,
                             emergency_type: str = "emergency",
                             timeout: int = 30) -> dict:
        """
        The nearest hospital, police station or fuel station.

        Goes through the shared nearby lookup so this asks OpenStreetMap first. That
        matters more here than anywhere else in the app: this is the answer someone reads
        at the scene of a crash. The built-in list used to send a driver in Batticaloa to
        a hospital 125 km away in Kandy.
        """
        from app.services.nearby_service import NearbyService

        nearest = None
        source = "builtin"

        try:
            res = NearbyService.find_nearby_services(lat, lon, category, timeout=timeout)
            if res["services"]:
                nearest = res["services"][0]
                source = res["source"]
        except Exception as e:
            logger.warning(f"Nearby lookup failed for {category}, using built-in list: {e}")

        if nearest is None:
            # Last resort — the short built-in list, so an emergency always gets an answer
            locations = SRI_LANKA_SERVICES.get(category, [])
            if not locations:
                raise ValueError(f"Unknown location category: {category}")
            best, best_dist = None, float("inf")
            for loc in locations:
                dist = haversine_distance(lat, lon, loc["lat"], loc["lon"])
                if dist < best_dist:
                    best, best_dist = loc, dist
            if best is None:
                raise ValueError(f"No locations found for category: {category}")
            nearest = {
                "name": best["name"], "phone": best.get("phone", ""),
                "distance_km": best_dist,
                "latitude": best["lat"], "longitude": best["lon"],
            }

        distance = nearest.get("distance_km") or 0
        alert_links = build_alert_links(
            nearest.get("phone") or "", nearest["name"], emergency_type, lat, lon, distance
        )
        return {
            "name": nearest["name"],
            "phone": nearest.get("phone") or "",
            "distance_km": distance,
            "maps_url": (
                f"https://www.google.com/maps/search/?api=1"
                f"&query={nearest.get('latitude')},{nearest.get('longitude')}"
            ),
            "source": source,
            # A long distance here is worth flagging — in an emergency the national
            # numbers get help moving faster than driving to a distant hospital.
            "far": distance > 25,
            **alert_links,
        }

    @classmethod
    def generate_emergency_help(cls, emergency_type: str, lat: float, lon: float, description: str, db: Session) -> dict:
        # Three lookups, run together rather than one after another. Sequentially this
        # took the best part of a minute against the public Overpass endpoint, which is
        # far too long for the screen someone reads at the scene of a crash. Each gets a
        # short deadline and falls back to the built-in list on its own.
        from concurrent.futures import ThreadPoolExecutor

        def locate(category: str) -> dict:
            try:
                return cls.get_nearest_location(lat, lon, category, emergency_type,
                                                timeout=EMERGENCY_LOOKUP_TIMEOUT)
            except Exception as e:
                logger.error(f"Nearest {category} lookup failed: {e}")
                return {"name": "Unavailable", "phone": "", "distance_km": None,
                        "maps_url": None, "source": "unavailable", "far": False,
                        "call_url": "", "whatsapp_url": "", "sms_url": "", "message": ""}

        # The Gemini guidance call goes in the same pool. It takes about as long as a map
        # lookup, so running it alongside rather than after means the whole response costs
        # the slowest single step instead of the sum of all four — which in turn buys the
        # lookups enough time to actually reach Overpass rather than falling back.
        def guidance_call():
            try:
                return generate_emergency_guidance(emergency_type, description, language="en")
            except Exception as e:
                logger.error(f"Emergency guidance failed: {e}")
                return None

        with ThreadPoolExecutor(max_workers=4) as pool:
            futures = {c: pool.submit(locate, c) for c in ("hospital", "police", "petrol")}
            guidance_future = pool.submit(guidance_call)

            nearest_hospital = futures["hospital"].result()
            nearest_police = futures["police"].result()
            nearest_petrol = futures["petrol"].result()
            guidance = guidance_future.result()
        
        # Save to DB
        try:
            log_record = EmergencyLog(
                emergency_type=emergency_type,
                latitude=lat,
                longitude=lon,
                nearest_hospital=nearest_hospital["name"],
                nearest_police=nearest_police["name"],
                nearest_petrol=nearest_petrol["name"],
                created_at=datetime.utcnow()
            )
            db.add(log_record)
            db.commit()
            db.refresh(log_record)
            logger.info(f"Emergency log saved with ID: {log_record.id}")
        except Exception as sql_err:
            db.rollback()
            logger.error(f"Database write failure in emergency logger: {sql_err}")
            raise HTTPException(status_code=500, detail="Failed to log emergency report in database.")

        return {
            "emergency_type": emergency_type,
            "nearest_hospital": nearest_hospital,
            "nearest_police": nearest_police,
            "nearest_petrol": nearest_petrol,
            "guidance": guidance
        }
