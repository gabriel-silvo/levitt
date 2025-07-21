// src/components/HomePage.jsx

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

const UserAvatar = ({ user }) => {
  if (user?.imagem_url) {
    return <img src={user.imagem_url} alt="Avatar" className="avatar-image" />;
  }
  const initials = user?.nome ? user.nome.charAt(0).toUpperCase() : '?';
  return <div className="avatar-initials">{initials}</div>;
};

function HomePage() {
  const [menuAberto, setMenuAberto] = useState(false);
  const { user } = useAuth();

  return (
    <div className="homepage-layout">
      <header className="main-header">
        <div className="logo">Levitt</div>
        <nav className="user-menu">
          <div className="avatar-container" onClick={() => setMenuAberto(!menuAberto)}>
            {/* CORREÇÃO: Usamos a variável 'user' que vem do useAuth() */}
            <UserAvatar user={user} />
          </div>
          
          {menuAberto && (
            <div className="dropdown-menu">
              <div className="dropdown-header">
                {/* CORREÇÃO: Usamos a variável 'user' */}
                <strong>{user?.nome}</strong>
                <small>{user?.email}</small>
              </div>
              <ul>
                <li>
                  <Link to="/account" className="dropdown-link">Gerenciar Conta</Link>
                </li>
              </ul>
            </div>
          )}
        </nav>
      </header>
      
      <main className="main-content">
        <h1>Página Inicial</h1>
        {/* CORREÇÃO: Usamos a variável 'user' */}
        <p>Bem-vindo(a) de volta, {user?.nome}!</p>
      </main>
    </div>
  );
}

export default HomePage;