// src/components/CreateMinistryPage.jsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const API_URL = 'http://localhost:3001';

function CreateMinistryPage() {
  const [formData, setFormData] = useState({
    titulo: '',
    igreja_vinculada: '',
    descricao: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.titulo.trim()) {
      setError('Por favor, insira um nome para o ministério.');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      // CORREÇÃO: Usamos 'api.post' e removemos a URL completa e os headers.
      // O interceptador anexa o token de autorização automaticamente.
      const response = await api.post('/api/ministries', formData);
      
      // Sucesso! Redireciona para a página inicial, passando o código no 'state'
      navigate('/', { 
        state: { 
          showInviteModal: true,
          inviteCode: response.data.codigo_convite,
          ministryName: response.data.titulo
        } 
      });

    } catch (err) {
      setError(err.response?.data?.error || 'Não foi possível criar o ministério.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="main-layout">
       <header className="main-header">
          <div className="header-side"><Link to="/" className="logo">← Voltar</Link></div>
          <div className="header-title">Criar Novo Ministério</div>
          <div className="header-side"></div>
        </header>
        <main className="main-content account-content">
          <form className="profile-card form-layout-stacked" style={{ maxWidth: '600px' }} onSubmit={handleSubmit}>
            <div className="form-header">
                <h3 className="info-title">Qual será o nome do ministério?</h3>
            </div>
            <div className="info-field">
                <label htmlFor="titulo">Nome do Ministério</label>
                <input type="text" id="titulo" name="titulo" className="form-input" value={formData.titulo} onChange={handleChange} />
            </div>
            <div className="info-field">
                <label htmlFor="igreja_vinculada">Igreja Vinculada (Opcional)</label>
                <input type="text" id="igreja_vinculada" name="igreja_vinculada" className="form-input" value={formData.igreja_vinculada} onChange={handleChange} />
            </div>
            <div className="info-field">
                <label htmlFor="descricao">Pequena Descrição (Opcional)</label>
                <textarea id="descricao" name="descricao" className="form-input" value={formData.descricao} onChange={handleChange} rows="3"></textarea>
            </div>

            {error && <p className="error-message" style={{ marginTop: '1rem' }}>{error}</p>}
            <div className="editing-actions">
              <button type="submit" className="btn btn--primary" disabled={isLoading}>
                {isLoading ? 'Criando...' : 'Criar Ministério'}
              </button>
            </div>
          </form>
        </main>
    </div>
  );
}

export default CreateMinistryPage;