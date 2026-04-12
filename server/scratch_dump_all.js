const mongoose = require("mongoose");
require("dotenv").config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = mongoose.model("User", new mongoose.Schema({
        name: String,
        username: String,
        emergencyContacts: Array,
        emergencyContact: Object
    }));

    const allUsers = await User.find({});
    console.log("TOTAL USERS:", allUsers.length);
    console.log(JSON.stringify(allUsers, null, 2));

    await mongoose.connection.close();
}

run().catch(console.error);
