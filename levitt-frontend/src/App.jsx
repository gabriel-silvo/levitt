// src/App.jsx

import React, { useState } from 'react';
import LoginPage from './components/LoginPage';
import HomePage from './components/HomePage';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Esta função agora representa qualquer ação de autenticação bem-sucedida
  const handleSuccessfulAuth = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  return (
    <div className="App">
      {isLoggedIn ? (
        <HomePage onLogout={handleLogout} />
      ) : (
        <LoginPage onAuthAction={handleSuccessfulAuth} />
      )}
    </div>
  );
}

export default App;