import mongoose from "mongoose";
import dotenv from "dotenv";
import app from "./app.js";

// 1. Load environment variables
dotenv.config({ path: "./.env" });

// 2. Safety Check: Ensure DB string exists
if (!process.env.DATABASE) {
  console.error(
    "dY'� FATAL ERROR: DATABASE environment variable is missing in .env file!"
  );
  process.exit(1);
}

// 3. Construct DB Connection String
// Use replace only if <PASSWORD> placeholder exists in the string
let DB = process.env.DATABASE;
if (process.env.DATABASE_PASSWORD) {
  DB = DB.replace("<PASSWORD>", process.env.DATABASE_PASSWORD);
}

mongoose
  .connect(DB) // Removed deprecated options (useNewUrlParser/useUnifiedTopology are default in Mongoose 6+)
  .then(() => console.log("�o. DB connection successful"))
  .catch((err) => {
    console.error("dY'� DB Connection Error:", err.name, err.message);
    process.exit(1); // Stop app if DB fails
  });

const port = process.env.PORT || 8000;
const server = app.listen(port, () => {
  console.log(`dYs? App running on port ${port}...`);
});

// Handle Unhandled Rejections (e.g. DB connection drops)
process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! dY'� Shutting down...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
