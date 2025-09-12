// src/services/api.js

import axios from 'axios';

// Cria uma instância do axios com a URL base do nosso backend
const api = axios.create({
  baseURL: 'http://localhost:3001',
});

// --- INTERCEPTADOR DE REQUISIÇÃO ---
// Esta função será executada ANTES de cada requisição
api.interceptors.request.use(
  (config) => {
    // Pega o token do localStorage
    const token = localStorage.getItem('authToken');
    if (token) {
      // Se o token existir, adiciona ao cabeçalho Authorization
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    // Em caso de erro na configuração da requisição
    return Promise.reject(error);
  }
);

// --- INTERCEPTADOR DE RESPOSTA ---
// Esta função será executada APÓS cada resposta do servidor
api.interceptors.response.use(
  (response) => {
    // Se a resposta for sucesso (status 2xx), apenas a retorna
    return response;
  },
  (error) => {
    // Se a resposta for um erro de autenticação (401 ou 403)
    if (error.response && [401, 403].includes(error.response.status)) {
      // Remove o token inválido
      localStorage.removeItem('authToken');
      // Recarrega a aplicação. O AuthContext verá que não há token
      // e o sistema de rotas redirecionará para a página de login.
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export default api;