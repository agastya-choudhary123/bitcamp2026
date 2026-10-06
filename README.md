# Safeguard

Our Bitcamp 2026 project. Safeguard watches a driver through the front camera
and calls their emergency contacts if they seem unable to drive safely. Face
landmarks are turned into behavioral metrics. Classifiers use those metrics
to flag drowsiness, distraction, phone use, intoxication, or a possible
medical emergency. If a serious state lasts long enough, the server places a
phone call that reads out the driver's last known location.

All the video processing runs on the device. The server only gets metrics,
except when an emergency triggers and a short clip is uploaded as evidence.

```
camera 640x480
      |
MediaPipe FaceLandmarker (GPU, 1 face, blendshapes)
      |
metrics      eyes (EAR, PERCLOS, gaze), head pose, mouth (yawns),
             face asymmetry, posture, brow, visibility
      |
smoothing    PERCLOS over 60 s; blinks and yawns over 5 min
      |
classifiers  drowsy / distracted / phone / microsleep: threshold rules
             intoxicated / medical: weighted scores
      |
stabilizer   650 ms on / 1 s off (behavioral)
             3 s on / 3 s off (intoxicated, medical)
      |  POST /state
server       Express + MongoDB, Auth0 JWT
      +--> state lasts 15 s --> Twilio voice call to contacts
      +--> 20 s clip --> Cloudinary --> replay
      +--> Gemini risk score and summary (at most every 3 min)
```

## Running it

You'll need Node, a browser with webcam access, MongoDB, and accounts for
Auth0, Twilio, Cloudinary, and Gemini. The iOS app also needs Xcode and a
physical iPhone, since it uses the camera.

```sh
cd server && npm install && npm run dev        # port 3001
cd frontend && bun install && bun run dev
```

`server/.env` needs `MONGODB_URI`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
`TWILIO_PHONE_NUMBER`, `CLOUDINARY_UPLOAD_PRESET`, and `GEMINI_API_KEY`. If
Twilio isn't configured, the server logs the call it would have made instead
of placing it, which is handy for testing.

Open the dashboard and allow camera access. The first 100 frames are used to
calibrate to your normal face, and nothing gets classified until that's done.

For iOS, open `Safeguard/Safeguard.xcodeproj` and run it on a device. The app
doesn't reimplement the vision code. `BackgroundCVProcessor` runs the same
JavaScript engine in an offscreen `WKWebView` and gets results back through a
script message handler.

## How states are decided

**Threshold rules.** Drowsy, distracted, phone use, and microsleep each come
from simple thresholds on individual metrics.

**Weighted scores.** Intoxicated and medical use weighted scores, because
either one based on a single signal would cause too many false alarms.

- **Intoxication** adds up points from head movement entropy, micro tremor,
  blink interval variance, slow blinks, blink rate, PERCLOS together with
  entropy, and gaze instability. It triggers at 7 out of 13 points. The two
  strongest signals are worth 3 each, so no single signal can trigger it
  alone.
- **Medical** scores facial asymmetry, sudden posture collapse, eyes staying
  closed without recovering, and vertical gaze deviation. Asymmetry has the
  highest weight, because one-sided facial droop is hard to produce by
  accident.

This is how drowsy and impaired drivers are told apart. A drowsy driver's EAR
drops steadily and their head droops slowly. An impaired driver's head moves
erratically and their blink timing is irregular, often while their eyes still
look open. PERCLOS alone would call both of them tired.

**Stabilizer.** A state has to persist for its "on" delay before it counts,
and be gone for its "off" delay before it clears. That way one bad frame can't
start or cancel an alarm.

## Escalation

`checkEmergency` ranks incoming states in this order: crash detected, crash
imminent, medical, intoxicated, forward collision risk. Only medical and
intoxicated place calls.

A call-worthy state starts a 15-second timer. If the state clears before the
timer runs out, nothing happens. Otherwise the server looks up the driver's
latest coordinates and calls every emergency contact that has a phone number.
After a call, there's a 5-minute cooldown per driver. The message gives the
driver's name, the reason for the call, and the coordinates, and repeats
them, because people often miss the first part of an unexpected automated
call.

Forward hazards come from COCO-SSD running on the rear camera. The crash
check is rough: if the largest hazard's bounding box grows quickly over 10
frames and is already large, the crash is flagged as imminent. If a large box
suddenly disappears, it's treated as a crash. This is a stand-in for time to
collision, not an actual measurement of it.

## Limitations

- We tuned the thresholds by hand at the hackathon by acting impaired
  ourselves. There's no validation set and no measured false-positive rate.
  Each threshold in `classifiers.js` has a comment explaining why it was
  chosen, but they're still guesses.
- `trainer.py`, `trainer.js`, `neural_weights.json`, and
  `learned_weights.json` aren't used. The trainer generates 50k synthetic
  labeled samples and fits weights, but `classifiers.js` doesn't load them,
  so everything that ships is heuristic.
- It detects behavior that correlates with impairment. It doesn't diagnose
  anything. Facial asymmetry has causes other than stroke, and a sober
  driver can look intoxicated to it.
- It tracks one face, and the driver has to be roughly facing forward.
  Sunglasses break the eye metrics, which are most of the signal.
- There are no tests.

## Layout

```
frontend/src/AI/       vision, metrics, classifiers, stabilizer
frontend/src/routes/   dashboard, replays, emergency contacts
server/server.js       API, escalation, Twilio, Cloudinary, Gemini
Safeguard/             iOS app (WKWebView bridge to the same engine)
mobile-expo/           Expo app that lets contacts check on a driver
mobile-ios/, SafeDrive/   older versions of the iOS app
server/scratch_*.js, inspect-db.js, test-db.js   one-off debugging scripts
```
