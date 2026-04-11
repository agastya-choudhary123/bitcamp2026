require("dotenv").config()
const express = require("express")
const cors = require("cors")
const mongoose = require("mongoose")
const cloudinary = require("cloudinary").v2

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME
})


const app = express()
app.use(cors())
app.use(express.json())

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

const reportSchema = new mongoose.Schema({
    driverName: String,
    timestamp: { type: Date, default: Date.now },
    reportText: String
})
const Report = mongoose.model("Report", reportSchema)

const { GoogleGenerativeAI } = require("@google/generative-ai")
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

async function generateEmergencySMS({ driverName, emergencyReason, lat, lng, cvState, contact }) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const drowsinessState = cvState.internal?.drowsiness?.state || "unknown"
    const perclos = cvState.internal?.drowsiness?.perclos30s
    const impairmentState = cvState.internal?.impairment?.state || "unknown"
    const crashState = cvState.external?.crash?.state || "clear"
    const mapsLink = `https://maps.google.com/?q=${lat},${lng}`
    const relationship = contact.relationship || "contact"
    const contactName = contact.name || "Emergency Contact"

    const prompt = `You are an emergency alert system for a drowsy driving safety app called DriveGuard.
Write a concise, urgent SMS (max 160 chars) to ${contactName} (${relationship} of ${driverName}).

Context:
- Emergency type: ${emergencyReason}
- Crash state: ${crashState}
- Drowsiness state: ${drowsinessState}
${perclos !== undefined ? `- PERCLOS score: ${perclos}%` : ""}
- Impairment state: ${impairmentState}
- Location: ${mapsLink}

Write only the SMS message. Be specific, human, and urgent. Include the location link.`

    const result = await model.generateContent(prompt)
    return result.response.text().trim()
}

// Auth Endpoints
app.post("/signup", async (req, res) => {
    try {
        const { name, username, password } = req.body
        const existing = await User.findOne({ username })
        if (existing) return res.status(400).json({ error: "Username already taken" })

        const user = new User({ name, username, password })
        await user.save()
        res.json({ success: true, user: { name, username } })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body
        const user = await User.findOne({ username, password })
        if (!user) return res.status(401).json({ error: "Invalid credentials" })
        res.json({ success: true, user: { name: user.name, username: user.username } })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// Emergency Contact Endpoints
app.get("/user/:username/contact", async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username })
        if (!user) return res.status(404).json({ error: "User not found" })
        res.json(user.emergencyContacts || [])
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.post("/user/:username/contact", async (req, res) => {
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

app.get("/report/:driverName", async (req, res) => {
    try {
        const reports = await Report.find({ driverName: req.params.driverName })
            .sort({ timestamp: -1 })
        res.json(reports)
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

app.post("/report/generate", async (req, res) => {
    try {
        const { driverName } = req.body
        const logs = await DriverState.find({ driverName: driverName })
            .sort({ timestamp: -1 })
            .limit(30);

        if (logs.length === 0) return res.json({ success: true, message: "Not enough data" });

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const summary = logs.map(l => ({
            time: new Date(l.timestamp).toLocaleTimeString(),
            drowsiness: l.internal?.drowsiness?.state,
            hazard: l.external?.forwardHazard?.state
        }));

        const prompt = `Analyze these driving logs and generate a safety report for ${driverName}: ${JSON.stringify(summary)}. Provide actionable safety feedback, keep it very concise.`;
        const result = await model.generateContent(prompt);
        const reportString = result.response.text();
        
        const newReport = new Report({
            driverName: driverName,
            reportText: reportString
        });
        await newReport.save();
        
        res.json({ success: true, report: newReport });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
})

function checkEmergency(state) {
    const drowsy = state.internal?.drowsiness?.state
    const impairment = state.internal?.impairment?.state
    const hazard = state.external?.forwardHazard?.state
    const crash = state.external?.crash?.state

    if (crash === "crash_detected") return "CRASH DETECTED"
    if (crash === "crash_imminent") return "CRASH IMMINENT"
    if (drowsy === "microsleep_risk") return "MICROSLEEP DETECTED"
    if (impairment === "non_responsive_emergency") return "DRIVER NON-RESPONSIVE"
    if (hazard === "immediate_forward_risk") return "FORWARD COLLISION RISK"
    return null
}

app.get("/", (req, res) => {
    res.json({ status: "DriveGuard backend running" })
})

app.post("/state", async (req, res) => {
    const { driverName, lat, lng, ...cvState } = req.body

    const emergencyReason = checkEmergency(cvState)
    const emergencyTriggered = !!emergencyReason

    const state = new DriverState({
        ...cvState,
        driverName,
        emergencyTriggered
    })
    await state.save()

    if (req.body.videoClip) {
        const result = await cloudinary.uploader.upload(
            `data:video/webm;base64,${req.body.videoClip}`,
            {
                resource_type: "video",
                upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
                folder: "driveguard-replays"
            }
        )
        console.log("Video clip saved:", result.secure_url)
    }

    let emergencySMSLog = []
    if (emergencyTriggered) {
        const user = await User.findOne({ username: driverName })
        const mapsLink = `https://maps.google.com/?q=${lat},${lng}`
        
        console.log("🚨 EMERGENCY TRIGGERED —", emergencyReason)
        console.log(`Driver: ${driverName}`)
        console.log(`Location: ${mapsLink}`)
        
        const contacts = user?.emergencyContacts || []
        if (contacts.length === 0) {
            console.log(`ALERT SENT TO: Emergency Services (NO CONTACTS SET)`)
        } else {
            // Use Promise.all to handle multiple Gemini calls in parallel
            await Promise.all(contacts.map(async (contact) => {
                const contactPhone = contact.phone || "NO PHONE"
                const contactName = contact.name || "Emergency Contact"
                
                try {
                    const sms = await generateEmergencySMS({ driverName, emergencyReason, lat, lng, cvState, contact })
                    console.log(`AI SMS BROADCAST TO ${contactName} (${contactPhone}): ${sms}`)
                    emergencySMSLog.push({ name: contactName, phone: contactPhone, sms })
                } catch (e) {
                    console.error(`Gemini SMS generation failed for ${contactName}:`, e.message)
                    const fallback = `EMERGENCY: ${driverName} needs help. ${emergencyReason}. Location: ${mapsLink}`
                    console.log(`FALLBACK SMS TO ${contactName}: ${fallback}`)
                    emergencySMSLog.push({ name: contactName, phone: contactPhone, sms: fallback })
                }
            }))
        }
    }

    res.json({ success: true, emergencyTriggered, emergencyReason, emergencySMSLog })
})

app.post("/replay", async (req, res) => {
    const replay = new Replay(req.body)
    await replay.save()
    res.json({ success: true })
})


app.post("/upload-video", async (req, res) => {
    const { videoBase64, driverName, sessionStart } = req.body

    try {
        const result = await cloudinary.uploader.upload(videoBase64, {
            resource_type: "video",
            upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
            folder: "driveguard-replays",
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

app.get("/status/:driverName", async (req, res) => {
    try {
        const lastLoc = await DriverState.findOne({ driverName: req.params.driverName })
            .sort({ timestamp: -1 });
        res.json(lastLoc || {});
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
})

app.get("/replay/:driverName", async (req, res) => {
    const replays = await Replay.find({ driverName: req.params.driverName })
    res.json(replays)
})

app.listen(3001, () => {
    console.log("Backend running on port 3001")
})