# 🛡️ Safeguard: Real-Time Driver Intelligence

**Safeguard** is a high-performance safety system that protects drivers through real-time behavioral monitoring. By combining native iOS camera processing with a distributed emergency backend, Safeguard detects dangerous states—like microsleep, intoxication, and medical emergencies—and automatically coordinates a life-saving response.

Built for the future of road safety at **BitCamp 2026**.

---

## 🚀 Core Features

- **👁️ Edge CV Engine** — Tracks 468 facial landmarks at 15 FPS directly on the device. Monitors eye closure (EAR/PERCLOS), blink variance, and progressive fatigue.
- **📱 Distraction Detection** — Real-time head-pose estimation and gaze tracking to identify phone use and "eyes-off-road" events.
- **🚑 Adaptive Medical Trigger** — Detects unresponsive states (catatonia) or high-frequency tremors to identify potential seizures or medical distress.
- **📹 Dual-Camera Awareness** — Leverages iPhone Multi-Cam sessions to provide simultaneous situational awareness of both the driver and the road.
- **🚨 15-Second Safety Protocol** — A rigorous validation window (hysteresis) that ensures emergency alerts are only triggered for sustained, genuine dangers.
- **📞 Automated SOS Pipeline** — Instantly broadcasts Voice and SMS alerts to emergency contacts via Twilio, including live GPS coordinates.

---

## 🛠️ How It Works

Safeguard is built on a **Hybrid Intelligent Architecture** to ensure reliability even in low-bandwidth environments:

### 1. High-Fidelity Edge Monitoring
The iOS application embeds a native-bridged JavaScript vision engine. By processing frames locally on the iPhone, Safeguard maintains ultra-low latency while preserving user privacy. It extracts 25+ unique biometric metrics every second.

### 2. The 15-Second Safeguard Rule
To eliminate false positives, the system utilizes a multi-layered stabilization protocol:
- **Neural Warm-up**: In the first 15 seconds of a session, the system establishes a behavioral baseline and applies strict noise filters.
- **Confirmation Window**: Critical states (Intoxication, Medical Emergency) must be continuously detected for 15 seconds before the system initiates an emergency broadcast.

### 3. Automated Incident Clipping
When a safety threshold is breached, the system records a **20-second video clip** of the event. This evidence is synced to the backend and provided to emergency contacts to give them immediate visual context.

---

## 📂 Project Structure

- **`/Safeguard`**: Primary Native iOS App (Swift/SwiftUI).
- **`/server`**: Backend Intelligence (Node.js, Express, MongoDB, Twilio).
- **`/frontend`**: Safety Dashboard for reviewing session history and telemetry replays.
- **`/mobile-expo`**: Cross-platform configuration client for emergency contacts.

---

## 🚥 Installation & Setup

1. **Back End**:
   ```bash
   cd server && npm install
   npm run dev
   ```
2. **iOS App**:
   - Open `Safeguard/Safeguard.xcodeproj` in Xcode.
   - Run on a physical iPhone (to support multi-camera and high-Hz processing).

---

## 🔔 The SOS Protocol

When Safeguard determines a **True Emergency** (15s threshold met):
1. **Target Identification**: The server identifies the driver and their designated emergency contacts.
2. **Alert Dispatch**: A high-priority Twilio broadcast is initiated, sending a detailed SMS and initiating an automated voice call.
3. **Data Payload**: Alerts include the driver's name, the specific reason for the emergency, and a direct Google Maps link to their GPS coordinates.
4. **Video Handover**: A link to the recorded incident clip is logged for review by family or first responders.
