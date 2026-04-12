# Safeguard

**AI-powered real-time driver safety system.** Safeguard monitors drivers using computer vision to detect drowsiness, distraction, and forward road hazards — automatically sending emergency SMS alerts with GPS location when danger is detected.

Built at BitCamp 2026.

---

## How It Works

1. **CV Engine** runs in the browser and processes the driver's camera feed at ~10 Hz using MediaPipe (468 face landmarks) and TensorFlow COCO-SSD.
2. **Metrics** are extracted each frame: Eye Aspect Ratio (EAR), PERCLOS (rolling 30s eye closure %), head pitch/yaw, yawn detection (MAR), and Time-to-Collision for forward hazards.
3. **State classifiers** map raw metrics to semantic states — from `alert` through `drowsy_warning` to `non_responsive_emergency`.
4. **State is sent** to the Express backend every few seconds. The server checks for emergency conditions and, if triggered, calls Gemini to generate personalized SMS alerts sent to all emergency contacts with the driver's name, relationship, and a GPS link.
5. **Dashboards** (web and mobile) display live telemetry — EAR gauge, waveform history, drowsiness state, and hazard indicators.

---

## Features

- **Drowsiness detection** — EAR, PERCLOS, blink rate, and yawning (MAR), classified across 5 levels of severity
- **Distraction detection** — head pose tracking for looking away, gaze detection for phone use
- **Crash detection** — forward-facing camera with TTC estimation and post-impact scene analysis
- **Emergency alerts** — Gemini-generated SMS sent to multiple contacts with GPS location; plain-text fallback if AI call fails
- **Session replays** — anomaly video clips uploaded to Cloudinary, reviewable with a timeline of states
- **AI safety reports** — Gemini analyzes the last 30 logged states and produces a personalized feedback report
- **Multi-platform** — web dashboard, React Native (Expo) mobile app, and native iOS (SwiftUI) app, all backed by the same API

---

## Project Structure

```
bitcamp2026/
├── frontend/       # Web dashboard — TanStack Start, React 19, Tailwind CSS 4, Recharts
├── server/         # REST API — Node.js, Express, MongoDB/Mongoose, Gemini, Cloudinary
├── mobile-expo/    # Cross-platform mobile app — React Native, Expo 52
├── mobile-ios/     # Native iOS app — Swift, SwiftUI
└── cv-engine/      # Browser-based CV module — MediaPipe, TensorFlow.js COCO-SSD
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Web frontend | TanStack Start, React 19, Tailwind CSS 4, TanStack Query |
| Backend | Node.js, Express 4, MongoDB + Mongoose |
| AI / Alerts | Google Gemini 1.5 Flash |
| Video storage | Cloudinary |
| CV (face) | MediaPipe FaceLandmarker (468 landmarks) |
| CV (objects) | TensorFlow.js COCO-SSD MobileNet V2 |
| Mobile (cross-platform) | React Native, Expo 52, Expo Router |
| Mobile (iOS native) | Swift, SwiftUI |

---

## Getting Started

### Prerequisites

- Node.js v18+
- npm or bun
- MongoDB connection URI
- Google Gemini API key
- Cloudinary account

### Installation

Install dependencies for all JS projects from the repo root:

```bash
npm install
```

### Environment Variables

Create a `.env` file in `server/`:

```env
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

### Running

| Command | What it starts |
|---|---|
| `npm run dev:frontend` | Web dashboard (TanStack Start dev server) |
| `npm run dev:server` | Backend API on port 3001 |
| `npm run dev:mobile` | Expo mobile app (opens Expo Go) |

Open the CV engine by serving `cv-engine/index.html` from a local HTTP server (required for camera access).

---

## API Overview

The Express server exposes these core endpoints:

| Method | Path | Description |
|---|---|---|
| `POST` | `/signup` | Register a new user |
| `POST` | `/login` | Authenticate user |
| `POST` | `/state` | Ingest CV state from any client |
| `GET` | `/status/:username` | Get latest driver state |
| `POST` | `/upload-video` | Upload anomaly clip to Cloudinary |
| `GET` | `/replay/:driverName` | List all session replays |
| `POST` | `/report/generate` | Generate AI safety report via Gemini |
| `GET/POST` | `/emergency-contacts` | Manage emergency contacts |

---

## Emergency Alert Flow

When a critical state (`microsleep_risk`, `crash_detected`, `non_responsive_emergency`, etc.) is detected:

1. Server fetches all emergency contacts for the driver
2. For each contact, Gemini generates a personalized SMS under 160 characters (includes driver name, relationship, and a Google Maps link)
3. Alert is logged to the database with full context
4. If Gemini fails, a plain-text fallback message is used
