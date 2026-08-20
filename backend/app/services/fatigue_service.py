"""
Driver fatigue and distraction detection.

Works on a single webcam frame at a time. MediaPipe's face landmarker gives 478 points,
from which three things are computed:

  * **EAR** (Eye Aspect Ratio) — the classic Soukupová & Čech measure. Six points per eye;
    the ratio of vertical eyelid distance to horizontal eye width. It collapses towards
    zero when the eye closes and is largely independent of how far away the face is.
  * **PERCLOS** — the fraction of the last minute the eyes were closed. This, not a single
    blink, is what actually correlates with drowsiness, so the state machine is built on it.
  * **Head pose** — yaw and pitch from the facial transformation matrix. A head turned or
    tilted down for several seconds is looking at a phone or a lap, not the road.

Because a verdict depends on what happened over the preceding seconds, per-session state is
kept in memory keyed by a session id the frontend generates. It is deliberately not stored
in the database — it is worthless once the drive ends, and it is camera data.
"""

import math
import time
from collections import deque
from dataclasses import dataclass, field
from threading import Lock

import numpy as np

MODEL_PATH = "app/ml/weights/face_landmarker.task"

# Landmark indices for the six-point EAR, in the order the formula expects:
# (outer corner, upper-1, upper-2, inner corner, lower-2, lower-1)
LEFT_EYE = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [362, 385, 387, 263, 373, 380]

# Below this the eye counts as closed. 0.21 is the widely used threshold; individual
# faces vary, so the frontend calibrates against the driver's own open-eye baseline.
EAR_CLOSED = 0.21

# How long the eyes must stay shut before it is a microsleep rather than a blink
MICROSLEEP_SECONDS = 1.2

# PERCLOS over the rolling window that counts as drowsy (15% is the usual driving figure)
PERCLOS_WINDOW_SECONDS = 60
PERCLOS_DROWSY = 0.15

# Head turned/tilted beyond this for this long means the driver is not watching the road
YAW_LIMIT_DEG = 25.0
PITCH_DOWN_LIMIT_DEG = 20.0
DISTRACTION_SECONDS = 2.0

# Sessions idle longer than this are dropped so the process does not grow forever
SESSION_IDLE_SECONDS = 900

_landmarker = None
_landmarker_lock = Lock()


def _get_landmarker():
    """Created once and reused — building it per frame costs more than the inference."""
    global _landmarker
    if _landmarker is None:
        with _landmarker_lock:
            if _landmarker is None:
                from mediapipe.tasks import python as mpp
                from mediapipe.tasks.python import vision

                _landmarker = vision.FaceLandmarker.create_from_options(
                    vision.FaceLandmarkerOptions(
                        base_options=mpp.BaseOptions(model_asset_path=MODEL_PATH),
                        running_mode=vision.RunningMode.IMAGE,
                        num_faces=1,
                        output_face_blendshapes=False,
                        output_facial_transformation_matrixes=True,
                    )
                )
    return _landmarker


def eye_aspect_ratio(points: list[tuple[float, float]]) -> float:
    """
    EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)

    Two vertical eyelid distances over the horizontal width. Open eye ≈ 0.3, closed ≈ 0.
    """
    def dist(a, b):
        return math.hypot(a[0] - b[0], a[1] - b[1])

    p1, p2, p3, p4, p5, p6 = points
    horizontal = dist(p1, p4)
    if horizontal == 0:
        return 0.0
    return (dist(p2, p6) + dist(p3, p5)) / (2.0 * horizontal)


def head_pose_from_matrix(matrix) -> tuple[float, float, float]:
    """Yaw, pitch and roll in degrees from the 4x4 facial transformation matrix."""
    m = np.array(matrix).reshape(4, 4)
    r = m[:3, :3]

    sy = math.sqrt(r[0, 0] ** 2 + r[1, 0] ** 2)
    if sy > 1e-6:
        pitch = math.degrees(math.atan2(r[2, 1], r[2, 2]))
        yaw = math.degrees(math.atan2(-r[2, 0], sy))
        roll = math.degrees(math.atan2(r[1, 0], r[0, 0]))
    else:
        pitch = math.degrees(math.atan2(-r[1, 2], r[1, 1]))
        yaw = math.degrees(math.atan2(-r[2, 0], sy))
        roll = 0.0
    return yaw, pitch, roll


@dataclass
class Session:
    """Rolling state for one driver, one drive."""

    started_at: float = field(default_factory=time.time)
    last_seen: float = field(default_factory=time.time)

    # (timestamp, closed?) for PERCLOS
    closed_history: deque = field(default_factory=lambda: deque(maxlen=1800))

    eyes_closed_since: float | None = None
    looking_away_since: float | None = None
    no_face_since: float | None = None

    blink_count: int = 0
    was_closed: bool = False

    # Driver's own open-eye EAR, learned over the first few seconds
    baseline_samples: list = field(default_factory=list)
    baseline_ear: float | None = None

    alerts_raised: int = 0
    frames: int = 0


_sessions: dict[str, Session] = {}
_sessions_lock = Lock()


def _get_session(session_id: str) -> Session:
    now = time.time()
    with _sessions_lock:
        for sid in [s for s, sess in _sessions.items() if now - sess.last_seen > SESSION_IDLE_SECONDS]:
            _sessions.pop(sid, None)
        session = _sessions.setdefault(session_id, Session())
        session.last_seen = now
        return session


def reset_session(session_id: str) -> None:
    with _sessions_lock:
        _sessions.pop(session_id, None)


def _perclos(session: Session, now: float) -> float:
    """Fraction of the rolling window with eyes closed."""
    cutoff = now - PERCLOS_WINDOW_SECONDS
    recent = [closed for ts, closed in session.closed_history if ts >= cutoff]
    if not recent:
        return 0.0
    return sum(1 for c in recent if c) / len(recent)


def analyse_frame(session_id: str, image_bgr: np.ndarray) -> dict:
    """
    One frame in, a verdict out.

    Returns ``status`` of alert | drowsy | distracted | no_face | ok, the numbers behind
    it, and a short message the frontend can speak aloud.
    """
    import mediapipe as mp

    session = _get_session(session_id)
    session.frames += 1
    now = time.time()

    rgb = np.ascontiguousarray(image_bgr[:, :, ::-1])
    result = _get_landmarker().detect(
        mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    )

    # ── No face in frame ────────────────────────────────────────────────────────
    if not result.face_landmarks:
        session.eyes_closed_since = None
        session.looking_away_since = None
        session.no_face_since = session.no_face_since or now
        away_for = now - session.no_face_since
        severe = away_for >= DISTRACTION_SECONDS
        if severe:
            session.alerts_raised += 1
        return {
            "status": "no_face" if not severe else "distracted",
            "face_detected": False,
            "message": (
                "Face not visible — keep your eyes on the road."
                if severe else
                "No face detected. Position the camera so it can see you."
            ),
            "speak": severe,
            "ear": None, "perclos": _perclos(session, now),
            "yaw": None, "pitch": None,
            "eyes_closed_seconds": 0.0,
            "looking_away_seconds": round(away_for, 1),
            "blink_count": session.blink_count,
            "baseline_ear": session.baseline_ear,
            "calibrating": session.baseline_ear is None,
            "frames": session.frames,
            "alerts_raised": session.alerts_raised,
        }

    session.no_face_since = None
    landmarks = result.face_landmarks[0]
    height, width = image_bgr.shape[:2]

    def pt(i):
        lm = landmarks[i]
        return (lm.x * width, lm.y * height)

    left_ear = eye_aspect_ratio([pt(i) for i in LEFT_EYE])
    right_ear = eye_aspect_ratio([pt(i) for i in RIGHT_EYE])
    ear = (left_ear + right_ear) / 2.0

    yaw = pitch = None
    if result.facial_transformation_matrixes:
        yaw, pitch, _ = head_pose_from_matrix(result.facial_transformation_matrixes[0])

    # ── Calibration: learn this driver's open-eye EAR ───────────────────────────
    if session.baseline_ear is None:
        if ear > EAR_CLOSED:
            session.baseline_samples.append(ear)
        if len(session.baseline_samples) >= 20:
            session.baseline_ear = round(float(np.median(session.baseline_samples)), 4)

    # A driver with naturally narrow eyes would trip a fixed threshold constantly, so
    # once calibrated the threshold follows their own baseline.
    threshold = (
        max(EAR_CLOSED * 0.75, session.baseline_ear * 0.72)
        if session.baseline_ear else EAR_CLOSED
    )
    closed = ear < threshold

    session.closed_history.append((now, closed))

    # Blink = a closed frame followed by an open one
    if closed and not session.was_closed:
        session.eyes_closed_since = now
    elif not closed and session.was_closed:
        session.blink_count += 1
        session.eyes_closed_since = None
    session.was_closed = closed

    eyes_closed_for = (now - session.eyes_closed_since) if (closed and session.eyes_closed_since) else 0.0
    perclos = _perclos(session, now)

    looking_away = (
        yaw is not None and (abs(yaw) > YAW_LIMIT_DEG or pitch is not None and pitch < -PITCH_DOWN_LIMIT_DEG)
    )
    if looking_away:
        session.looking_away_since = session.looking_away_since or now
    else:
        session.looking_away_since = None
    looking_away_for = (now - session.looking_away_since) if session.looking_away_since else 0.0

    # ── Verdict, most serious first ─────────────────────────────────────────────
    if eyes_closed_for >= MICROSLEEP_SECONDS:
        status, speak = "alert", True
        message = "Wake up! Your eyes have been closed. Pull over safely."
    elif perclos >= PERCLOS_DROWSY and session.baseline_ear is not None:
        status, speak = "drowsy", True
        message = "You are showing signs of drowsiness. Take a break."
    elif looking_away_for >= DISTRACTION_SECONDS:
        status, speak = "distracted", True
        message = (
            "Eyes on the road — put the phone down."
            if pitch is not None and pitch < -PITCH_DOWN_LIMIT_DEG
            else "Eyes on the road."
        )
    elif session.baseline_ear is None:
        status, speak, message = "ok", False, "Calibrating — look at the road normally."
    else:
        status, speak, message = "ok", False, "Alert and watching the road."

    if speak:
        session.alerts_raised += 1

    return {
        "status": status,
        "face_detected": True,
        "message": message,
        "speak": speak,
        "ear": round(ear, 4),
        "left_ear": round(left_ear, 4),
        "right_ear": round(right_ear, 4),
        "threshold": round(threshold, 4),
        "eyes_closed": closed,
        "eyes_closed_seconds": round(eyes_closed_for, 1),
        "perclos": round(perclos, 3),
        "perclos_limit": PERCLOS_DROWSY,
        "yaw": round(yaw, 1) if yaw is not None else None,
        "pitch": round(pitch, 1) if pitch is not None else None,
        "looking_away": looking_away,
        "looking_away_seconds": round(looking_away_for, 1),
        "blink_count": session.blink_count,
        "baseline_ear": session.baseline_ear,
        "calibrating": session.baseline_ear is None,
        "calibration_progress": min(100, len(session.baseline_samples) * 5) if session.baseline_ear is None else 100,
        "frames": session.frames,
        "alerts_raised": session.alerts_raised,
        "session_seconds": round(now - session.started_at, 1),
    }


def thresholds() -> dict:
    """What the detector is using, so the page can explain itself."""
    return {
        "ear_closed": EAR_CLOSED,
        "microsleep_seconds": MICROSLEEP_SECONDS,
        "perclos_window_seconds": PERCLOS_WINDOW_SECONDS,
        "perclos_drowsy": PERCLOS_DROWSY,
        "yaw_limit_deg": YAW_LIMIT_DEG,
        "pitch_down_limit_deg": PITCH_DOWN_LIMIT_DEG,
        "distraction_seconds": DISTRACTION_SECONDS,
        "method": (
            "MediaPipe Face Landmarker (478 points). EAR follows Soukupová & Čech; "
            "drowsiness is judged on PERCLOS over a rolling minute rather than a single "
            "blink, and head pose comes from the facial transformation matrix."
        ),
        "privacy": (
            "Frames are analysed and discarded — nothing is written to disk or the "
            "database. Only the derived numbers come back."
        ),
        "limitation": (
            "A webcam-based detector is an aid, not a safety system. It is affected by "
            "darkness, sunglasses and camera angle, and must never be relied on to keep "
            "a tired driver awake. The only real remedy for fatigue is stopping."
        ),
    }
