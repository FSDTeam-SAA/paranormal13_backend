import mongoose from "mongoose";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";

// 1. Load environment variables
dotenv.config({ path: "./.env" });

// 2. Safety Check
if (!process.env.DATABASE) {
  console.error(
    "💥 FATAL ERROR: DATABASE environment variable is missing in .env file!"
  );
  process.exit(1);
}

// 3. Create HTTP Server (Required for Socket.io)
const httpServer = createServer(app);

// 4. Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: "*", // In production, replace this with your frontend URL (e.g. "https://mediremind.com")
    methods: ["GET", "POST", "PATCH", "DELETE"],
  },
});

// 5. Make 'io' accessible globally in Controllers
// This allows us to emit events from inside API controllers (e.g. orderController)
app.set("io", io);

// 6. Socket Connection Logic
io.on("connection", (socket) => {
  console.log(`⚡ New Socket Connection: ${socket.id}`);

  // A. Join User Room
  // Frontend will emit 'join' with userId when the user logs in
  socket.on("join", (userId) => {
    if (userId) {
      socket.join(userId);
      console.log(`✅ User ${userId} joined their personal room`);
    }
  });

  // B. Handle Disconnect
  socket.on("disconnect", () => {
    // console.log("User disconnected");
  });
});

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
// IMPORTANT: We listen on 'httpServer', NOT 'app'
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
