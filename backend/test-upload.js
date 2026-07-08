// test-upload.js
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'dzwpz6ozw',
  api_key: '816528191765493',
  api_secret: '3l6oe-1VtJPY5k6fZltMFDxVrFE'
});

console.log("Testing direct upload to Cloudinary...");

// Attempt to upload a basic base64 data string directly
cloudinary.uploader.upload("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", 
  function(error, result) {
    if (error) {
      console.error("❌ DIRECT UPLOAD FAILED!");
      console.error(error);
    } else {
      console.log("✅ DIRECT UPLOAD SUCCESSFUL!");
      console.log("Image URL:", result.secure_url);
    }
  }
);