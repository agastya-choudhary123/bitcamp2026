const mongoose = require("mongoose");
require("dotenv").config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = mongoose.model("User", new mongoose.Schema({
        name: String,
        username: String,
        emergencyContacts: Array
    }));

    const users = await User.find({}).limit(10);
    console.log(JSON.stringify(users, null, 2));
    await mongoose.connection.close();
}

run().catch(console.error);
