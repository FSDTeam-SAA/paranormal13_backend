import multer from "multer";
import multerStorageCloudinary from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";
import AppError from "../utils/appError.js";

const { CloudinaryStorage } = multerStorageCloudinary;

const storage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: "mediremind",
    allowed_formats: ["jpg", "jpeg", "png"],
    transformation: [{ width: 600, height: 600, crop: "limit" }],
  }),
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new AppError("Not an image! Please upload only images.", 400), false);
  }
};

const upload = multer({ storage, fileFilter });

export const uploadSingleImage = (fieldName) => upload.single(fieldName);
