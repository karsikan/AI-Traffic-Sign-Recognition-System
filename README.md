# AI-Integrated Traffic Sign Recognition System

Final year project (CIS6035) — AI Traffic Sign Recognition and Road Safety System for Sri Lanka.

A driver-facing web application built around two trained models (YOLOv8 for detection, ResNet50
for classification) and extended into the things a Sri Lankan driver actually needs at the
roadside: what a fine costs, what your rights are when police stop you, whether your documents
have expired, and whether you are too tired to be driving.

## Features

### AI detection
- **Image, video, webcam and batch detection** — YOLOv8 locates signs, Gemini Vision classifies
  each crop, ResNet50 is the local fallback
- **Camera Sign Trainer** — point the camera at a sign, get its meaning, then a quiz on it
- **Model page** — training curves, per-class accuracy, a YOLOv8/ResNet50 comparison, and a
  latency benchmark measured live on the machine you run it on

### While driving
- **Driver Fatigue Monitor** — MediaPipe face landmarks → Eye Aspect Ratio, PERCLOS over a
  rolling minute, and head pose. Speaks a warning before a microsleep becomes a crash
- **Speed & Zone warnings** — GPS speed against the limit that actually applies, including
  school and hospital zones, with a spoken alert
- **Checkpoints & Hazards** — 12 kinds of driver-reported hazard that expire on their own
- **Accident blackspots** — a seed list plus clusters derived from the app's own accident reports

### Police and fines
- **Police Stopped You** — rights, duties, the breath-test procedure, the protocol for women
  drivers, and every hotline including CIABOC
- **Fine & Violation Guide** — 40 offences across 10 categories with section, amount, demerit
  points, and whether it is settleable at a post office or must go to court
- **My Fines** — track a spot fine through the 14/28-day windows to court, with a double-fine
  calculator and licence-retrieval guidance
- **Demerit Points** — a rolling 12-month balance against the 12-point suspension threshold
- **Digital Locker** — document expiry tracking with alerts
- **Incident Recorder** — timestamped photo and audio evidence with a generated statement
- **PDF driver report** — fines, points, documents and detections in one document

### Owning and running a vehicle
- **Revenue & Emission** — type your number plate and it reads the province off it and opens
  the right eRL portal. Sri Lanka runs two: the Western Province has its own, everyone else
  uses eRL 2.0, and being sent to the wrong one wastes a morning
- **Expressway Tolls** — the fare between any two interchanges on E01–E04, for three vehicle
  classes, plus the full fare board from your entry point and ETC card guidance
- **Fuel & Trip Cost** — a price board that states how old its prices are, and an estimator
  that takes your own pump price so the answer is exact
- **Ownership Transfer** — MTA 6, 8 and 3, the sequence for buyer and seller, and a
  nine-point checklist built around the two ways people lose money: open papers and an
  undischarged lease
- **Accident Claim** — insurer hotlines, a ten-item photo checklist, and when a police
  report is actually required

### Other
- Trilingual throughout (English / தமிழ் / සිංහල), AI assistant, translation, tourist guide,
  emergency SOS, nearby services, driving licence guide, road-rules quiz

## Technology

- **Backend:** Python 3.13, FastAPI, SQLAlchemy, MySQL (SQLite fallback)
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **AI:** YOLOv8 (detection), ResNet50 (classification), MediaPipe Face Landmarker (fatigue),
  Gemini Vision (document OCR and sign classification)
- **Datasets:** GTSRB (43 classes, 51,839 images), GTSDB (900 street scenes)

## Project structure

```
finall/
├── ai/
│   ├── resnet50_module/     Training, evaluation, prediction scripts
│   └── yolov8_module/       YOLOv8 training scripts
├── backend/
│   └── app/
│       ├── main.py          26 routers registered here
│       ├── api/routes/      25 route modules
│       ├── services/        24 service modules
│       ├── models/          10 SQLAlchemy models
│       ├── ml/              Inference and pipeline
│       └── ml/weights/      Model weights (not in git)
└── frontend/
    └── src/
        ├── pages/           36 pages
        ├── components/      Shared UI
        └── services/api.ts  Every API call
```

## Running it

### Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate          # Windows
pip install -r requirements.txt
```

MediaPipe needs a separate step — installing it normally pulls `opencv-contrib-python`, which
replaces the OpenCV build the detection pipeline uses:

```bash
pip install mediapipe --no-deps
pip install "absl-py~=2.3" "flatbuffers~=25.9" "sounddevice~=0.5" certifi matplotlib
```

The face landmark model is not on PyPI:

```bash
curl -L -o app/ml/weights/face_landmarker.task \
  https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
```

Then:

```bash
python -m uvicorn app.main:app --reload --port 8000
```

First start takes 30–60 seconds while PyTorch loads. API docs at http://localhost:8000/docs.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

### Database

Start WampServer, create a database called `smart_traffic` in phpMyAdmin, and restart the
backend — tables are created automatically. Without MySQL the app falls back to SQLite
(`smart_traffic.db`), which is fine for a demo.

## A note on the data

This is a student project, and the distinction between verified and illustrative data is
recorded rather than hidden:

- **Statutory:** speed limits by road class, Motor Traffic Act section numbers
- **Verified:** the GovPay and Sri Lanka Post payment links; the eRL, LAUGFS, DriveGreen and
  DMT links; the E01 toll rate, which reproduces four published fares exactly
- **Partly verified, and labelled as such:** E03 tolls (only the end-to-end fare could be
  checked, so intermediate exits are interpolated), E02 and E04 tolls (no published fare
  found, so the E01 rate is assumed), and insurer hotlines (3 of 8 confirmed — the rest are
  listed without a number rather than with a guessed one)
- **Stale-aware:** fuel prices, which carry the date they were checked and say how old they
  are. The estimator accepts your own pump price
- **Reference only:** fine amounts and demerit points — not verified against the gazette
- **Illustrative:** school/hospital zone and blackspot coordinates. Sri Lanka publishes no
  machine-readable geofence register or coordinate-level blackspot list, so well-known
  locations are placed at approximate positions to demonstrate the feature
- **Real, however sparse:** blackspots clustered from accident reports filed in the app, and
  the model latency measured by `/model/benchmark`

Every page carries the relevant disclaimer. Nothing in this application has legal standing.

## Limitations

- Reminders are shown in the app; sending them by SMS, WhatsApp or email needs a paid gateway,
  so only a logging provider ships. The interface is there for one to be added
- The fatigue monitor is a driving aid, not a safety system. Darkness, sunglasses and camera
  angle all affect it, and the only real remedy for fatigue is stopping
- The Camera Trainer is a live camera with an overlay, not 3D augmented reality
- Hazard reporting needs many users to be genuinely useful
- The models were trained on German signs, so Sri Lankan signs that differ in shape or text
  score lower

## Author

Karsikan Rajeswaran — ICBT Campus, CIS6035
