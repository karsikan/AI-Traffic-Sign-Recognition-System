"""
Accident claim hub.

The minutes after a collision are the worst possible time to be working out who to call
and what to photograph, so this is written to be read at the roadside: the number first,
the photographs second, the paperwork after.

Only hotlines that could be checked against the insurer's own site are listed with a
number. The rest are named with a link, because a wrong number at that moment is worse
than no number at all.
"""

from datetime import date

VERIFIED_ON = "2026-08-13"

# ── Insurers ────────────────────────────────────────────────────────────────────

INSURERS = [
    {
        "key": "ceylinco",
        "name": "Ceylinco Insurance",
        "claim_hotline": "0112393939",
        "display": "011 239 3939",
        "hours": "24 hours, 365 days",
        "url": "https://www.ceylinco-insurance.com/",
        "note": "The 'VIP on the spot' service settles many motor claims at the scene.",
        "verified": True,
    },
    {
        "key": "fairfirst",
        "name": "Fairfirst Insurance",
        "claim_hotline": "0112428428",
        "display": "011 242 8428",
        "hours": "24 / 7",
        "url": "https://www.fairfirst.lk/how-can-i-make-a-claim/accident-claims/",
        "note": "Click2Claim handles smaller claims virtually, without waiting for an assessor.",
        "verified": True,
    },
    {
        "key": "allianz",
        "name": "Allianz Insurance Lanka",
        "claim_hotline": "0112300800",
        "display": "011 230 0800",
        "hours": "24 hour assistance",
        "url": "https://www.allianz.lk/contact-us/contact-general-insurance.html",
        "note": None,
        "verified": True,
    },
    {
        "key": "sli",
        "name": "Sri Lanka Insurance",
        "claim_hotline": None,
        "display": None,
        "hours": "24 / 7",
        "url": "https://www.srilankainsurance.com/",
        "note": "Number not confirmed here — it is printed on your policy schedule and on the site.",
        "verified": False,
    },
    {
        "key": "union",
        "name": "Union Assurance",
        "claim_hotline": None,
        "display": None,
        "hours": "24 / 7",
        "url": "https://unionassurance.com/",
        "note": "Number not confirmed here — check your policy schedule.",
        "verified": False,
    },
    {
        "key": "janashakthi",
        "name": "Janashakthi Insurance",
        "claim_hotline": None,
        "display": None,
        "hours": "24 / 7",
        "url": "https://www.janashakthi.com/",
        "note": "Number not confirmed here — check your policy schedule.",
        "verified": False,
    },
    {
        "key": "hnb",
        "name": "HNB General Insurance",
        "claim_hotline": None,
        "display": None,
        "hours": "24 / 7",
        "url": "https://www.hnbgeneral.com/",
        "note": "Number not confirmed here — check your policy schedule.",
        "verified": False,
    },
    {
        "key": "coop",
        "name": "Co-operative Insurance",
        "claim_hotline": None,
        "display": None,
        "hours": "Office hours plus emergency line",
        "url": "https://www.coop.lk/",
        "note": "Number not confirmed here — check your policy schedule.",
        "verified": False,
    },
]

# ── At the scene ────────────────────────────────────────────────────────────────

IMMEDIATE_STEPS = [
    {"step": 1, "title": "People before vehicles",
     "detail": "Anyone injured? Call 1990 for Suwa Seriya, or 119. Do not move an injured person unless the vehicle is on fire or about to be struck.",
     "urgent": True},
    {"step": 2, "title": "Make the scene safe",
     "detail": "Hazard lights on. If the vehicles are drivable and nobody is hurt, photograph the positions first, then move them clear of traffic.",
     "urgent": True},
    {"step": 3, "title": "Do not move the vehicles until you have the photographs",
     "detail": "Final positions are the single most useful piece of evidence for deciding fault. Once they are moved, that evidence is gone for good.",
     "urgent": True},
    {"step": 4, "title": "Call your insurer before you agree anything",
     "detail": "They will tell you whether an assessor is coming and whether they want a police report. Agreeing to settle privately before that call is how people end up paying twice.",
     "urgent": True},
    {"step": 5, "title": "Exchange details",
     "detail": "Name, NIC, address, phone, vehicle number, insurer and policy number. Photograph the other driver's licence and insurance certificate rather than copying them out.",
     "urgent": False},
    {"step": 6, "title": "Find a witness",
     "detail": "A name and phone number from someone independent. Most disputed claims turn on whether one exists.",
     "urgent": False},
    {"step": 7, "title": "Report to the police where required",
     "detail": "See the section below. Where a report is needed, go to the station for the area the accident happened in, not your own.",
     "urgent": False},
]

# ── Photographs ─────────────────────────────────────────────────────────────────

PHOTO_CHECKLIST = [
    {"key": "wide_scene", "label": "Wide shot of the whole scene",
     "detail": "Stand back far enough to show both vehicles, the road and the direction of travel in one frame. Take it before anything moves.",
     "priority": "essential"},
    {"key": "positions", "label": "Vehicle positions from four sides",
     "detail": "Walk around the scene and shoot from front, back and both sides. This is what shows who was where.",
     "priority": "essential"},
    {"key": "damage_close", "label": "Close-up of every damaged area",
     "detail": "Each panel separately, straight on. Include your own vehicle's undamaged panels too — it stops an insurer attributing older damage to this accident.",
     "priority": "essential"},
    {"key": "other_plate", "label": "The other vehicle's number plate",
     "detail": "Clear and legible, with the vehicle visible in the same frame so the plate cannot be disputed.",
     "priority": "essential"},
    {"key": "other_documents", "label": "The other driver's licence and insurance certificate",
     "detail": "Photograph rather than transcribe. Numbers get copied down wrong at the roadside.",
     "priority": "essential"},
    {"key": "road_marks", "label": "Skid marks, debris and fluid on the road",
     "detail": "These show speed and point of impact, and they are gone within hours.",
     "priority": "important"},
    {"key": "signs_signals", "label": "Signs, signals and road markings",
     "detail": "Any stop sign, give-way line, traffic light or lane marking that bears on who had right of way.",
     "priority": "important"},
    {"key": "conditions", "label": "Road and weather conditions",
     "detail": "Wet surface, poor light, roadworks, an obscured sign — anything that contributed.",
     "priority": "important"},
    {"key": "wide_context", "label": "A landmark that fixes the location",
     "detail": "A junction name, kilometre post or shopfront, so the position cannot be argued later.",
     "priority": "important"},
    {"key": "injuries", "label": "Visible injuries, if any",
     "detail": "With the person's consent. Also keep every medical bill and report.",
     "priority": "situational"},
]

# ── Police report ───────────────────────────────────────────────────────────────

POLICE_REPORT_RULES = [
    {"situation": "Anyone is injured or killed", "required": True,
     "detail": "Report immediately. Leaving the scene of an injury accident is a serious offence in itself under Sections 159 and 160."},
    {"situation": "The other party disputes fault", "required": True,
     "detail": "Without a police entry it becomes one word against another, and the insurer will usually apportion the loss."},
    {"situation": "The other vehicle is uninsured or the driver has no licence", "required": True,
     "detail": "Your own recovery may depend on the police record."},
    {"situation": "A hit and run, or the other driver leaves", "required": True,
     "detail": "Report at once with whatever you have — even a partial plate number."},
    {"situation": "Damage to public property or a third party's wall, fence or pole", "required": True,
     "detail": "The owner will claim, and the claim will be against you."},
    {"situation": "Minor damage, both insured, both agree what happened", "required": False,
     "detail": "Many insurers settle without a police report. Ask them first — some policies require one regardless."},
]

# ── Claim process ───────────────────────────────────────────────────────────────

CLAIM_STEPS = [
    {"step": 1, "title": "Notify within the policy's time limit",
     "detail": "Most motor policies require notice within 24 to 48 hours. Late notice is a common reason for a claim being cut back or refused."},
    {"step": 2, "title": "Get the claim reference number",
     "detail": "Write it down at the time of the call. Every later conversation starts with it."},
    {"step": 3, "title": "Wait for the assessor if one is coming",
     "detail": "Do not start repairs before the vehicle has been assessed — an insurer can decline the cost of work it never saw."},
    {"step": 4, "title": "Submit the documents",
     "detail": "Claim form, a copy of the CR, your driving licence, the insurance certificate, the police report where there is one, and repair estimates."},
    {"step": 5, "title": "Use an approved garage where the policy says so",
     "detail": "Comprehensive policies often have a network. Going outside it can mean paying the difference yourself."},
    {"step": 6, "title": "Keep every receipt",
     "detail": "Towing, storage, hire of a replacement vehicle — several of these are recoverable under a full policy but only against receipts."},
]

COVER_TYPES = [
    {"type": "Third party only", "covers": "Damage and injury you cause to others",
     "not_covered": "Your own vehicle, whatever happens",
     "note": "The legal minimum. If you are at fault, your own repairs come out of your pocket."},
    {"type": "Third party, fire and theft", "covers": "Third party liability, plus your vehicle if it burns or is stolen",
     "not_covered": "Collision damage to your own vehicle",
     "note": "A middle option, common on older vehicles."},
    {"type": "Comprehensive (full option)", "covers": "Third party liability and damage to your own vehicle, at fault or not",
     "not_covered": "Wear, mechanical failure, and driving outside the policy terms",
     "note": "Check the excess, and whether a no-claim bonus is protected before you claim for something small."},
]

EMERGENCY_NUMBERS = [
    {"name": "Ambulance (Suwa Seriya)", "number": "1990", "when": "Anyone injured"},
    {"name": "Police emergency", "number": "119", "when": "Injury, dispute, or crime"},
    {"name": "Expressway emergency", "number": "1969", "when": "Any incident on E01–E04"},
    {"name": "Fire and rescue", "number": "110", "when": "Fire, fuel spill, trapped occupant"},
]

DATA_NOTE = (
    f"Insurer hotlines marked as confirmed were checked against the insurer's own site on "
    f"{VERIFIED_ON}. The others are listed without a number on purpose — a wrong number at "
    "the roadside is worse than none, so use the one printed on your policy schedule. "
    "Claim procedures and time limits vary by policy; yours is what governs."
)


def claim_hub() -> dict:
    return {
        "insurers": INSURERS,
        "verified_count": sum(1 for i in INSURERS if i["verified"]),
        "immediate_steps": IMMEDIATE_STEPS,
        "photo_checklist": PHOTO_CHECKLIST,
        "police_report_rules": POLICE_REPORT_RULES,
        "claim_steps": CLAIM_STEPS,
        "cover_types": COVER_TYPES,
        "emergency_numbers": EMERGENCY_NUMBERS,
        "data_note": DATA_NOTE,
        "verified_on": VERIFIED_ON,
        "today": date.today().isoformat(),
    }


def find_insurer(key: str) -> dict | None:
    return next((i for i in INSURERS if i["key"] == key), None)
