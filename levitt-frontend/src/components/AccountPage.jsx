// src/components/AccountPage.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Modal from './Modal';

const API_URL = 'http://localhost:3001';

// --- Ícones SVG ---
const PencilIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
  </svg>
);

const LogoutIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

function AccountPage() {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();

  // Estados
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ nome: '', igreja_local: '', data_nascimento: '', telefone: '' });
  const [modalState, setModalState] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Popula o formulário com dados do usuário
  useEffect(() => {
    if (user) {
      setFormData({
        nome: user.nome || '',
        igreja_local: user.igreja_local || '',
        data_nascimento: user.data_nascimento ? user.data_nascimento.split('T')[0] : '',
        telefone: user.telefone || '',
      });
    }
  }, [user]);

  // Handlers (lógica interna sem mudanças)
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsLoading(true);
    setError('');
    setMessage('');
    const fileFormData = new FormData();
    fileFormData.append('avatar', file);
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.put(`${API_URL}/api/users/me/avatar`, fileFormData, {
        headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${token}` },
      });
      setMessage('Avatar atualizado!');
      login(response.data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro no upload.');
    } finally {
      setIsLoading(false);
    }
  };
  const handleInfoChange = (e) => { setFormData({ ...formData, [e.target.name]: e.target.value }); };
  const handleInfoSave = async (e) => {
    e.preventDefault();
    if (!formData.nome) {
      setError('O campo "Nome" não pode estar vazio.');
      return;
    }
    setIsLoading(true);
    setError('');
    setMessage('');
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.put(`${API_URL}/api/users/me`, formData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setMessage('Informações salvas com sucesso!');
      login(response.data.token);
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar informações.');
    } finally {
      setIsLoading(false);
    }
  };
  const handleLogoutClick = () => {
    setModalState({
      isOpen: true,
      title: 'Confirmar Saída',
      message: 'Você tem certeza que deseja sair da sua conta?',
      onConfirm: () => { logout(); navigate('/login'); },
      confirmText: 'Sair',
      confirmClass: 'btn--primary'
    });
  };
  
  return (
    <>
      <Modal 
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        onConfirm={modalState.onConfirm}
        title={modalState.title}
        confirmText={modalState.confirmText}
        confirmClass={modalState.confirmClass}
      >
        <p>{modalState.message}</p>
      </Modal>

      <div className="main-layout">
        <header className="main-header">
          <div className="header-side"><Link to="/" className="logo">← Voltar</Link></div>
          <div className="header-title">Gerenciar Conta</div>
          <div className="header-side"></div>
        </header>
        <main className="main-content account-content">
          {/* Seção de Identidade (Avatar, Nome, Email) - AGORA SEPARADA */}
          <div className="profile-identity">
            <label htmlFor="avatarInput" className="avatar-upload-label">
              <div className="avatar-preview-container">
                <img 
                  src={user?.imagem_url || 'https://i.imgur.com/V4RclNb.png'}
                  alt="Avatar" 
                  className="avatar-preview" 
                />
                <div className="avatar-overlay"><PencilIcon /></div>
              </div>
            </label>
            <input 
              type="file" 
              id="avatarInput" 
              onChange={handleAvatarUpload} 
              accept="image/png, image/jpeg, image/gif"
              style={{ display: 'none' }}
            />
            <h2 className="user-name-display">{user?.nome}</h2>
            <p className="user-email-display">{user?.email}</p>
          </div>

          {/* Contêiner de Dados */}
          <form className="profile-card" onSubmit={handleInfoSave}>
            <div className="form-header">
              <h3 className="info-title">Dados</h3>
              <button type="button" className="edit-icon-btn" onClick={() => setIsEditing(!isEditing)}>
                <PencilIcon />
              </button>
            </div>

            <div className="info-grid">
              <div className="info-field">
                <label>Nome</label>
                {isEditing ? <input type="text" name="nome" value={formData.nome} onChange={handleInfoChange} className="info-input"/> : <p className="info-text">{user?.nome}</p>}
              </div>
              <div className="info-field">
                <label>Data de Nascimento</label>
                {isEditing ? <input type="date" name="data_nascimento" value={formData.data_nascimento} onChange={handleInfoChange} className="info-input" /> : <p className="info-text">{formData.data_nascimento || 'Não informado'}</p>}
              </div>
              <div className="info-field">
                <label>Telefone</label>
                {isEditing ? <input type="tel" name="telefone" value={formData.telefone} onChange={handleInfoChange} placeholder="(XX) XXXXX-XXXX" className="info-input" /> : <p className="info-text">{user?.telefone || 'Não informado'}</p>}
              </div>
              <div className="info-field">
                <label>Igreja Local</label>
                {isEditing ? <input type="text" name="igreja_local" value={formData.igreja_local} onChange={handleInfoChange} placeholder="Não informado" className="info-input" /> : <p className="info-text">{user?.igreja_local || 'Não informado'}</p>}
              </div>
            </div>
            
            {isEditing && (
              <div className="editing-actions">
                <button type="submit" className="btn btn--primary" disabled={isLoading}>
                  {isLoading ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            )}
          </form>
          
          <button type="button" className="btn btn--secondary logout-button" onClick={handleLogoutClick}>
            <LogoutIcon /> Sair
          </button>

          {message && <p className="success-message">{message}</p>}
          {error && <p className="error-message">{error}</p>}
        </main>
      </div>
    </>
  );
}

export default AccountPage;
