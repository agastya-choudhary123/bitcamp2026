const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

async function inspectData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        const User = mongoose.model('User', new mongoose.Schema({ username: String, name: String }));
        const DriverState = mongoose.model('DriverState', new mongoose.Schema({ driverName: String, timestamp: Date }));

        const users = await User.find({});
        console.log('--- USERS ---');
        console.log(users);

        const states = await DriverState.find({}).limit(5);
        console.log('--- DRIVER STATES (First 5) ---');
        console.log(states);

        await mongoose.disconnect();
    } catch (err) {
        console.error('Inspection failed:', err);
    }
}

inspectData();
