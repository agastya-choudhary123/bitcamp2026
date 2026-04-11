require("dotenv").config()
const express = require("express")
const cors = require("cors")
const mongoose = require("mongoose")

const app = express()
app.use(cors())
app.use(express.json())

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.error("MongoDB error:", err))

const driverStateSchema = new mongoose.Schema({
    timestamp: Number,
    driverName: String,
    internal: Object,
    external: Object,
    emergencyTriggered: { type: Boolean, default: false }
}, { timestamps: true })

const replaySchema = new mongoose.Schema({
    driverName: String,
    sessionStart: Date,
    sessionEnd: { type: Date, default: Date.now },
    states: Array
})

const DriverState = mongoose.model("DriverState", driverStateSchema)
const Replay = mongoose.model("Replay", replaySchema)

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

app.get("/replay/:driverName", async (req, res) => {
    const replays = await Replay.find({ driverName: req.params.driverName })
    res.json(replays)
})

app.listen(3001, () => {
    console.log("Backend running on port 3001")
})