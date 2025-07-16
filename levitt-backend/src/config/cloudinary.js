// src/config/cloudinary.js

const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configura a biblioteca do Cloudinary com as credenciais do nosso .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;