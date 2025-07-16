// src/components/HomePage.jsx

import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode'; // Importa a função de decodificação

// Um componente simples para o avatar do usuário
const UserAvatar = ({ user }) => {
  // Se o usuário tiver uma imagem, use-a. Senão, mostre as iniciais.
  if (user?.imagem_url) {
    return <img src={user.imagem_url} alt="Avatar" className="avatar-image" />;
  }
  
  const initials = user?.nome ? user.nome.charAt(0).toUpperCase() : '?';
  return <div className="avatar-initials">{initials}</div>;
};

function HomePage({ onLogout }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [usuario, setUsuario] = useState(null);

  // Este useEffect roda uma vez para pegar os dados do usuário do token
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        // O payload do nosso token tem nome, email, id.
        // Futuramente, quando o usuário atualizar a foto, teremos que atualizar o token ou buscar os dados novamente.
        setUsuario(decodedToken);
      } catch (error) {
        console.error("Token inválido:", error);
        onLogout(); // Se o token for inválido, desloga o usuário.
      }
    }
  }, [onLogout]);

  return (
    <div className="homepage-layout">
      <header className="main-header">
        <div className="logo">Levitt</div>
        <nav className="user-menu">
          <div className="avatar-container" onClick={() => setMenuAberto(!menuAberto)}>
            <UserAvatar user={usuario} />
          </div>
          
          {/* Menu dropdown que aparece quando 'menuAberto' é true */}
          {menuAberto && (
            <div className="dropdown-menu">
              <div className="dropdown-header">
                <strong>{usuario?.nome}</strong>
                <small>{usuario?.email}</small>
              </div>
              <ul>
                {/* Futuramente, este link levará para a página de configurações */}
                <li><button>Conta</button></li>
                <li><button onClick={onLogout}>Sair</button></li>
              </ul>
            </div>
          )}
        </nav>
      </header>
      
      <main className="main-content">
        <h1>Página Inicial</h1>
        <p>Bem-vindo(a) de volta, {usuario?.nome}!</p>
        {/* Aqui virá o conteúdo principal, como a lista de ministérios, etc. */}
      </main>
    </div>
  );
}

export default HomePage;