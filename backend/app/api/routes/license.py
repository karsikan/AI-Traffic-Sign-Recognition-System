from fastapi import APIRouter
from app.utils.response import success_response

router = APIRouter(prefix="/license", tags=["Driving Licence"])

# ── 2026 Updated Sri Lanka Driving Licence Data ─────────────────────────────

LICENCE_CATEGORIES = [
    {"code": "A1", "vehicle": "Motorcycle (up to 250cc)", "min_age": 16, "description": "Light motorcycles, mopeds. Pillion allowed only after 1 year.", "test_required": ["theory", "practical"]},
    {"code": "A",  "vehicle": "Motorcycle (above 250cc)", "min_age": 18, "description": "All motorcycles. Must hold A1 for at least 2 years OR pass direct A test.", "test_required": ["theory", "practical"]},
    {"code": "B",  "vehicle": "Private Car / Van (≤8 passengers)", "min_age": 18, "description": "Most common licence. Cars, SUVs, vans, pickups under 3.5 tonnes.", "test_required": ["theory", "practical"]},
    {"code": "C",  "vehicle": "Heavy Goods Vehicle (Lorry)", "min_age": 21, "description": "Lorries, trucks over 3.5 tonnes. Must hold B for 2 years first.", "test_required": ["theory", "practical", "medical_extended"]},
    {"code": "D",  "vehicle": "Bus (more than 8 passengers)", "min_age": 24, "description": "Passenger buses. Must hold B for 4 years. Speed limiter mandatory.", "test_required": ["theory", "practical", "medical_extended", "route_knowledge"]},
    {"code": "G",  "vehicle": "Three-Wheeler (Tuk-tuk)", "min_age": 18, "description": "Auto-rickshaws. Separate test from B. Metered fares mandatory in cities.", "test_required": ["theory", "practical"]},
    {"code": "J",  "vehicle": "Special / Engineering Vehicle", "min_age": 21, "description": "Excavators, cranes, road rollers, forklifts. Employer endorsement required.", "test_required": ["theory", "practical", "employer_letter"]},
    {"code": "M",  "vehicle": "Motor Tricycle (Cargo)", "min_age": 18, "description": "Three-wheeled cargo delivery vehicles. New category added 2024.", "test_required": ["theory", "practical"]},
]

PROCESS_STEPS = [
    {"step": 1, "title": "Medical Examination", "duration": "1 day", "cost": "LKR 500–2,000", "details": "Visit a government or approved private hospital. Get Form MED-01 (vision, hearing, reflexes). Valid 6 months from 2026 (extended from 3 months). High-risk conditions (epilepsy, severe diabetes) require specialist clearance."},
    {"step": 2, "title": "Apply for Learner's Permit", "duration": "Same day (online) / 1–3 days (walk-in)", "cost": "LKR 750", "details": "Apply online at e.gov.lk or visit nearest DMT office. Submit NIC, MED-01, 2 passport photos. Permit valid 2 years from 2026 (was 1 year). Printed or digital permit accepted."},
    {"step": 3, "title": "Theory Test", "duration": "30 minutes", "cost": "LKR 500", "details": "30 MCQ questions at the DMT. Pass mark: 24/30 (80%). Topics: road signs, speed limits, right-of-way, first aid, Sri Lanka Motor Traffic Act. From 2025 — test also available online via DMT portal with webcam proctoring."},
    {"step": 4, "title": "Supervised Learning Period", "duration": "Minimum 3 months", "cost": "Free (your own practice)", "details": "Drive with a licence holder in the passenger seat. L-board on front and rear. Cannot drive on expressways, between 11 PM–5 AM, or carry more than 1 passenger. Log book recommended (not mandatory)."},
    {"step": 5, "title": "Practical Road Test", "duration": "30–45 minutes", "cost": "LKR 750", "details": "Book online or at DMT. Test includes: vehicle pre-check, hill start, parallel parking, reversing, lane discipline, roundabout, right turn, emergency stop. Examiner travels with you. Same-day result. 2 free retries before waiting period."},
    {"step": 6, "title": "Digital Licence Issued", "duration": "7–14 working days", "cost": "LKR 2,500 (5yr) / LKR 4,000 (10yr)", "details": "New biometric smart card with QR code. Collect at DMT or request postal delivery (LKR 300 extra). SMS + email notification when ready. Can be renewed online 6 months before expiry."},
]

VEHICLE_RULES = {
    "motorcycle": {
        "title": "Motorcycle Rules (Category A / A1)",
        "icon": "🏍️",
        "rules": [
            {"rule": "Helmet Mandatory", "detail": "Full-face or half-face helmet must be worn by rider AND pillion. Helmet must meet SLS (Sri Lanka Standards) or ECE 22 certification. Fine: LKR 2,500 per person not wearing helmet.", "severity": "critical"},
            {"rule": "Pillion Passenger", "detail": "Pillion allowed only if bike has proper seat and footrests. A1 holders must wait 1 year before carrying pillion. Pillion must sit astride — not sideways.", "severity": "important"},
            {"rule": "Lane Discipline", "detail": "Motorcycles must use the left lane on multi-lane roads. Do not weave between lanes (lane-splitting) — prohibited in Sri Lanka.", "severity": "important"},
            {"rule": "Headlights", "detail": "From 2025: headlights must be ON at all times during daytime for motorcycles on national highways and expressways (DRL rule).", "severity": "new2025"},
            {"rule": "No Phone Usage", "detail": "Using a mobile phone while riding, even hands-free, is prohibited. Fine: LKR 6,000 + licence suspension.", "severity": "critical"},
            {"rule": "Passengers Limit", "detail": "Maximum 1 pillion passenger. No carrying of goods that obstruct balance or vision.", "severity": "important"},
            {"rule": "Expressway Ban", "detail": "Motorcycles under 100cc are NOT permitted on expressways. 100cc+ allowed on E01, E03 only.", "severity": "important"},
            {"rule": "Protective Gear", "detail": "From 2026 (proposed): gloves and closed-toe shoes recommended; may become mandatory for highway riding.", "severity": "upcoming"},
        ]
    },
    "car": {
        "title": "Car & Van Rules (Category B)",
        "icon": "🚗",
        "rules": [
            {"rule": "Seatbelt — All Passengers", "detail": "Driver and ALL passengers must wear seatbelts. This includes rear passengers from 2023. Fine: LKR 2,500 per unbuckled person.", "severity": "critical"},
            {"rule": "Child Safety Seats", "detail": "Children under 8 or under 135cm height must use an approved child car seat. Must be rear-facing for infants under 13kg.", "severity": "critical"},
            {"rule": "Mobile Phone Ban", "detail": "Holding or using a phone while driving is illegal. Hands-free allowed ONLY if phone is mounted. Fine: LKR 6,000 + 3 licence points.", "severity": "critical"},
            {"rule": "Blood Alcohol Limit", "detail": "BAC limit: 0.08% (80mg/100ml). Zero tolerance for professional licence holders (C, D). Breath test at checkpoints. Fine: LKR 25,000 + licence suspension 6 months.", "severity": "critical"},
            {"rule": "Speed Camera Fines (2026)", "detail": "New fixed speed cameras on A1, A2, A6, all expressways. Fines mailed to registered address. No grace period. Double fine at night.", "severity": "new2026"},
            {"rule": "Parking Lights", "detail": "When parked on a road at night (outside lit area), parking lights must remain ON. Hazard lights for breakdowns.", "severity": "important"},
            {"rule": "Vehicle Revenue Licence", "detail": "Annual revenue licence (vehicle tax) must be current. Police scan QR at checkpoints. Expired: LKR 10,000 fine + vehicle impound.", "severity": "important"},
            {"rule": "Roadworthiness (VRC)", "detail": "Vehicles over 5 years must pass annual Vehicle Roadworthiness Certificate (VRC) inspection. Failure: vehicle off-road until repaired.", "severity": "important"},
        ]
    },
    "three_wheeler": {
        "title": "Three-Wheeler Rules (Category G)",
        "icon": "🛺",
        "rules": [
            {"rule": "Passenger Limit", "detail": "Maximum 3 passengers in the rear. No passengers in front seat. Overloading fine: LKR 5,000.", "severity": "critical"},
            {"rule": "Metered Fares", "detail": "All three-wheelers in Colombo, Kandy, and Galle must use the government-approved meter. Refusing meter is an offence. Fare: approx LKR 50 flag fall + LKR 60/km.", "severity": "important"},
            {"rule": "No Expressways", "detail": "Three-wheelers are completely prohibited on all expressways (E01, E02, E03, E04).", "severity": "critical"},
            {"rule": "Speed Limit", "detail": "40 km/h in urban areas. 50 km/h on national highways. No three-wheeler may exceed 60 km/h.", "severity": "important"},
            {"rule": "Night Operation (App Taxis)", "detail": "PickMe / inDrive three-wheelers may operate 24/7. Standard three-wheelers: no restriction but driver must be alert.", "severity": "important"},
            {"rule": "Insurance", "detail": "Third-party insurance mandatory. Commercial three-wheelers must hold commercial vehicle insurance.", "severity": "critical"},
            {"rule": "Identification", "detail": "Vehicle registration number must be displayed on a visible plate. Driver must carry licence and revenue licence.", "severity": "important"},
        ]
    },
    "bus": {
        "title": "Bus Rules (Category D)",
        "icon": "🚌",
        "rules": [
            {"rule": "Speed Limiter Device", "detail": "ALL buses must have a functioning speed limiter set to 80 km/h (intercity) or 60 km/h (urban). Tampering = criminal offence + 5-year licence ban.", "severity": "critical"},
            {"rule": "Driver Rest Periods", "detail": "Maximum continuous driving: 4.5 hours. Mandatory rest: 45 minutes. Daily limit: 9 hours driving. Logbook required for intercity buses.", "severity": "critical"},
            {"rule": "Passenger Capacity", "detail": "Cannot carry passengers beyond licensed seating capacity. Standing allowed only on short routes with NTC permit. Fine: LKR 25,000.", "severity": "critical"},
            {"rule": "Alcohol — Zero Tolerance", "detail": "Bus and lorry drivers: BAC must be 0.00%. Random breath tests at terminals and checkpoints. Positive result: immediate suspension + criminal charge.", "severity": "critical"},
            {"rule": "CCTV Requirement (2025)", "detail": "From 2025 — all intercity and school buses must have functioning CCTV cameras covering passenger cabin and road ahead.", "severity": "new2025"},
            {"rule": "Schoolbus Rules", "detail": "School bus drivers must hold D licence for 3+ years, no traffic convictions in 5 years, and have annual police clearance. Children: one adult escort per 15 students.", "severity": "important"},
            {"rule": "Emergency Exit Check", "detail": "Emergency exits must be checked before every trip. Blocked exits: LKR 15,000 fine + vehicle off-road.", "severity": "important"},
        ]
    },
    "heavy_vehicle": {
        "title": "Heavy Vehicle / Lorry Rules (Category C)",
        "icon": "🚛",
        "rules": [
            {"rule": "Weight Limits", "detail": "Axle weight limit strictly enforced. Overloading fine: LKR 2,500 per excess tonne. Repeat offence: vehicle seized. Weigh bridges at Katunayake, Awissawella, Matara.", "severity": "critical"},
            {"rule": "Speed Limiter", "detail": "Lorries over 10 tonnes must have speed limiter set to 60 km/h. GPS tracking mandatory for goods vehicles over 5 tonnes from 2026.", "severity": "new2026"},
            {"rule": "Prohibited Hours in Colombo", "detail": "Heavy vehicles (over 5 tonnes) cannot enter Colombo city limits between 7 AM–9 AM and 4 PM–7 PM on weekdays. Use bypass roads.", "severity": "critical"},
            {"rule": "Dangerous Goods", "detail": "Hazardous materials (fuel tankers, gas cylinders) require ADR permit, special plates, fire extinguisher, and trained driver certificate.", "severity": "important"},
            {"rule": "Height Clearance", "detail": "Maximum vehicle height: 4.2m. Check bridge clearances before route. Overhead damage = driver liability.", "severity": "important"},
            {"rule": "Night Reflectors", "detail": "Rear reflective strips and side markers mandatory. Failure: LKR 5,000 fine. Side marker lights must work.", "severity": "important"},
            {"rule": "Tachograph (2026)", "detail": "From 2026 — all heavy goods vehicles on national routes must have a tachograph recording driving hours.", "severity": "new2026"},
        ]
    },
}

ROAD_RULES_2026 = [
    {"category": "Speed Cameras", "rule": "Fixed speed cameras now operate on A1 (Colombo–Kandy), A2 (Galle Road), A3, A6, A9, and all expressways. Fines are issued automatically to the registered owner.", "penalty": "LKR 3,000–15,000", "year": 2026},
    {"category": "Demerit Points System", "rule": "New demerit points system active from Jan 2026. Accumulate 12 points in 12 months = licence suspended. Serious offences (drunk driving, reckless driving) = 6 points instantly.", "penalty": "Suspension 3–12 months", "year": 2026},
    {"category": "Digital Licence (Smart Card)", "rule": "All new licences issued as biometric smart cards with encrypted chip. QR code links to DMT database. Police use handheld scanners. Paper printouts no longer accepted.", "penalty": "—", "year": 2025},
    {"category": "Online Renewal", "rule": "Licence renewal fully online via e.gov.lk. No DMT visit required if no change in vehicle category. Payment via online banking / mobile apps.", "penalty": "—", "year": 2025},
    {"category": "Mobile Phone — Enhanced Penalty", "rule": "Using phone while driving (including at traffic lights): LKR 6,000 fine + 3 demerit points. Second offence within 12 months: LKR 12,000 + licence suspension.", "penalty": "LKR 6,000 + 3 pts", "year": 2024},
    {"category": "Rear Seatbelt Enforcement", "rule": "Rear passenger seatbelt law now actively enforced. Police issue on-spot fines at checkpoints. No warnings — direct fine issued.", "penalty": "LKR 2,500 per person", "year": 2023},
    {"category": "Drunk Driving — Ignition Interlock", "rule": "Repeat drunk driving offenders must install breathalyser ignition interlock device (at own cost). Vehicle won't start if alcohol detected.", "penalty": "Mandatory device", "year": 2026},
    {"category": "GPS Tracking — Commercial Vehicles", "rule": "From 2026: all buses, lorries over 5t, school vans must have active GPS tracker. Data submitted to National Transport Commission.", "penalty": "LKR 25,000 + grounding", "year": 2026},
    {"category": "Motorcycle Daytime Headlights", "rule": "Motorcycles must have headlights ON during all daytime hours on highways. Applies on A-class roads and expressways.", "penalty": "LKR 1,500", "year": 2025},
    {"category": "Expressway Emergency Lanes", "rule": "Driving in expressway emergency lane (hard shoulder) now detected by camera and carries doubled penalty. Emergency use only.", "penalty": "LKR 10,000", "year": 2026},
]

THEORY_TEST_TOPICS = {
    "road_signs": {
        "title": "Road Signs & Markings",
        "questions": [
            {"q": "A red octagonal sign means?", "a": "STOP — come to a complete stop.", "category": "Signs"},
            {"q": "A red triangle with exclamation mark means?", "a": "General danger ahead — proceed with caution.", "category": "Signs"},
            {"q": "A blue circle with white arrow means?", "a": "Mandatory direction — you must follow this direction.", "category": "Signs"},
            {"q": "A solid yellow centre line means?", "a": "No overtaking from either direction.", "category": "Markings"},
            {"q": "A broken white centre line means?", "a": "Overtaking permitted when safe.", "category": "Markings"},
            {"q": "A white zigzag line at a crossing means?", "a": "No stopping or parking — pedestrian crossing ahead.", "category": "Markings"},
        ]
    },
    "traffic_law": {
        "title": "Sri Lanka Traffic Law",
        "questions": [
            {"q": "Maximum speed on Southern Expressway (E01)?", "a": "110 km/h for cars and light vehicles.", "category": "Speed"},
            {"q": "Default urban speed limit?", "a": "50 km/h unless otherwise signed.", "category": "Speed"},
            {"q": "Legal BAC limit for private vehicle drivers?", "a": "0.08% (80mg per 100ml blood).", "category": "Alcohol"},
            {"q": "BAC limit for professional drivers (bus/lorry)?", "a": "0.00% — zero tolerance.", "category": "Alcohol"},
            {"q": "Who has right of way at an uncontrolled intersection?", "a": "Vehicle coming from the right.", "category": "Right of Way"},
            {"q": "When must you use headlights?", "a": "30 min after sunset to 30 min before sunrise, and in poor visibility.", "category": "Lighting"},
        ]
    },
    "first_aid": {
        "title": "First Aid at Accidents",
        "questions": [
            {"q": "First step at a road accident?", "a": "Ensure safety — warn oncoming traffic, turn off ignition, call 119/110.", "category": "Emergency"},
            {"q": "Recovery position is used when?", "a": "Unconscious casualty who is breathing — tilt head, clear airway.", "category": "First Aid"},
            {"q": "How to control bleeding?", "a": "Apply direct firm pressure with clean cloth. Do not remove — add more if soaked.", "category": "First Aid"},
            {"q": "Do NOT move a casualty if?", "a": "Suspected spinal or neck injury — movement can cause paralysis.", "category": "Emergency"},
        ]
    },
}

PRACTICAL_TEST_TIPS = [
    {"tip": "Vehicle Pre-Check", "detail": "Examiner will ask you to check lights, wipers, horn, mirrors before moving. Know where everything is in the test vehicle.", "priority": "high"},
    {"tip": "Mirror Discipline", "detail": "Check mirrors every 5–8 seconds and before every manoeuvre. Examiner watches your eyes — make it obvious.", "priority": "high"},
    {"tip": "Hill Start", "detail": "Apply handbrake, select 1st gear, find clutch bite point, release handbrake as you raise clutch — no rolling back.", "priority": "high"},
    {"tip": "Parallel Parking", "detail": "Reverse into space at 45°, straighten when rear door aligns with front car's bumper. Common fail point — take your time.", "priority": "high"},
    {"tip": "Roundabout", "detail": "Yield to vehicles already on roundabout. Signal correctly: right on entry, left to exit. Don't cut across lanes.", "priority": "medium"},
    {"tip": "Speed Limits", "detail": "Do NOT exceed the limit — even if traffic flows faster. Examiner will fail you for 5+ km/h over limit.", "priority": "high"},
    {"tip": "Emergency Stop", "detail": "Examiner will signal. Brake firmly (don't pump), clutch down simultaneously, straighten steering. Check mirrors before pulling away.", "priority": "medium"},
    {"tip": "Common Fail Reasons", "detail": "Not stopping at stop signs · Mirrors not checked · Stalling multiple times · Crossing solid white lines · Unsafe road position.", "priority": "critical"},
]

DMT_OFFICES = [
    {"city": "Colombo (Head Office)", "address": "Elvitigala Mawatha, Narahenpita, Colombo 05", "phone": "011-2694150", "lat": 6.8996, "lon": 79.8751, "hours": "Mon–Fri 8:30AM–4:00PM"},
    {"city": "Kandy",    "address": "Peradeniya Road, Kandy",                         "phone": "081-2222940", "lat": 7.2906, "lon": 80.6337, "hours": "Mon–Fri 8:30AM–3:30PM"},
    {"city": "Galle",    "address": "Wakwella Road, Galle",                           "phone": "091-2222937", "lat": 6.0366, "lon": 80.2180, "hours": "Mon–Fri 8:30AM–3:30PM"},
    {"city": "Jaffna",   "address": "Hospital Road, Jaffna",                          "phone": "021-2222946", "lat": 9.6615, "lon": 80.0255, "hours": "Mon–Fri 8:30AM–3:30PM"},
    {"city": "Matara",   "address": "Anagarika Dharmapala Mawatha, Matara",           "phone": "041-2222940", "lat": 5.9549, "lon": 80.5550, "hours": "Mon–Fri 8:30AM–3:30PM"},
    {"city": "Kurunegala","address": "Rajapihilla Road, Kurunegala",                  "phone": "037-2222940", "lat": 7.4863, "lon": 80.3647, "hours": "Mon–Fri 8:30AM–3:30PM"},
    {"city": "Anuradhapura","address": "Maithripala Senanayake Mawatha, Anuradhapura","phone": "025-2222940", "lat": 8.3114, "lon": 80.4037, "hours": "Mon–Fri 8:30AM–3:30PM"},
    {"city": "Trincomalee","address": "Inner Harbour Road, Trincomalee",              "phone": "026-2222940", "lat": 8.5874, "lon": 81.2152, "hours": "Mon–Fri 8:30AM–3:30PM"},
]

FEES_2026 = [
    {"item": "Learner's Permit (new)",              "amount": 750,  "note": "Valid 2 years"},
    {"item": "Learner's Permit (renewal)",          "amount": 500,  "note": "If permit expired"},
    {"item": "Theory Test",                         "amount": 500,  "note": "Online or in-person"},
    {"item": "Practical Driving Test",              "amount": 750,  "note": "Per attempt"},
    {"item": "Driving Licence — 5 years",           "amount": 2500, "note": "Smart card"},
    {"item": "Driving Licence — 10 years",          "amount": 4000, "note": "Smart card"},
    {"item": "Duplicate / Lost Licence",            "amount": 2500, "note": "Police report required"},
    {"item": "Licence Category Addition",           "amount": 1500, "note": "e.g. add C to B"},
    {"item": "International Driving Permit (IDP)",  "amount": 3000, "note": "Valid 1 year, 185 countries"},
    {"item": "Postal Delivery of Licence",          "amount": 300,  "note": "Optional — to any address"},
    {"item": "Medical Certificate (Govt hospital)", "amount": 500,  "note": "Approx — varies"},
]


@router.get("/info")
async def get_license_info():
    return success_response("Driving licence information", {
        "categories":    LICENCE_CATEGORIES,
        "process_steps": PROCESS_STEPS,
        "fees":          FEES_2026,
        "dmt_offices":   DMT_OFFICES,
        "last_updated":  "2026-01",
    })


@router.get("/vehicle-rules/{vehicle_type}")
async def get_vehicle_rules(vehicle_type: str):
    rules = VEHICLE_RULES.get(vehicle_type)
    if not rules:
        available = list(VEHICLE_RULES.keys())
        from app.utils.response import error_response
        return error_response(f"Unknown vehicle type. Available: {available}", "NOT_FOUND", 404)
    return success_response(f"Rules for {vehicle_type}", rules)


@router.get("/all-vehicle-rules")
async def get_all_vehicle_rules():
    return success_response("All vehicle rules", VEHICLE_RULES)


@router.get("/updates-2026")
async def get_updates_2026():
    return success_response("2026 road rule updates", ROAD_RULES_2026)


@router.get("/theory-topics")
async def get_theory_topics():
    return success_response("Theory test topics", THEORY_TEST_TOPICS)


@router.get("/practical-tips")
async def get_practical_tips():
    return success_response("Practical test tips", PRACTICAL_TEST_TIPS)
