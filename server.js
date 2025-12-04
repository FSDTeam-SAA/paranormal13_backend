import mongoose from "mongoose";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";
import socketHandler from "./utils/socketHandler.js"; // Import the handler

// 1. Load environment variables
dotenv.config({ path: "./.env" });

// 2. Safety Check
if (!process.env.DATABASE) {
  console.error(
    "💥 FATAL ERROR: DATABASE environment variable is missing in .env file!"
  );
  process.exit(1);
}

// 3. Create HTTP Server
const httpServer = createServer(app);

// 4. Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST", "PATCH", "DELETE"],
  },
});

// 5. Make 'io' accessible globally in Controllers
app.set("io", io);

// 6. Initialize Socket Logic (Moved to clean file)
socketHandler(io);

// 7. Connect to Database
let DB = process.env.DATABASE;
if (process.env.DATABASE_PASSWORD) {
  DB = DB.replace("<PASSWORD>", process.env.DATABASE_PASSWORD);
}

mongoose
  .connect(DB)
  .then(() => console.log("✅ DB connection successful"))
  .catch((err) => {
    console.error("💥 DB Connection Error:", err.name, err.message);
    process.exit(1);
  });

// 8. Start Server
const port = process.env.PORT || 8000;
httpServer.listen(port, () => {
  console.log(`🚀 App running on port ${port}...`);
});

// 9. Handle Global Rejections
process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  httpServer.close(() => {
    process.exit(1);
  });
});