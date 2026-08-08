const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

const ALLOWED_DOCUMENT_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

// Dynamically reference your verified environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure the clean stream engine storage profile
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'rental-properties',
    format: async (req, file) => 'jpeg', // Compresses and optimizes uploaded pictures automatically
    public_id: (req, file) => 'room-' + Date.now() + '-' + Math.round(Math.random() * 1e9),
  },
});

const upload = multer({ storage });

const chatAttachmentStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'group-chat-attachments',
    resource_type: 'auto',
    public_id: () => `chat-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
  },
});

const uploadChatAttachment = multer({
  storage: chatAttachmentStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      return cb(null, true);
    }
    return cb(new Error('Unsupported file type. Please upload an image or PDF.'));
  },
});

const createDocumentUpload = () =>
  multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (ALLOWED_DOCUMENT_MIME_TYPES.includes(file.mimetype)) {
        return cb(null, true);
      }
      return cb(new Error('Unsupported file type. Please upload JPG, JPEG, PNG, or PDF.'));
    },
  });

const uploadKycDocument = createDocumentUpload();

module.exports = { upload, uploadKycDocument, uploadChatAttachment, cloudinary, ALLOWED_DOCUMENT_MIME_TYPES };
