const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Dynamically reference your verified environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure the clean stream engine storage profile
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'rental-properties',
    format: async (req, file) => 'jpeg', // Compresses and optimizes uploaded pictures automatically
    public_id: (req, file) => 'room-' + Date.now() + '-' + Math.round(Math.random() * 1E9),
  },
});

const upload = multer({ storage: storage });

module.exports = { upload, cloudinary };