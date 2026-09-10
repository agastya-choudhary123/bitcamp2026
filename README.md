safeguard
---------

safeguard watches a driver through the front camera and calls someone when the
driver stops being able to drive. Face landmarks go to a set of behavioural
metrics, the metrics go to classifiers for drowsiness, distraction, phone use,
intoxication and medical emergency, and a state that survives a confirmation
window turns into a phone call with the driver's last known coordinates read
out loud.

Everything that looks at the driver runs on the device. The server sees
metrics, not video, until something goes wrong and a clip is uploaded as
evidence.

```
camera 640x480
      |
      v
MediaPipe FaceLandmarker (GPU, 1 face, blendshapes)
      |
      v
metrics/   eye (EAR, PERCLOS, gaze)   head pose   mouth (yawns)
           face structure (asymmetry, posture, brow)   visibility
      |
      v
smoothing      PERCLOS over 60s, blinks and yawns over 5 min
      |
      v
classifiers    drowsy / distracted / phone / microsleep   threshold rules
               intoxicated / medical                      weighted scoring
      |
      v
stabilizer     650ms on, 1s off        behavioural states
               3s on, 3s off           intoxicated and medical
      |
      v  POST /state
server         Express + MongoDB, Auth0 JWT
      |
      +--> 15s sustained window --> Twilio voice call to contacts
      +--> 20s clip --> Cloudinary --> replay record
      +--> Gemini --> risk score and summary, at most every 3 min
```

### Requirements

Node and a browser with webcam access for the dashboard. Xcode and a physical
iPhone for the iOS app, which needs a real device for the camera. MongoDB, and
accounts for Auth0, Twilio, Cloudinary and Gemini.

### Quick start

```
$ cd server && npm install && npm run dev        # :3001
$ cd frontend && bun install && bun run dev
```

`server/.env` needs `MONGODB_URI`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
`TWILIO_PHONE_NUMBER`, `CLOUDINARY_UPLOAD_PRESET` and `GEMINI_API_KEY`. Without
Twilio the server logs the call it would have placed and carries on, which is
the mode you want while testing.

Open the dashboard, allow the camera, and give it a few seconds. The first 100
frames are a calibration pass that learns your normal face, and nothing
classifies until it finishes.

For the iOS app, open `Safeguard/Safeguard.xcodeproj` and run on a device. It
does not reimplement the vision code. `BackgroundCVProcessor` loads the same
JavaScript engine in an offscreen `WKWebView` and reads results back over a
script message handler, so there is one copy of the logic and one place to fix
it.

### How the states are decided

Drowsy, distracted, phone use and microsleep are threshold rules on single
metrics. They are meant to be read and argued with, not tuned into a black box.

Intoxicated and medical are weighted scores, because either one on a single
signal is a false alarm waiting to happen. Intoxication sums head movement
entropy, micro tremor, blink interval variance, slow blink count, blink rate,
PERCLOS co-occurring with entropy, and gaze instability, and fires at 7 points
out of a possible 13. The two strongest signals are worth 3 each, so no single
indicator can trigger it alone. Medical scores facial asymmetry, sudden
postural collapse, sustained closure without recovery and vertical gaze
deviation, with asymmetry weighted highest because unilateral droop is the one
sign that is hard to produce accidentally.

The split matters for telling the two apart. A drowsy driver's EAR falls
steadily and their head droops slowly. An impaired driver's head moves
erratically and their blink timing scatters, often while their eyes still look
open. PERCLOS alone would call both of them tired.

The stabilizer sits between the classifiers and everything else. A state has to
hold for its on-delay before it counts, and has to stay absent for its off-delay
before it clears, so a single bad frame neither raises an alarm nor cancels one.
Critical states get 3 seconds in both directions.

### Escalation

`checkEmergency` ranks what came in: crash detected, crash imminent, medical,
intoxicated, forward collision risk. Medical and intoxicated are the two that
place calls.

A call-worthy state starts a 15 second timer rather than dialling. If the state
clears first the timer is cancelled and nothing happens. If it survives, the
server re-reads the driver's latest coordinates from the database, rather than
using the ones from the frame that started the timer, and calls every emergency
contact with a phone number. There is a 5 minute per-driver cooldown after a
call so a sustained emergency does not redial forever.

The spoken message names the driver, gives the reason and reads the latitude
and longitude, twice, because a person picking up an unexpected automated call
misses the first sentence.

Forward hazards come from COCO-SSD on the rear camera. The crash heuristic is
deliberately crude: track the largest hazard bounding box area over 10 frames,
call it imminent if the area is growing fast and is already large, and call it
a crash if a large box vanishes. It is a proxy for time to collision, not a
measurement of one.

### Limitations

The thresholds are hand-tuned by watching ourselves act impaired at a hackathon.
There is no validation set and no measured false positive rate. Every number in
`classifiers.js` is a considered guess with a comment explaining the reasoning,
and that is all it is.

`trainer.py`, `neural_weights.json` and `learned_weights.json` are not wired
into anything. The trainer synthesises 50k labelled samples and fits weights,
but `classifiers.js` imports none of it and the shipped path is entirely
heuristic. It stays in the tree because it is the obvious next step, not
because it is running.

The system detects behaviour that correlates with impairment. It does not
diagnose anyone. Facial asymmetry has causes other than stroke, and a driver
who is fine can look intoxicated to it.

One face, and the driver has to be roughly facing forward. Sunglasses defeat
every eye metric, which is most of the signal.

No tests. `server/scratch_*.js` are debugging one-offs left in place.
`SafeDrive/` and `mobile-ios/` are earlier copies of the iOS app.

### Layout

```
frontend/src/AI/       vision, metrics, classifiers, stabilizer
frontend/src/routes/   dashboard, replays, emergency contacts
server/server.js       API, escalation, Twilio, Cloudinary, Gemini
Safeguard/             iOS app, WKWebView bridge to the same engine
mobile-expo/           Expo client for contacts to check on a driver
```

Built at Bitcamp 2026.
