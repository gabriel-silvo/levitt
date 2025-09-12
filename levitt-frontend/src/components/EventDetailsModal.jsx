// src/components/EventDetailsModal.jsx
import React from 'react';
import Modal from './Modal';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

const formatEventDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Data inválida';
  const options = { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' };
  const formatted = new Intl.DateTimeFormat('pt-BR', options).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

// Componente para o avatar (pode ser movido para um arquivo próprio no futuro)
const MemberAvatar = ({ user }) => {
  if (user?.imagem_url) {
    return <img src={user.imagem_url} alt={user.nome} className="member-avatar-image" />;
  }
  const initials = user?.nome ? user.nome.charAt(0).toUpperCase() : '?';
  return <div className="member-avatar-initials">{initials}</div>;
};

function EventDetailsModal({ event, isOpen, onClose, onUpdate }) {
  const { user } = useAuth();

  if (!isOpen || !event) return null;

  // Função para confirmar ou recusar presença
  const handleRsvp = async (status) => {
    try {
      await api.post(`/api/events/${event.id}/rsvp`, { status });
      onUpdate(); // Chama a função para recarregar os dados na página pai
      onClose();  // Fecha o modal
    } catch (err) {
      console.error("Erro ao confirmar presença", err);
      alert("Não foi possível registrar sua resposta.");
    }
  };
  
  // Encontra o status do usuário logado
  const currentUserRsvp = event.participantes?.find(p => p.id === user.id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={event.titulo}
      showFooter={false}
    >
      <div className="event-details-content">
        <div className="event-details-header">
          <p><strong>Data:</strong> {formatEventDate(event.data_evento)}</p>
          <p><strong>Local:</strong> {event.localizacao}</p>
          {event.observacoes && <p><strong>Obs.:</strong> {event.observacoes}</p>}
        </div>

        <div className="divider-horizontal"></div>

        <div className="rsvp-section">
          <div className="rsvp-buttons">
            <button 
              className={`btn ${currentUserRsvp?.status === 'Confirmado' ? 'btn--success' : 'btn--secondary'}`}
              onClick={() => handleRsvp('Confirmado')}
            >
              Vou Participar
            </button>
            <button 
              className={`btn ${currentUserRsvp?.status === 'Recusado' ? 'btn--danger' : 'btn--secondary'}`}
              onClick={() => handleRsvp('Recusado')}
            >
              Não Vou Participar
            </button>
          </div>
        </div>

        <div className="participants-section">
          <h4>Participantes Confirmados ({event.participantes?.filter(p => p.status === 'Confirmado').length || 0})</h4>
          <div className="participants-list">
            {event.participantes?.filter(p => p.status === 'Confirmado').map(participant => (
              <div key={participant.id} className="participant-item">
                <MemberAvatar user={participant} />
                <span>{participant.nome}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default EventDetailsModal;