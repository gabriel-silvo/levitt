// src/components/LoginPage.jsx

import React, { useState } from 'react';

function LoginPage({ onAuthAction }) {
  const [isRegistering, setIsRegistering] = useState(false);

  const handleGoogleLogin = () => {
    console.log("Tentativa de login com Google...");
    // Quando a lógica real for implementada, esta chamada virá
    // dentro de um ".then()" ou após um "await" da resposta da API.
    // Por enquanto, chamamos diretamente para simular.
    onAuthAction(); 
  };

  const handleEmailAuth = (event) => {
    event.preventDefault(); 
    if (isRegistering) {
      console.log("Tentativa de cadastro com email/senha...");
    } else {
      console.log("Tentativa de login com email/senha...");
    }
    // O mesmo aqui: chamamos diretamente para a simulação funcionar.
    onAuthAction();
  };

  return (
    <div className="login-container">
      <h1>{isRegistering ? 'Criar Conta' : 'Bem-vindo ao Levitt'}</h1>
      
      <button className="google-btn" onClick={handleGoogleLogin}>
        Entrar com Google
      </button>

      <div className="divider">
        <span>ou</span>
      </div>

      <form className="login-form" onSubmit={handleEmailAuth}>
        {isRegistering && (
            <input type="text" placeholder="Seu Nome" required />
        )}
        <input type="email" placeholder="Email" required />
        <input type="password" placeholder="Senha" required />
        <button type="submit">{isRegistering ? 'Cadastrar' : 'Entrar'}</button>
      </form>

      <div className="toggle-auth">
        {isRegistering ? (
          <p>
            Já tem uma conta?{' '}
            <span onClick={() => setIsRegistering(false)}>Faça o login</span>
          </p>
        ) : (
          <p>
            Não tem uma conta?{' '}
            <span onClick={() => setIsRegistering(true)}>Cadastre-se</span>
          </p>
        )}
      </div>
    </div>
  );
}

export default LoginPage;