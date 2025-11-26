const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const AppError = require('../utils/appError');

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: 'mediremind',
      allowed_formats: ['jpg', 'jpeg', 'png'],
      transformation: [{ width: 600, height: 600, crop: 'limit' }]
    };
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({ storage, fileFilter });

exports.uploadSingleImage = fieldName => upload.single(fieldName);
