// src/middleware/auth.js

const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = (req, res, next) => {
  // Pega o token do cabeçalho 'Authorization'
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato "Bearer TOKEN"

  if (token == null) {
    return res.sendStatus(401); // Não autorizado se não houver token
  }

  // Verifica se o token é válido
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(403); // Proibido se o token for inválido
    }
    // Se for válido, anexa os dados do usuário à requisição
    req.user = user;
    next(); // Passa para o próximo middleware ou para a rota
  });
};

module.exports = authMiddleware;