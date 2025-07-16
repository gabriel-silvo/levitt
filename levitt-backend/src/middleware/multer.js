// src/middleware/multer.js

const multer = require('multer');
const path = require('path');

// Configura o armazenamento em memória
const storage = multer.memoryStorage();

// Função para filtrar e aceitar apenas imagens
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|gif/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Erro: O arquivo deve ser uma imagem válida (jpeg, png, gif)!'));
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB por arquivo
  fileFilter: fileFilter,
});

module.exports = upload;