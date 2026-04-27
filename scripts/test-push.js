import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/userModel.js";
import { sendNotification } from "../utils/notification.js";

dotenv.config({ path: "./.env" });

const testPush = async () => {
  try {
    console.log("🔗 Connecting to DB...");
    await mongoose.connect(process.env.DATABASE);
    console.log("✅ DB connected.");

    // Find a user who has an fcmToken
    const user = await User.findOne({ fcmToken: { $exists: true, $ne: null } });

    if (!user) {
      console.log("❌ No user found with a valid fcmToken in the database.");
      process.exit(0);
    }

    console.log(`🚀 Sending test notification to user: ${user.name} (${user.email || 'No email'})`);
    console.log(`📱 Token: ${user.fcmToken}`);

    const result = await sendNotification(user.fcmToken, {
      title: "Test Notification",
      body: "This is a manual test from the backend scripts! 🚀",
      data: { type: "TEST" }
    });

    console.log("✅ Result:", result);
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
};

testPush();
