const mongoose = require("mongoose");
const dotenv = require("dotenv");

// 1. Load environment variables
dotenv.config({ path: "./.env" });

// 2. Safety Check: Ensure DB string exists
if (!process.env.DATABASE) {
  console.error(
    "💥 FATAL ERROR: DATABASE environment variable is missing in .env file!"
  );
  process.exit(1);
}

const app = require("./app");

// 3. Construct DB Connection String
// Use replace only if <PASSWORD> placeholder exists in the string
let DB = process.env.DATABASE;
if (process.env.DATABASE_PASSWORD) {
  DB = DB.replace("<PASSWORD>", process.env.DATABASE_PASSWORD);
}

mongoose
  .connect(DB) // Removed deprecated options (useNewUrlParser/useUnifiedTopology are default in Mongoose 6+)
  .then(() => console.log("✅ DB connection successful"))
  .catch((err) => {
    console.error("💥 DB Connection Error:", err.name, err.message);
    process.exit(1); // Stop app if DB fails
  });

const port = process.env.PORT || 8000;
const server = app.listen(port, () => {
  console.log(`🚀 App running on port ${port}...`);
});

// Handle Unhandled Rejections (e.g. DB connection drops)
process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
