// levitt-frontend/src/App.jsx

import React, { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import LoginPage from './components/LoginPage';
import HomePage from './components/HomePage';
import './App.css';

const GOOGLE_CLIENT_ID = "714055899330-glppheb0obn5hmt3i24337u7ussq2joj.apps.googleusercontent.com";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // useEffect é um hook que roda quando o componente é montado.
  // Perfeito para verificar se já existe um token.
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      // No futuro, aqui você poderia validar o token com o backend
      // para garantir que ele não expirou. Por enquanto, só checar
      // se ele existe já é o suficiente para a nossa lógica.
      setIsLoggedIn(true);
    }
  }, []); // O array vazio [] faz com que o useEffect rode apenas uma vez.

  // Função que será chamada pelo LoginPage após um login bem-sucedido
  const handleSuccessfulAuth = (token) => {
    // 1. Armazenamos o token no localStorage do navegador.
    // O localStorage persiste mesmo se o navegador for fechado.
    localStorage.setItem('authToken', token);
    
    // 2. Atualizamos o estado para mudar a tela.
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    // 1. Removemos o token do localStorage.
    localStorage.removeItem('authToken');
    
    // 2. Atualizamos o estado para voltar para a tela de login.
    setIsLoggedIn(false);
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className={isLoggedIn ? "App App--loggedin" : "App App--loggedout"}>
        {isLoggedIn ? (
          <HomePage onLogout={handleLogout} />
        ) : (
          <LoginPage onAuthAction={handleSuccessfulAuth} />
        )}
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;