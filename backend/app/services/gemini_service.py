import base64
import json
import re
import time
import requests
from app.core.config import settings
from app.core.logging import logger

LANG_NAMES = {"en": "English", "ta": "Tamil", "si": "Sinhala"}
API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models"

# Fallback model chain — tried in order when the primary is rate-limited or unavailable
_MODEL_FALLBACKS = [
    "gemini-2.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash",
    "gemini-flash-lite-latest",
]
VISION_MODEL = "gemini-2.5-flash-lite"

SYSTEM_PROMPT = (
    "You are a Sri Lankan road-safety assistant. Answer questions about traffic "
    "signs, road rules, speed limits, emergency procedures and safe driving in "
    "Sri Lanka. Be concise, accurate and friendly. If a question is unrelated to "
    "roads or driving, politely steer back to road safety."
)


def _configured() -> bool:
    return bool(settings.GEMINI_API_KEY)


def _call_model(model: str, parts: list[dict], system: str | None, temperature: float) -> str:
    url = f"{API_ROOT}/{model}:generateContent"
    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": settings.GEMINI_API_KEY,
    }
    body = {
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {"temperature": temperature},
    }
    if system:
        body["system_instruction"] = {"parts": [{"text": system}]}
    resp = requests.post(url, headers=headers, json=body, timeout=45)
    resp.raise_for_status()
    data = resp.json()
    candidates = data.get("candidates", [])
    if not candidates:
        return ""
    out_parts = candidates[0].get("content", {}).get("parts", [])
    return "".join(p.get("text", "") for p in out_parts).strip()


def _generate(parts: list[dict], system: str | None = None, temperature: float = 0.4,
              model: str | None = None) -> str:
    """
    Call Gemini with automatic model fallback + exponential backoff on 429/503.
    Tries the requested model first, then walks _MODEL_FALLBACKS.
    """
    primary = model or settings.GEMINI_MODEL
    # Build candidate list: requested model first, then fallbacks (skip duplicates)
    candidates = [primary] + [m for m in _MODEL_FALLBACKS if m != primary]
    last_exc: Exception | None = None

    for m in candidates:
        delays = [0, 3, 8]  # 3 attempts per model: immediate, +3s, +8s
        for delay in delays:
            if delay:
                time.sleep(delay)
            try:
                return _call_model(m, parts, system, temperature)
            except requests.HTTPError as exc:
                status = exc.response.status_code if exc.response is not None else 0
                if status in (429, 503):
                    last_exc = exc
                    continue   # retry same model after delay
                raise          # 4xx other than 429 → don't retry
            except Exception as exc:
                last_exc = exc
                break          # network/timeout — try next model immediately
        # If we got here on the last delay without success, move to next model

    raise last_exc or RuntimeError("All Gemini models unreachable")

def ask_assistant(question: str, language: str = "en", context_type: str | None = None) -> str:
    lang = LANG_NAMES.get(language, "English")
    if not _configured():
        return f"[AI assistant offline] You asked (in {lang}): {question}"
        
    # Prepend specialized context guidelines to instruct the AI behavior
    context_prefix = ""
    if context_type == "sign_help":
        context_prefix = (
            "[Context: Traffic Sign Recognition Help] The user needs help understanding traffic signs, road symbols, "
            "shapes, colors, or regulatory meanings. Provide the correct sign meaning and safe driver compliance advice. "
        )
    elif context_type == "road_rule":
        context_prefix = (
            "[Context: Sri Lankan Highway Codes & Driving Laws] The user is querying road line markings, lane discipline, "
            "speed limits, crossing regulations, or traffic fine codes in Sri Lanka. Give direct legal and safety answers. "
        )
    elif context_type == "emergency":
        context_prefix = (
            "[Context: Roadside Emergency Support] The user is reporting or seeking guidance on a roadside incident, "
            "accident, vehicle breakdown, or medical crisis. Provide immediate, action-oriented, safety-first steps "
            "and guidance. Do not hesitate, prioritize life and safety. "
        )
    elif context_type == "tourist_help":
        context_prefix = (
            "[Context: Foreign Driver & Tourist Guidance] The user is a foreign tourist driving in Sri Lanka. Explain "
            "left-side driving protocols, speed limits on expressway segments, temporary licence endorsements at AAC, "
            "or local police/driving tips. Keep instructions friendly and clear. "
        )

    prompt = f"{context_prefix}Answer in {lang}. Question: {question}"
    import time
    for attempt in range(2):
        try:
            result = _generate([{"text": prompt}], system=SYSTEM_PROMPT)
            if result:
                return result
        except Exception:
            if attempt == 0:
                time.sleep(1.5)
    return "The AI assistant is temporarily unavailable. Please try again in a moment."

def translate_text(text: str, target_language: str) -> str:
    lang = LANG_NAMES.get(target_language, "English")
    if not _configured():
        return text
    try:
        result = _generate(
            [{"text": (
                f"Translate the following text to {lang}. "
                f"Return ONLY the translated text, no explanations:\n\n{text}"
            )}],
            temperature=0.1,
        )
        return result if result else text
    except Exception:
        return text


def translate_batch(texts: list[str], target_language: str) -> list[str]:
    """Translate multiple strings in one API call — more efficient for the translation page."""
    import re as _re
    lang = LANG_NAMES.get(target_language, "English")
    if not _configured() or not texts:
        return texts
    numbered = "\n".join(f"{i+1}. {t}" for i, t in enumerate(texts))
    prompt = (
        f"Translate each numbered item to {lang}. "
        f"Return ONLY the numbered translations in the same format:\n\n{numbered}"
    )
    try:
        raw = _generate([{"text": prompt}], temperature=0.1)
        lines = [l.strip() for l in raw.strip().split("\n") if l.strip()]
        results = [_re.sub(r"^\d+\.\s*", "", l) for l in lines]
        while len(results) < len(texts):
            results.append(texts[len(results)])
        return results[:len(texts)]
    except Exception:
        return texts

def get_sign_explanation(sign_name: str) -> str:
    if not _configured():
        return f"Obey rules related to the '{sign_name}' sign."
    prompt = (
        f"Explain the meaning and required driver action for the Sri Lankan traffic sign: '{sign_name}'. "
        f"Format your response as a single, clear sentence in English."
    )
    try:
        return _generate([{"text": prompt}], temperature=0.3)
    except Exception as exc:
        return f"Obey rules related to the '{sign_name}' sign."

def classify_sign_crop(crop_bytes: bytes) -> dict | None:
    """
    Identify a single traffic sign from a cropped image using Gemini Vision.
    Returns {"sign_name", "confidence", "meaning"} or None if unavailable.
    """
    if not _configured():
        return None
    img_b64 = base64.b64encode(crop_bytes).decode()
    prompt = (
        "This is a cropped image of a single road traffic sign. "
        "Identify it precisely and return ONLY a JSON object with exactly these keys:\n"
        "sign_name, confidence, meaning\n\n"
        "Rules:\n"
        "- sign_name: the official traffic sign name as a string\n"
        "- confidence: float 0.0-1.0\n"
        "- meaning: one sentence — what the driver must do\n"
        "- If it is NOT a traffic sign, or the image is too small/blurry/unclear to identify "
        "with certainty, return: {\"sign_name\": null}\n"
        "- Never guess. Do NOT invent a sign name if you cannot clearly see one.\n"
        "Return ONLY the JSON object, no extra text."
    )
    parts = [
        {"inline_data": {"mime_type": "image/jpeg", "data": img_b64}},
        {"text": prompt},
    ]
    try:
        raw = _generate(parts, temperature=0.1, model=VISION_MODEL)
        match = re.search(r"\{.*?\}", raw, re.DOTALL)
        if match:
            data = json.loads(match.group())
            if data.get("sign_name"):
                return {
                    "sign_name": data["sign_name"],
                    "confidence": float(data.get("confidence", 0.88)),
                    "meaning": data.get("meaning", ""),
                }
    except Exception:
        pass
    return None


def detect_signs_in_image(image_bytes: bytes) -> list:
    """
    Full-image Gemini Vision scan — finds AND identifies all traffic signs.
    Used when YOLO finds no bounding boxes.
    """
    if not _configured():
        return []
    img_b64 = base64.b64encode(image_bytes).decode()
    prompt = (
        "Look at this image carefully. Identify every road/traffic sign present "
        "(regulatory signs, warning signs, mandatory signs, "
        "and any other road-related sign). "
        "Return a JSON array. Each item is an object with exactly these keys:\n"
        "sign_name (official sign name as a string), confidence (float 0.0-1.0), "
        "meaning (one sentence - what the driver must do)\n"
        "- If this is a standalone sign image, identify that sign.\n"
        "- Only include signs you can clearly see and identify. Never guess.\n"
        "- Return [] ONLY if absolutely no road signs are visible.\n"
        "Return ONLY the JSON array, no extra text."
    )
    parts = [
        {"inline_data": {"mime_type": "image/jpeg", "data": img_b64}},
        {"text": prompt},
    ]
    try:
        raw = _generate(parts, temperature=0.1, model=VISION_MODEL)
        match = re.search(r"\[.*?\]", raw, re.DOTALL)
        if match:
            found = json.loads(match.group())
            # Stamp the source here rather than at the call sites: whoever consumes
            # these detections must be able to say Gemini named the sign, not ResNet50.
            signs = [
                {**item, "classified_by": "gemini"}
                for item in found
                if isinstance(item, dict)
            ]
            if not signs:
                logger.info("Gemini vision found no signs. Raw response: %r", raw[:200])
            return signs
        logger.warning("Gemini vision returned no JSON array. Raw response: %r", raw[:300])
    except Exception as exc:
        # Swallowing this silently makes an exhausted quota or a network failure look
        # identical to "no sign in the picture", which sends you hunting the wrong bug.
        logger.warning("Gemini vision scan failed: %s: %s", type(exc).__name__, exc)
    return []


def extract_road_document(image_bytes: bytes, type_spec: str) -> dict | None:
    """
    Read any Sri Lankan road document (temporary permit, driving licence, revenue
    licence, insurance certificate, vehicle registration, emission/VRC certificate)
    using Gemini Vision. `type_spec` describes the supported types and their fields —
    it is built by document_service from its DOC_TYPES registry.
    Returns {"document_type", "confidence", "fields": {...}} or None if unavailable.
    """
    if not _configured():
        return None
    img_b64 = base64.b64encode(image_bytes).decode()
    prompt = (
        "This is a photo of a Sri Lankan road/vehicle document. Sri Lankan documents are "
        "printed in Sinhala, Tamil and English, and some are filled in by hand.\n\n"
        "STEP 1 — Identify which of these document types it is:\n"
        f"{type_spec}\n\n"
        "STEP 2 — Extract that type's fields.\n\n"
        "Return ONLY a JSON object with exactly these keys:\n"
        "document_type, confidence, fields\n\n"
        "Rules:\n"
        "- document_type: one of the type keys listed above. If the image is not any of "
        "them, return {\"document_type\": \"unknown\"}\n"
        "- fields: a JSON object using only the field names listed for that type\n"
        "- Every date: normalise to YYYY-MM-DD. Handwritten dates are usually DD/MM/YY "
        "or DD/MM/YYYY. Treat a 2-digit year YY as 20YY\n"
        "- Any money amount: a plain number, no commas or currency symbol\n"
        "- categories_permitted: a JSON array of licence category codes that are CIRCLED "
        "or TICKED in the A B C D E F G / A1 B1 C1 D1 E1 F1 G1 grid, e.g. [\"A\", \"A1\"]. "
        "Codes crossed out are NOT permitted — exclude them\n"
        "- Any handwritten Sinhala or Tamil text: translate it to English\n"
        "- confidence: your overall float 0.0-1.0 confidence in this reading\n"
        "- Use null for any field you cannot read clearly. NEVER invent or guess — "
        "a wrong name, NIC, or expiry date is far worse than null\n"
        "Return ONLY the JSON object, no extra text."
    )
    parts = [
        {"inline_data": {"mime_type": "image/jpeg", "data": img_b64}},
        {"text": prompt},
    ]
    try:
        raw = _generate(parts, temperature=0.0, model=VISION_MODEL)
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception:
        pass
    return None


_EMERGENCY_FALLBACK = {
    "accident": (
        "• Move your vehicle off the road if it is safe to do so and turn on hazard lights.\n"
        "• Check yourself and passengers for injuries — do not move anyone with a spinal injury.\n"
        "• Call the National Police (119) and Suwa Seriya Ambulance (1990) immediately.\n"
        "• Do not admit fault at the scene. Take photos of all vehicles and damage for insurance.\n"
        "• Place a warning triangle at least 50 m behind the vehicle to alert oncoming traffic."
    ),
    "breakdown": (
        "• Steer to the roadside shoulder, switch on hazard lights, and turn off the engine.\n"
        "• Place a warning triangle at least 50 m behind the vehicle before leaving the car.\n"
        "• Call the nearest garage or the Expressway Emergency line (1969) if on an expressway.\n"
        "• Stay well away from the traffic lane while waiting for assistance.\n"
        "• Do not attempt repairs on the road; wait for a professional mechanic."
    ),
    "medical": (
        "• Call Suwa Seriya Ambulance immediately: 1990 (24/7 free service).\n"
        "• Keep the person still, calm, and warm. Loosen any tight clothing.\n"
        "• If the person is unconscious and not breathing, begin CPR if you are trained.\n"
        "• Do not give food or water to an unconscious person.\n"
        "• Stay on the phone with the dispatcher and follow their instructions until help arrives."
    ),
    "tire": (
        "• Grip the steering wheel firmly and ease off the accelerator gradually — do not brake hard.\n"
        "• Steer smoothly to the road shoulder and switch on your hazard lights.\n"
        "• Apply the handbrake and engage first gear or parking gear before exiting.\n"
        "• Place wheel chocks or rocks behind the opposite wheels before using the jack.\n"
        "• Loosen lug nuts before raising the car. Call for roadside help if you lack a spare."
    ),
}

def generate_emergency_guidance(emergency_type: str, description: str | None = None, language: str = "en") -> str:
    lang = LANG_NAMES.get(language, "English")
    fallback = _EMERGENCY_FALLBACK.get(
        emergency_type,
        (
            "• Switch on hazard lights and move off the road if safe.\n"
            "• Call National Police (119) or Suwa Seriya Ambulance (1990).\n"
            "• Stay calm, stay visible, and await official assistance."
        ),
    )

    if not _configured():
        return fallback

    desc_str = f" User description: {description}." if description else ""
    prompt = (
        f"Generate immediate, safety-critical advice for a road/traffic emergency in Sri Lanka. "
        f"Emergency Type: {emergency_type}.{desc_str} "
        f"Provide 4-5 bullet points of immediate actions to take. Be concise, clear, and action-oriented. "
        f"Answer in {lang}."
    )
    import time
    last_exc = None
    for attempt in range(2):
        try:
            result = _generate([{"text": prompt}], temperature=0.3)
            if result:
                return result
        except Exception as exc:
            last_exc = exc
            if attempt == 0:
                time.sleep(1.5)
    # Gemini unavailable — return hardcoded guidance silently
    return fallback
