# 🛡️ Safeguard: Intelligent Driver Protection

**Safeguard** is an advanced, real-time driver safety system designed to prevent accidents before they happen. By combining high-fidelity Computer Vision (CV) with a hybrid edge architecture, Safeguard monitors behavioral patterns to detect drowsiness, distraction, and medical emergencies.

Built for the future of road safety at **BitCamp 2026**.

---

## 🚀 Key Features

- **👁️ Behavioral Intelligence** — Tracks eye closure (EAR/PERCLOS), blink variance, and continuous yawning to predict microsleep risks.
- **📱 Distraction Monitoring** — Uses head-pose estimation and gaze tracking to detect phone usage and prolonged eyes-off-road events.
- **🚑 Medical Emergency Trigger** — Automatically detects unresponsive states (catatonia) or sudden high-frequency movements (seizure-like telemetry).
- **📹 Dual-Camera Awareness** — Simultaneously displays a front-facing Face Monitor and a rear-facing Road Monitor for total situational awareness.
- **🚨 15-Second Safety Protocol** — A rigorous validation window that ensures emergency alerts are only triggered for genuine, sustained dangers.
- **📲 Live SOS Integration** — Automatically broadcasts personalized SMS alerts with GPS coordinates to emergency contacts via Google Gemini AI.

---

## 🛠️ How It Works

Safeguard uses a **Hybrid Intelligent Architecture** to keep processing fast and reliable:

### 1. The Edge AI Engine
A high-performance JS-based vision engine is embedded directly into the native iOS app. It maps **468 facial landmarks** at 15 FPS. This "edge" processing means your data never leaves the device for basic monitoring.

### 2. The 15-Second Safeguard Rule
To prevent "false alarms," Safeguard follows a strict 15-second protocol:
- **Neural Warm-up**: For the first 15 seconds of a session, the AI "learns" your baseline and uses ultra-strict filters.
- **Sustained Detection**: Critical states (like Intoxication or Medical Emergency) must be detected continuously for 15 seconds before the system escalates to an emergency broadcast.

### 3. Smart Evidence Clipping
When a high-severity state is detected, Safeguard automatically records a **20-second video clip**. This clip is synced to the cloud and linked in the emergency SMS, giving first responders instant context on the situation.

---

## 📂 Project Structure

- **`/Safeguard`**: The primary Native iOS app (Swift/SwiftUI).
- **`/server`**: The distributed backend (Node.js, Express, MongoDB) that handles SOS alerts and video storage.
- **`/frontend`**: A premium web dashboard for reviewing session replays and safety reports.
- **`/mobile-expo`**: A cross-platform mobile client for managing emergency contacts.

---

## 🚥 Getting Started

### Prerequisites
- **iOS Developers**: Xcode 15+ is required to build the native app.
- **Backend Developers**: Node.js v18+, a MongoDB URI, and a Google Gemini API Key.

### Fast Track
1. **Back End**:
   ```bash
   cd server && npm install
   npm run dev
   ```
2. **iOS App**:
   - Open `Safeguard/Safeguard.xcodeproj` in Xcode.
   - Run on an iPhone (physical device required for Multi-Cam features).

---

## 📝 API At A Glance

| Endpoint | Purpose |
| :--- | :--- |
| `POST /state` | Syncs real-time safety telemetry |
| `POST /upload-video` | Stores anomaly clips for review |
| `GET /status/:user` | Live feed for the web dashboard |
| `POST /report/generate` | Creates an AI-powered safety summary |

---

## 🔴 The Emergency Protocol

When Safeguard determines a **True Emergency** (15s threshold met):
1. **Context Fetching**: The server pulls your specific emergency contact list.
2. **AI Generation**: Google Gemini drafts a personalized SMS (e.g., *"Medical emergency detected for Agastya. Speed: 65mph. View Location: [Link]"*).
3. **Broadcast**: The message is sent immediately to all contacts.
4. **Link Sync**: A link to the incident video is provided for immediate review.
