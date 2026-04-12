const mongoose = require("mongoose");
require("dotenv").config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const DriverState = mongoose.model("DriverState", new mongoose.Schema({
        driverName: String
    }));
    const Replay = mongoose.model("Replay", new mongoose.Schema({
        driverName: String
    }));

    const states = await DriverState.distinct("driverName");
    const replays = await Replay.distinct("driverName");

    console.log("DRIVER NAMES IN STATES:", states);
    console.log("DRIVER NAMES IN REPLAYS:", replays);

    await mongoose.connection.close();
}

run().catch(console.error);
