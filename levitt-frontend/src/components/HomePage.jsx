// src/components/HomePage.jsx

import React from 'react';

// A prop 'onLogout' será a função para simular o logout.
function HomePage({ onLogout }) {
  return (
    <div className="home-container">
      <h1>Bem-vindo ao Levitt!</h1>
      <p>Você está logado.</p>
      <button onClick={onLogout}>Sair</button>
    </div>
  );
}

export default HomePage;