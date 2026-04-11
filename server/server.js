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
        visibility: Object
    },
    emergencyTriggered: { type: Boolean, default: false },
    videoClip: String
}, { timestamps: true }))

const Replay = mongoose.model("Replay", replaySchema)

const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.get("/report/:driverName", async (req, res) => {
    try {
        // Fetch last 30 states for this driver to analyze patterns
        const logs = await DriverState.find({ driverName: req.params.driverName })
            .sort({ timestamp: -1 })
            .limit(30);

        if (logs.length === 0) return res.json({ report: "No drive data found yet." });

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const summary = logs.map(l => ({
            time: new Date(l.timestamp).toLocaleTimeString(),
            drowsiness: l.internal?.drowsiness?.state,
            hazard: l.external?.forwardHazard?.state
        }));

        const prompt = `Analyze these driving logs and generate a safety report for ${req.params.driverName}: ${JSON.stringify(summary)}. Provide actionable safety feedback.`;
        const result = await model.generateContent(prompt);
        res.json({ report: result.response.text() });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
})

function checkEmergency(state) {
    const drowsy = state.internal?.drowsiness?.state
    const impairment = state.internal?.impairment?.state
    const hazard = state.external?.forwardHazard?.state

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

    if (emergencyTriggered) {
        const mapsLink = `https://maps.google.com/?q=${lat},${lng}`
        console.log("🚨 EMERGENCY TRIGGERED —", emergencyReason)
        console.log(`Driver: ${driverName}`)
        console.log(`Location: ${mapsLink}`)
        console.log(`Drowsiness: ${cvState.internal?.drowsiness?.state}`)
        console.log(`PERCLOS: ${cvState.internal?.drowsiness?.perclos30s}%`)
        console.log(`Impairment: ${cvState.internal?.impairment?.state}`)
        console.log("SMS sent to emergency contact")
    }

    res.json({ success: true, emergencyTriggered, emergencyReason })
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

app.get("/replay/:driverName", async (req, res) => {
    const replays = await Replay.find({ driverName: req.params.driverName })
    res.json(replays)
})

app.listen(3001, () => {
    console.log("Backend running on port 3001")
})