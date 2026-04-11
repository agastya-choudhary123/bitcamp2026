# DriveGuard

AI-powered driver safety system.

## Project Structure

This project has been organized into several sub-modules:

- **`frontend/`**: The web dashboard (built with TanStack Start/React).
- **`server/`**: The backend API (Node.js/Express) which handles data logging and emergency alerts.
- **`mobile-expo/`**: Cross-platform mobile app (React Native/Expo).
- **`mobile-ios/`**: Native iOS application (Swift/SwiftUI).
- **`cv-engine/`**: Computer Vision logic and module.

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm or bun

### Installation
Run the following command at the root to install dependencies for all JS projects:
```bash
npm install
```

### Running the Apps
You can run specific parts using these commands:

- **Frontend**: `npm run dev:frontend`
- **Backend**: `npm run dev:server`
- **Mobile (Expo)**: `npm run dev:mobile`
