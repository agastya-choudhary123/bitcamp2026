const mongoose = require('mongoose');
require('dotenv').config();

async function inspectData() {
    try {
        console.log('Connecting to:', process.env.MONGODB_URI.split('@')[1] || 'URL hidden');
        await mongoose.connect(process.env.MONGODB_URI);
        
        // 1. Define Schemas (matching server.js exactly)
        const userSchema = new mongoose.Schema({
            name: String,
            username: String,
            emergencyContacts: Array
        });
        
        const reportSchema = new mongoose.Schema({
            driverName: String,
            timestamp: Date,
            reportText: String
        });

        const replaySchema = new mongoose.Schema({
            driverName: String,
            sessionStart: Date,
            videoUrl: String
        });

        const stateSchema = new mongoose.Schema({
            driverName: String,
            timestamp: { type: Date, default: Date.now },
            lat: Number,
            lng: Number,
            ear: Number,
            perclos: Number,
            internal: Object,
            external: Object,
            emergencyTriggered: Boolean
        });

        // 2. Initialize Models
        const User = mongoose.models.User || mongoose.model('User', userSchema);
        const Report = mongoose.models.Report || mongoose.model('Report', reportSchema);
        const Replay = mongoose.models.Replay || mongoose.model('Replay', replaySchema);
        const DriverState = mongoose.models.DriverState || mongoose.model('DriverState', stateSchema);

        // 3. Dump Users
        const users = await User.find({});
        console.log('\n=========================================');
        console.log('👥 REGISTERED USERS (%d found)', users.length);
        console.log('=========================================');
        users.forEach(u => {
            console.log(`\n- User: ${u.username} (${u.name})`);
            console.log(`  Contacts: ${JSON.stringify(u.emergencyContacts || [], null, 2)}`);
        });

        // 4. Dump AI Reports
        const reports = await Report.find({}).sort({ timestamp: -1 }).limit(10);
        console.log('\n=========================================');
        console.log('🧠 AI SAFETY REPORTS (Latest 10)');
        console.log('=========================================');
        reports.forEach(r => {
            console.log(`\n- Driver: ${r.driverName} | Time: ${r.timestamp}`);
            console.log(`  Report: ${r.reportText?.substring(0, 100)}...`);
        });

        // 5. Dump Video Replays
        const replays = await Replay.find({}).sort({ sessionEnd: -1 }).limit(10);
        console.log('\n=========================================');
        console.log('📹 CLOUD REPLAYS (Latest 10)');
        console.log('=========================================');
        replays.forEach(v => {
            const time = v.sessionEnd ? new Date(v.sessionEnd).toLocaleString() : 'N/A';
            console.log(`\n- Driver: ${v.driverName} | Finished: ${time}`);
            console.log(`  🔗 URL: ${v.videoUrl}`);
        });

        // 6. Dump Telemetry Preview (High Fidelity)
        const states = await DriverState.find({}).sort({ timestamp: -1 }).limit(3);
        console.log('\n=========================================');
        console.log('📡 TELEMETRY PREVIEW (High-Fidelity AI Logs)');
        console.log('=========================================');
        states.forEach(s => {
            const time = s.timestamp.toLocaleTimeString();
            const alertStatus = s.emergencyTriggered ? '🚨 EMERGENCY' : '✅ NORMAL';
            
            console.log(`\n[${time}] Driver: ${s.driverName} | Status: ${alertStatus}`);
            console.log(`  📊 Metrics -> EAR: ${s.ear?.toFixed(3) || 'N/A'} | PERCLOS: ${s.perclos?.toFixed(2) || 'N/A'}`);
            console.log(`  🧠 AI State -> Drowsiness: ${s.internal?.drowsiness?.state || 'stable'}`);
            console.log(`               Hazard: ${s.external?.forwardHazard?.state || 'clear'}`);
            if (s.lat && s.lng) console.log(`  📍 Location: ${s.lat}, ${s.lng}`);
        });

        await mongoose.disconnect();
        console.log('\n=========================================');
    } catch (err) {
        console.error('Inspection failed:', err);
    }
}

inspectData();
