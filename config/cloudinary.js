import cloudinaryModule from "cloudinary";
import dotenv from "dotenv"; // 1. Import dotenv

// 2. Force load .env file here
dotenv.config({ path: "./.env" });

const { v2: cloudinary } = cloudinaryModule;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;