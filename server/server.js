require("dotenv").config()
const express = require("express")
const expressWs = require("express-ws")
const cors = require("cors")
const mongoose = require("mongoose")
const { auth } = require("express-oauth2-jwt-bearer")
const twilio = require("twilio")

const authDomain = process.env.VITE_AUTH0_DOMAIN;
const authClientId = process.env.VITE_AUTH0_CLIENT_ID;

const requireAuth = authDomain 
    ? (req, res, next) => {
        // Developer Bypass for local Dashboard testing
        if (req.headers["x-safeguard-dev-bypass"] === "true") {
            req.auth = { payload: { sub: req.body.driverName || "local-dev-user" } };
            return next();
        }
        return auth({
            audience: authClientId,
            issuer: `https://${authDomain}/`,
            jwksUri: `https://${authDomain}/.well-known/jwks.json`,
            tokenSigningAlg: 'RS256'
        })(req, res, next);
    }
    : (req, res, next) => {
        // Fallback/Mock auth for local dev if Auth0 not configured
        req.auth = { payload: { sub: req.headers["x-user-id"] || "local-dev-user" } };
        next();
    };
const cloudinary = require("cloudinary").v2

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})


const app = express()
expressWs(app)

const riskCache = new Map();
const lastKnownScores = new Map();


let appleTwilio = null
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    appleTwilio = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
}

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// Logging AFTER body parsing
app.use((req, res, next) => {
    console.log(`🌐 [${new Date().toISOString()}] ${req.method} ${req.url}`)
    if (req.body && Object.keys(req.body).length > 0) {
        console.log("📦 Body:", JSON.stringify(req.body, null, 2).substring(0, 500))
    }
    next()
})

app.use(express.static('../cv-engine'))

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.error("MongoDB error:", err))

const userSchema = new mongoose.Schema({
    name: String,
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    emergencyContacts: [{
        name: String,
        phone: String,
        relationship: String
    }]
})

const User = mongoose.model("User", userSchema)

const replaySchema = new mongoose.Schema({
    driverName: String,
    sessionStart: Date,
    sessionEnd: { type: Date, default: Date.now },
    videoUrl: String,
    states: Array
})

const DriverState = mongoose.model("DriverState", new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    driverName: String,
    ear: Number,
    perclos: Number,
    drowsinessLevel: Number,
    lat: Number,
    lng: Number,
    internal: {
        faceDetected: Boolean,
        trackingConfidence: Number,
        drowsiness: Object,
        distraction: Object,
        impairment: Object
    },
    external: {
        forwardHazard: Object,
        visibility: Object,
        crash: {
            state: { type: String, enum: ["clear", "crash_imminent", "crash_detected"], default: "clear" }
        }
    },
    emergencyTriggered: { type: Boolean, default: false },
    videoClip: String
}, { timestamps: true }))

const Replay = mongoose.model("Replay", replaySchema)


const { GoogleGenerativeAI } = require("@google/generative-ai")
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// ── ElevenLabs / Twilio voice call ─────────────────────────────────────────

async function initiateEmergencyCall({ contact, driverName, lat, lng, emergencyReason }) {
    if (!appleTwilio) {
        console.warn(`⚠️ SKIPPING EMERGENCY CALL to ${contact.name}: Twilio is not configured (missing ACCOUNT_SID or AUTH_TOKEN).`)
        return
    }
    const alert = `This is an automated emergency alert from Safeguard. ${driverName} needs immediate help. Reason: ${emergencyReason || "Unknown Emergency"}. Their last known location is latitude ${lat}, longitude ${lng}. Please check on them immediately or call 9 1 1.`
    const message = `${alert} ${alert}`

    const twiml = `<Response><Say voice="alice">${message}</Say></Response>`
    try {
        const call = await appleTwilio.calls.create({
            to: contact.phone,
            from: process.env.TWILIO_PHONE_NUMBER,
            twiml
        })
        console.log(`📞 Emergency call initiated to ${contact.name} (${contact.phone}) — SID: ${call.sid}`)
    } catch (err) {
        console.error(`❌ FAILED TO INITIATE EMERGENCY CALL to ${contact.name}:`, err.message)
    }
}

// Auth0 callback — upsert user on first login
// Called by the frontend after Auth0 redirects back with a valid JWT.
app.post("/auth/sync", requireAuth, async (req, res) => {
    try {
        const sub = req.auth.payload.sub          // Auth0 user ID (stable, unique)
        const { name } = req.body                 // display name passed from frontend

        let user = await User.findOne({ username: sub })
        if (!user) {
            user = new User({ name: name || sub, username: sub, password: "" })
            await user.save()
        } else if (name && user.name !== name) {
            user.name = name
            await user.save()
        }

        res.json({ success: true, user: { name: user.name, username: user.username } })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// Emergency Contact Endpoints
app.get("/user/:username/contact", requireAuth, async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username })
        if (!user) return res.status(404).json({ error: "User not found" })
        res.json(user.emergencyContacts || [])
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.post("/user/:username/contact", requireAuth, async (req, res) => {
    try {
        console.log(`\n--- CONTACT UPDATE ATTEMPT ---`);
        console.log(`Username: ${req.params.username}`);
        console.log(`Body: ${JSON.stringify(req.body, null, 2)}`);

        const user = await User.findOneAndUpdate(
            { username: req.params.username },
            { emergencyContacts: req.body },
            { new: true }
        );

        if (!user) {
            console.log(`❌ FAILED: User ${req.params.username} not found.`);
            return res.status(404).json({ error: "User not found" });
        }

        console.log(`✅ SUCCESS: Updated contacts for ${user.username} (Count: ${user.emergencyContacts.length})`);
        res.json(user.emergencyContacts || []);
    } catch (e) {
        console.error(`🚨 SERVER ERROR: ${e.message}`);
        res.status(500).json({ error: e.message });
    }
})


function checkEmergency(state) {
    const states = Array.isArray(state.behaviorStates) ? state.behaviorStates : [state.behaviorState || "alert"];
    const crash = state.external?.crash?.state;
    const hazard = state.external?.forwardHazard?.state;

    if (crash === "crash_detected") return "CRASH DETECTED";
    if (crash === "crash_imminent") return "CRASH IMMINENT";
    if (states.includes("medical")) return "MEDICAL EMERGENCY — CALL 911";
    if (states.includes("intoxicated")) return "DRIVER POSSIBLY INTOXICATED";
    if (hazard === "immediate_forward_risk") return "FORWARD COLLISION RISK";
    return null;
}

app.get("/", (req, res) => {
    res.json({ status: "Safeguard backend running" })
})

app.post("/state", requireAuth, async (req, res) => {
    const { driverName, lat, lng, ...cvState } = req.body

    const emergencyReason = checkEmergency(cvState)
    const emergencyTriggered = !!emergencyReason

    // Diagnostic Log
    console.log(`📸 DATA FROM CAMERA: ${driverName} (EAR: ${cvState.ear?.toFixed(3) || "N/A"})`);

    const state = new DriverState({
        ...cvState,
        driverName,
        emergencyTriggered
    })
    await state.save()

    if (req.body.videoClip) {
        try {
            const result = await cloudinary.uploader.upload(
                `data:video/webm;base64,${req.body.videoClip}`,
                {
                    resource_type: "video",
                    upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
                    folder: "safeguard-replays"
                }
            )
            console.log("Video clip saved:", result.secure_url)

            // SAVE TO DATABASE
            const newReplay = new Replay({
                driverName: driverName,
                videoUrl: result.secure_url,
                sessionStart: new Date(),
                sessionEnd: new Date()
            })
            await newReplay.save()
            console.log("✅ Replay record created in MongoDB")
        } catch (uploadError) {
            console.error("❌ Cloudinary Upload Error:", uploadError.message)
        }
    }

    if (emergencyTriggered) {
        const authSub = req.auth?.payload?.sub
        const user = await User.findOne({ username: authSub || driverName })

        console.log("🚨 EMERGENCY TRIGGERED —", emergencyReason)
        console.log(`Driver: ${driverName} | Location: ${lat}, ${lng}`)

        const callWorthy = emergencyReason?.includes("INTOXICATED") || emergencyReason?.includes("MEDICAL")
        if (callWorthy) {
            const contacts = user?.emergencyContacts || []
            if (contacts.length === 0) {
                console.log(`No emergency contacts set for ${driverName}`)
            } else {
                await Promise.all(contacts.map(async (contact) => {
                    try {
                        await initiateEmergencyCall({ contact, driverName, lat, lng, emergencyReason })
                    } catch (e) {
                        console.error(`Emergency call failed for ${contact.name}:`, e.message)
                    }
                }))
            }
        } else {
            console.log(`⚠️ Emergency logged but no call triggered for: ${emergencyReason}`)
        }
    }

    res.json({ success: true, emergencyTriggered, emergencyReason })
})

app.post("/replay", requireAuth, async (req, res) => {
    const replay = new Replay(req.body)
    await replay.save()
    res.json({ success: true })
})


app.post("/upload-video", requireAuth, async (req, res) => {
    const { videoBase64, driverName, sessionStart } = req.body

    try {
        const result = await cloudinary.uploader.upload(videoBase64, {
            resource_type: "video",
            upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
            folder: "safeguard-replays",
            public_id: `${driverName}-${sessionStart}`
        })

        const replay = new Replay({
            driverName,
            sessionStart: new Date(sessionStart),
            sessionEnd: new Date(),
            videoUrl: result.secure_url,
            states: []
        })
        await replay.save()

        res.json({ success: true, videoUrl: result.secure_url })

    } catch (err) {
        console.error("Upload failed:", err)
        res.status(500).json({ success: false, error: err.message })
    }
})

app.get("/status/:driverName", requireAuth, async (req, res) => {
    try {
        const lastLoc = await DriverState.findOne({ driverName: req.params.driverName })
            .sort({ timestamp: -1 });

        if (!lastLoc) {
            console.log(`📱 POLL FROM IPHONE: ${req.params.driverName} -> ❌ NO DATA FOUND`);
            return res.json({});
        }

        console.log(`📱 POLL FROM IPHONE: ${req.params.driverName} -> ✅ FOUND (EAR: ${lastLoc.ear?.toFixed(3)})`);
        res.json(lastLoc);
    } catch (e) {
        console.error(`🚨 STATUS ERROR: ${e.message}`);
        res.status(500).json({ error: e.message });
    }
})

app.get("/replay/:driverName", requireAuth, async (req, res) => {
    const replays = await Replay.find({ driverName: req.params.driverName })
    res.json(replays)
})

app.get("/risk/:driverName", requireAuth, async (req, res) => {
    try {
        const cacheKey = `history-${req.params.driverName}`;
        const now = Date.now();
        if (riskCache.has(cacheKey)) {
            const cached = riskCache.get(cacheKey);
            if (now - cached.timestamp < 300000) { // 5 min cache for history
                return res.json(cached.data);
            }
        }

        const logs = await DriverState.find({ driverName: req.params.driverName })
            .sort({ timestamp: -1 })
            .limit(30)

        if (logs.length === 0) return res.json({ score: null, recommendations: [] })

        const summary = logs.map(l => ({
            time: new Date(l.timestamp).toLocaleTimeString(),
            ear: l.ear?.toFixed(3),
            perclos: l.perclos,
            drowsiness: l.internal?.drowsiness?.state,
            headPitch: l.internal?.distraction?.headPitch,
            headYaw: l.internal?.distraction?.headYaw,
            hazard: l.external?.forwardHazard?.state,
            crash: l.external?.crash?.state,
            emergency: l.emergencyTriggered
        }))

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
        const prompt = `You are a driving safety AI. Analyze these recent driving telemetry logs and return a JSON object with:
- "score": integer 0-100 (0 = perfectly safe, 100 = extremely dangerous)
- "label": one of "Safe", "Low Risk", "Moderate Risk", "High Risk", "Critical"
- "summary": one sentence explaining the score
- "recommendations": array of 2-4 short, specific, actionable strings the driver can do RIGHT NOW to lower their risk score

Telemetry (most recent first):
${JSON.stringify(summary, null, 2)}

Respond ONLY with valid JSON. No markdown, no explanation.`

        const result = await model.generateContent(prompt)
        let text = result.response.text().trim()
        text = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
        const parsed = JSON.parse(text)
        
        riskCache.set(cacheKey, { timestamp: now, data: parsed });
        res.json(parsed)
    } catch (e) {
        console.error("Risk scoring error:", e.message)
        res.status(500).json({ error: e.message })
    }
})

app.post("/risk/live", async (req, res) => {
    try {
        const { metrics, behaviorStates, severity, driverName } = req.body
        const cacheKey = `live-${driverName || "anonymous"}`;
        const now = Date.now();

        // 1. Check cache (60 seconds)
        if (riskCache.has(cacheKey)) {
            const cached = riskCache.get(cacheKey);
            if (now - cached.timestamp < 60000) {
                return res.json(cached.data);
            }
        }

        const m = metrics || {}
        const stateList = (behaviorStates || []).join(", ") || "alert"
        const severityPct = (((severity || 0) / 5) * 100).toFixed(0)

        const prompt = `You are a real-time driver safety AI embedded in the Safeguard Intelligence system.
Analyze the following live biometric snapshot and classify driver impairment risk.

--- CURRENT BEHAVIORAL STATE ---
Active states: ${stateList}
Severity level: ${severity}/5 (${severityPct}%)

--- BIOMETRIC METRICS ---
Eye Aspect Ratio (EAR): ${m.ear?.toFixed(4) ?? "N/A"}  [Normal: >0.28]
PERCLOS (% eye closure): ${m.perclos != null ? (m.perclos * 100).toFixed(1) + "%" : "N/A"}  [Normal: <8%]
Blink Rate: ${m.blinkRatePerMin?.toFixed(1) ?? m.blinkRate?.toFixed(1) ?? "N/A"} bpm  [Normal: 10-20]
Blink Duration: ${m.blinkDuration != null ? Math.round(m.blinkDuration) + "ms" : "N/A"}  [Normal: 100-200ms]
Blink Interval Variance: ${m.blinkIntervalVariance?.toFixed(0) ?? "N/A"} ms2  [Normal: <200]
Slow Blinks: ${m.slowBlinks ?? "N/A"}  [Normal: <5]
Eye Rubs: ${m.eyeRubs ?? "N/A"}
Yawn Count (5min): ${m.yawnCount ?? "N/A"}  [Normal: 0-1]
Head Entropy: ${m.entropy?.toFixed(2) ?? "N/A"}  [Normal: 0.5-1.2; Intoxicated: >2.0]
Micro-Tremor: ${m.microTremor?.toFixed(5) ?? "N/A"}  [Normal: <0.00015]
Head Pitch: ${m.headPitch?.toFixed(1) ?? "N/A"} deg  [Normal: +-15]
Head Yaw: ${m.headYaw?.toFixed(1) ?? "N/A"} deg  [Normal: +-20]
Head Roll: ${m.headRoll?.toFixed(1) ?? "N/A"} deg  [Normal: +-8]
Gaze Ratio (horizontal): ${m.gazeRatio?.toFixed(2) ?? "N/A"}  [Centered: 0.5]
Gaze Vertical: ${m.gazeVertical?.toFixed(2) ?? "N/A"}  [Normal: 0.3-0.6]
Posture Lean: ${m.postureLean?.toFixed(2) ?? "N/A"}  [Normal: <0.08]
Fatigue Ratio: ${m.fatigueRatio?.toFixed(2) ?? "N/A"}  [Normal: >0.85]
Facial Asymmetry: ${m.asymmetryScore?.toFixed(3) ?? "N/A"}  [Normal: <0.15; Stroke risk: >0.25]

--- TASK ---
Return ONLY valid JSON, no markdown, no explanation:
{"score":<integer 0-100>,"label":"<Low|Moderate|High|Critical>","summary":"<1-2 sentence assessment>","recommendations":["<action 1>","<action 2>","<action 3>"]}

Scoring guide: 0-24 Low, 25-49 Moderate, 50-74 High, 75-100 Critical.
Weights: intoxicated +40, medical/microsleep +45, drowsy +20, distracted/phone +10.
PERCLOS >15% serious, >30% critical. Entropy >2.0 + tremor >0.0002 = intoxication signal.
Asymmetry >0.25 = stroke signal, score must be >=75.`

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
        const result = await model.generateContent(prompt)
        let text = result.response.text().trim()
        text = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim()
        const parsed = JSON.parse(text)
        
        const finalData = {
            score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
            label: parsed.label ?? "Low",
            summary: parsed.summary ?? "",
            recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 4) : []
        };

        riskCache.set(cacheKey, { timestamp: now, data: finalData });
        lastKnownScores.set(cacheKey, finalData);
        res.json(finalData)
    } catch (e) {
        console.error("Live risk scoring error:", e.message)
        // Fallback to last known score if we hit a rate limit
        const cacheKey = `live-${req.body.driverName || "anonymous"}`;
        if (lastKnownScores.has(cacheKey)) {
            console.log("Returning last known score due to error/limit");
            return res.json(lastKnownScores.get(cacheKey));
        }
        res.status(500).json({ error: e.message })
    }
})

app.get("/test-call", async (req, res) => {
    try {
        await initiateEmergencyCall({
            contact: { name: "Test", phone: "+12242928589" },
            driverName: "Agastya",
            emergencyReason: "MICROSLEEP DETECTED",
            lat: 38.9072,
            lng: -77.0369
        })
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.listen(3001, "0.0.0.0", () => {
    console.log("Backend running on all interfaces (0.0.0.0) at port 3001")
})