// levitt-frontend/src/components/LoginPage.jsx

import React, { useState } from 'react';
import api from '../services/api';
import { GoogleLogin } from '@react-oauth/google'; // Importa o componente de login
import { useAuth } from '../hooks/useAuth.jsx';
import GoogleLogo from './GoogleLogo'; // Importa o nosso logo SVG
import { EyeIcon } from './EyeIcon';

// A URL base da nossa API. É uma boa prática defini-la em um só lugar.
const API_URL = 'http://localhost:3001';

function LoginPage() {
  const { login } = useAuth();

  const [isRegistering, setIsRegistering] = useState(false);
  // Estados para controlar os campos do formulário
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacaoSenha, setConfirmacaoSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmationPassword, setShowConfirmationPassword] = useState(false);
  // Estado para exibir mensagens de erro da API
  const [error, setError] = useState('');

  const handleEmailAuth = async (event) => {
    event.preventDefault();
    setError('');

    if (isRegistering && senha !== confirmacaoSenha) {
      setError('As senhas não coincidem.');
      return;
    }

    const userData = { nome, email, senha };

    try {
      let response;
      if (isRegistering) {
        // --- LÓGICA DE REGISTRO ---
        // CORREÇÃO: Usamos 'api.post' e removemos a URL completa
        response = await api.post('/register', userData);
        console.log('Resposta do registro:', response.data);
        login(response.data.token);
      } else {
        // --- LÓGICA DE LOGIN ---
        // CORREÇÃO: Usamos 'api.post' e removemos a URL completa
        response = await api.post('/login', { email, senha });
        console.log('Resposta do login:', response.data);
        login(response.data.token);
      }
    } catch (err) {
      console.error('Erro de autenticação:', err.response ? err.response.data : err.message);
      setError(err.response?.data?.error || 'Ocorreu um erro. Tente novamente.');
    }
  };

  // A lógica do Google Login será implementada depois
  const handleGoogleLoginSuccess = async (credentialResponse) => {
    setError('');
    console.log("Token do Google recebido:", credentialResponse);
    try {
      // CORREÇÃO: Usamos 'api.post' e removemos a URL completa
      const response = await api.post('/auth/google-login', {
        token: credentialResponse.credential,
      });

      console.log("Resposta do nosso backend:", response.data);
      login(response.data.token);
    } catch (err) {
      console.error('Erro no login com Google:', err.response ? err.response.data : err.message);
      setError(err.response?.data?.error || 'Falha na autenticação com Google.');
    }
  };

  const handleGoogleLoginError = () => {
    setError('Falha na autenticação com Google.');
  };

  return (
    <div className="login-container">
      <h1>{isRegistering ? 'Criar Conta' : 'Levitt'}</h1>

      <div className="google-login-button-container">
        <GoogleLogin
          onSuccess={handleGoogleLoginSuccess}
          onError={handleGoogleLoginError}
          shape="rectangular"
          theme="outline"
          size="large"
          text="continue_with"
        />
      </div>

      <div className="divider">
        <span>ou</span>
      </div>

      {/* Exibidor de mensagem de erro */}
      {error && <p className="error-message">{error}</p>}

      <form className="login-form" onSubmit={handleEmailAuth}>

        {/* O campo "Nome" só aparece durante o registro */}
        {isRegistering && (
          <input 
            type="text" 
            placeholder="Seu Nome" 
            className="form-input"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required 
          />
        )}

        {/* O campo "Email" aparece tanto no login quanto no registro */}
        <input 
          type="email" 
          placeholder="Email"
          className="form-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required 
        />

        {/* Campo de Senha principal, com o wrapper e o botão do olho */}
        <div className="password-wrapper">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Senha"
            className="form-input"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
          <button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)}>
            <EyeIcon isToggled={showPassword} />
          </button>
        </div>

        {/* O campo "Confirme a Senha" só aparece durante o registro */}
        {isRegistering && (
          <div className="password-wrapper">
            <input
              type={showConfirmationPassword ? 'text' : 'password'}
              placeholder="Confirme a Senha"
              className="form-input"
              value={confirmacaoSenha}
              onChange={(e) => setConfirmacaoSenha(e.target.value)}
              required
            />
            <button type="button" className="eye-btn" onClick={() => setShowConfirmationPassword(!showConfirmationPassword)}>
              <EyeIcon isToggled={showConfirmationPassword} />
            </button>
          </div>
        )}

        {/* O botão de submit muda o texto dependendo do modo */}
        <button type="submit" className="btn btn--primary" style={{width: '100%'}}>{isRegistering ? 'Criar Conta' : 'Entrar'}</button>

      </form>

      <div className="toggle-auth">
        {isRegistering ? (
          <p>
            Já tem uma conta?{' '}
            <span onClick={() => { setIsRegistering(false); setError(''); }}>Faça o login</span>
          </p>
        ) : (
          <p>
            Não tem uma conta?{' '}
            <span onClick={() => { setIsRegistering(true); setError(''); }}>Cadastre-se</span>
          </p>
        )}
      </div>
    </div>
  );
}

export default LoginPage;