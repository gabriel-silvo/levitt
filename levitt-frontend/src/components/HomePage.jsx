// src/components/HomePage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
//import { useAuth } from '../hooks/useAuth';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import DashboardCard from './DashboardCard';
import EventDetailsModal from './EventDetailsModal';
import Modal from './Modal';

const API_URL = 'http://localhost:3001';

const formatEventDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Data inválida';
  const options = { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' };
  const formatted = new Intl.DateTimeFormat('pt-BR', options).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

function HomePage() {
  const [dashboardData, setDashboardData] = useState({ ministries: [], events: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  //const { user } = useAuth();
  
  // Estados separados para cada modal
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [inviteCodeModal, setInviteCodeModal] = useState({ isOpen: false, code: '', name: '' });
  
  const [joinCode, setJoinCode] = useState('');
  const [modalError, setModalError] = useState('');
  const [copyButtonText, setCopyButtonText] = useState('Copiar');

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/api/dashboard');
      setDashboardData(response.data);
    } catch (err) {
      if (err.code !== "ERR_CANCELED") {
        setError('Não foi possível carregar os dados do dashboard.');
        console.error("Erro ao buscar dados do dashboard:", err);
      }
    } finally {
      setIsLoading(false);
    }
  }, []); // O array de dependências vazio significa que a função nunca será recriada.

  // Efeito para mostrar o modal com o código de convite após a criação
  useEffect(() => {
    if (location.state?.showInviteModal) {
      setInviteCodeModal({
        isOpen: true,
        code: location.state.inviteCode,
        name: location.state.ministryName
      });
      // Limpa o estado da navegação para não reabrir o modal
      navigate(location.pathname, { state: {}, replace: true });
    }
  }, [location, navigate]);

  // useEffect para BUSCAR OS DADOS (AGORA SIMPLIFICADO)
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleJoinMinistry = async (e) => {
    e.preventDefault();
    setModalError('');
    if (!joinCode) {
      setModalError('Por favor, insira um código.');
      return;
    }
    try {
      await api.post('/api/ministries/join', { inviteCode: joinCode });
      setIsJoinModalOpen(false);
      setJoinCode('');
      // Recarrega os dados para mostrar o novo ministério
      // Para isso, precisamos mover a função fetchDashboardData para fora do useEffect
      // (Vamos fazer essa melhoria na próxima etapa, por enquanto está ok)
    } catch (err) {
      setModalError(err.response?.data?.error || 'Não foi possível entrar no ministério.');
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopyButtonText('Copiado!');
      setTimeout(() => setCopyButtonText('Copiar'), 2000);
    });
  };

  const handleEventClick = async (eventId) => {
    try {
      const response = await api.get(`/api/events/${eventId}`);
      setSelectedEvent(response.data);
      setIsEventModalOpen(true);
    } catch (err) {
      console.error("Erro ao buscar detalhes do evento", err);
    }
  };

  if (isLoading) {
    return (
      // Retornamos a estrutura de layout principal
      <div className="home-layout">
        <Sidebar />
        <main className="main-content">
          <div className="loading-state">Carregando...</div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="main-layout home-layout">
        <Sidebar />
        <main className="main-content">
          <div className="error-state">{error}</div>
        </main>
      </div>
    );
  }

  return (
    <>
      {/* Modal para Juntar-se ou Criar */}
      <Modal 
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        title="Juntar-se ou Criar um Ministério"
        showConfirmButton={false}
      >
        <form onSubmit={handleJoinMinistry} className="modal-form">
          <label>Juntar-se com um código de convite</label>
          <input 
            type="text"
            className="form-input"
            placeholder="Cole o código aqui"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          />
          {modalError && <p className="error-message">{modalError}</p>}
          <button type="submit" className="btn btn--primary" style={{width: '100%'}}>Juntar-se</button>
        </form>
        <div className="divider"><span>ou</span></div>
        <Link to="/ministries/new" className="btn btn--secondary" style={{width: '100%'}} onClick={() => setIsJoinModalOpen(false)}>
          Criar um Novo Ministério
        </Link>
      </Modal>

      {/* Modal para exibir o Código de Convite */}
      <Modal
        isOpen={inviteCodeModal.isOpen}
        onClose={() => setInviteCodeModal({ isOpen: false, code: '', name: '' })}
        title={`Ministério "${inviteCodeModal.name}" Criado!`}
        showConfirmButton={false} 
      >
        <p>Use o código abaixo para convidar outros membros:</p>
        <div className="invite-code-wrapper">
          <div className="invite-code-box">{inviteCodeModal.code}</div>
          <button className={`btn ${copyButtonText === 'Copiado!' ? 'btn--success' : 'btn--secondary'}`} onClick={() => handleCopyCode(inviteCodeModal.code)}>
            {copyButtonText}
          </button>
        </div>
        <small>Outros usuários poderão usar este código para entrar no seu ministério.</small>
      </Modal>

      <EventDetailsModal 
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        event={selectedEvent}
        onUpdate={fetchDashboardData} // Passa a função para recarregar os dados
      />

      <div className="home-layout">
        <Sidebar />
        <main className="main-content">
          <header className="page-header">
            <h2>Dashboard</h2>
            <p>Aqui está um resumo das suas atividades.</p>
          </header>

          {/* Seção de Escalas */}
          <section className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">Próximas Escalas</h3>
            </div>
            <div className="horizontal-scroll-list" style={{ paddingTop: '5px' }}>
              {dashboardData.events.length > 0 ? (
                // Se a lista de eventos NÃO ESTÁ VAZIA, exibe os cards
                dashboardData.events.map(event => (
                  <Link key={event.id} className="card-link" onClick={() => handleEventClick(event.id)}>
                    <DashboardCard key={event.id}>
                      <h4>{event.titulo}</h4>
                      <div className="dashboard-card-details">
                        <p>{event.localizacao || 'Local não informado'}</p>
                        <span>{formatEventDate(event.data_evento)}</span>
                      </div>
                    </DashboardCard>
                  </Link>
                ))
              ) : (
                <p className="empty-list-message">Nenhuma escala futura encontrada.</p>
              )}
            </div>
          </section>

          {/* --- SEÇÃO DE MINISTÉRIOS ATUALIZADA --- */}
          <section className="dashboard-section">
            <div className="section-header">
              <h3 className="section-title">Seus Ministérios</h3>
              {dashboardData.ministries.length > 0 && (
                <button onClick={() => { setIsJoinModalOpen(true); setModalError(''); }} className="add-button" title="Criar ou entrar em um ministério">
                  +
                </button>
              )}
            </div>
            
            <div className="horizontal-scroll-list" style={{ paddingTop: '5px' }}>
              {dashboardData.ministries.length > 0 ? (
                // Se a lista de ministérios NÃO ESTÁ VAZIA, exibe os cards
                dashboardData.ministries.map(ministry => (
                  <Link to={`/ministries/${ministry.id}`} key={ministry.id} className="card-link">
                    <DashboardCard key={ministry.id}>
                      <h4>{ministry.titulo}</h4>
                      <div className="dashboard-card-details">
                        <p>{ministry.igreja_vinculada || 'Igreja não informada'}</p>
                        <span>Membros: {ministry.member_count}</span>
                      </div>
                    </DashboardCard>
                  </Link>
                ))
              ) : (
                // Se a lista ESTÁ VAZIA, exibe o card grande de adicionar que TAMBÉM ABRE O MODAL
                <div className="add-card-link" onClick={() => { setIsJoinModalOpen(true); setModalError(''); }}>
                  <DashboardCard className="add-card">
                    <div className="plus-icon">+</div>
                    <p>Criar ou entrar em um ministério</p>
                  </DashboardCard>
                </div>
                // <Link className="add-card-link" onClick={() => { setIsJoinModalOpen(true); setModalError(''); }}>
                //   <DashboardCard className="add-card">
                //     <div className="plus-icon">+</div>
                //     <p>Criar ou entrar em um ministério</p>
                //   </DashboardCard>
                // </Link>
              )}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}

export default HomePage;