const mongoose = require("mongoose");
require("dotenv").config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = mongoose.model("User", new mongoose.Schema({
        name: String,
        username: String,
        emergencyContacts: Array
    }));

    const query = "ssidharth";
    const users = await User.find({
        $or: [
            { username: new RegExp(query, "i") },
            { name: new RegExp(query, "i") }
        ]
    });

    console.log(JSON.stringify(users, null, 2));
    await mongoose.connection.close();
}

run().catch(console.error);
