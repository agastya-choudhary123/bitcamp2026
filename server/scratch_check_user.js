const mongoose = require("mongoose");
require("dotenv").config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const User = mongoose.model("User", new mongoose.Schema({
        name: String,
        username: String,
        emergencyContacts: Array
    }));

    // Find user by username or email mention
    const query = "ssidharth.tho@gmail.com";
    const users = await User.find({ 
        $or: [
            { username: query },
            { name: new RegExp(query, "i") }
        ]
    });

    console.log("--- SEARCH RESULTS ---");
    console.log(JSON.stringify(users, null, 2));

    await mongoose.connection.close();
}

run().catch(console.error);
