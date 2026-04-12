# Safeguard

**Hybrid Intelligent Driver Safety System.** Safeguard monitors driver behavior in real-time using an edge-native hybrid architecture. It combines high-fidelity facial telemetry with dual-port camera awareness to detect drowsiness, intoxication, distraction, and medical emergencies — automatically engaging backend-driven emergency responses and video synchronization.

Built at BitCamp 2026.

---

## How It Works

1. **Hybrid AI Engine**: The native iOS app embeds a high-performance JavaScript-based CV processor via `WKWebView`, utilizing **MediaPipe FaceLandmarker** (468 landmarks) to extract facial telemetry at ~15 FPS.
2. **Temporal Stabilization**: Raw metrics are processed through a `TemporalSmoother` (for jitter reduction and feature extraction) and a `StateStabilizer` (for hysteresis-based classification).
3. **Safety Thresholds**: To ensure ultra-high accuracy and minimize false alarms, critical states (Intoxicated, Medical) utilize:
    - **15-second Neural Warm-up**: Extreme threshold suppression during early session tracking.
    - **15-second Onset Delay**: Continuous detection required before a critical event escalation.
4. **Dual-Camera Awareness**: Leverages `AVCaptureMultiCamSession` to provide a simultaneous feed of both the driver's face (facial monitoring) and the road ahead (situational awareness).
5. **Event Synchronization**: Anomaly clips are automatically recorded and uploaded to the cloud, synchronized with real-time state telemetry sent to the Express backend.

---

## Features

- **Adaptive Behavioral Monitoring** — EAR, PERCLOS, blink variance, head pose, and yawn detection (MAR) with multi-level severity scoring.
- **Intoxication Detection** — Advanced inference based on landmark jitter (tremor), head movement entropy, and subtle facial asymmetry.
- **Medical Emergency Detection** — Real-time monitoring for driver unresponsiveness (catatonia) and seizure-like high-frequency movement.
- **Dual-Camera Dashboard** — Split-screen situational awareness with dedicated Road and Face monitors.
- **Automated Video Clipping** — Intelligent triggers capture and upload 20-second video clips of safety anomalies for later review.
- **Emergency Escalation** — Server-side integration with Gemini to generate and broadcast personalized SMS alerts with GPS links to emergency contacts.

---

## Project Structure

```bash
bitcamp2026/
├── Safeguard/      # Primary Native iOS App (Swift, SwiftUI, Hybrid AI)
├── frontend/       # Web Dashboard (TanStack Start, React 19, Tailwind CSS 4)
├── server/         # Distributed Backend (Node.js, Express, MongoDB, Gemini)
├── mobile-expo/    # Cross-platform Mobile Client (React Native, Expo 52)
└── cv-engine/      # Legacy/Reference CV Module (MediaPipe, TF.js)
```

---

## Getting Started

### Prerequisites

- Xcode 15+ (for Safeguard native iOS)
- Node.js v18+
- MongoDB connection URI
- Google Gemini API key
- Cloudinary account

### Installation

1. Install root & server dependencies:
   ```bash
   npm install
   cd server && npm install
   ```
2. Open `Safeguard/Safeguard.xcodeproj` in Xcode to build the native iOS application.

### Environment Variables

Create a `.env` file in `server/`:

```env
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

---

## API Overview

| Method | Path | Description |
|---|---|---|
| `POST` | `/state` | Ingest real-time behavioral metrics & states |
| `POST` | `/upload-video` | Upload anomaly clip (Base64) to Cloudinary |
| `GET` | `/status/:username` | Retrieve latest driver safety telemetry |
| `POST` | `/report/generate` | Trigger Gemini-powered safety analysis report |
| `GET/POST` | `/emergency-contacts` | Manage SMS broadcast recipients |

---

## Safety Protocol

When a critical state (`medical`, `intoxicated`, `microsleep`) is stabilized for the requisite **15 seconds**:
1. Server identifies the driver and high-priority emergency contacts.
2. Google Gemini generates a concise, context-aware alert (Name, Location, State).
3. The alert is dispatched via the backend messaging pipeline.
4. A synchronization event is logged, including a link to the corresponding video clip for immediate review by first responders or family.
