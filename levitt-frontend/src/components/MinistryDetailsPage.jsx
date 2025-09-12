// src/components/MinistryDetailsPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import Sidebar from './Sidebar';
import Modal from './Modal';
import DashboardCard from './DashboardCard';
import EventDetailsModal from './EventDetailsModal';

const API_URL = 'http://localhost:3001';

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

// Ícone de engrenagem para o botão de gerenciar
const ManageIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);
const StarIcon = (props) => ( <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> );

function MinistryDetailsPage() {
    const { id: ministryId } = useParams();
    const [ministry, setMinistry] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();
    const navigate = useNavigate(); // Hook para navegação
    const [copyButtonText, setCopyButtonText] = useState('Copiar');
    // Estados para o modal de gerenciamento
    const [inviteCodeModal, setInviteCodeModal] = useState({ isOpen: false, code: '', name: '' });
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [memberSkills, setMemberSkills] = useState([]); // Habilidades que o membro possui
    const [tempSelectedRoles, setTempSelectedRoles] = useState(new Set()); // Cargos selecionados no modal
    const [allRoles, setAllRoles] = useState([]); // A lista mestra de todos os cargos
    const [confirmModalState, setConfirmModalState] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    // Estados para o membro selecionado
    const [selectedMember, setSelectedMember] = useState(null);
    // NOVO ESTADO para o modal de criação de evento
    const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
    const [eventFormData, setEventFormData] = useState({
        titulo: '',
        localizacao: '',
        data_evento: '',
        observacoes: ''
    });
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isEventDetailsModalOpen, setIsEventDetailsModalOpen] = useState(false);

    const fetchMinistryDetails = useCallback(async () => {
        setIsLoading(true);
        try {
            // Busca os detalhes do ministério E os eventos em paralelo
            const [ministryResponse, eventsResponse] = await Promise.all([
            api.get(`/api/ministries/${ministryId}`),
            api.get(`/api/ministries/${ministryId}/events`) // Rota que criaremos no backend
            ]);

            setMinistry(ministryResponse.data);
            setEvents(eventsResponse.data);

        } catch (err) {
            setError('Não foi possível carregar os dados do ministério.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [ministryId]);

    useEffect(() => {
        fetchMinistryDetails();
    }, [fetchMinistryDetails]); // A dependência é a própria função memorizada.

    // Busca a lista mestra de cargos UMA VEZ quando a página carrega
    useEffect(() => {
        const fetchAllRoles = async () => {
            try {
            // CORREÇÃO: Usamos 'api.get' e a URL relativa.
            const response = await api.get('/api/roles');
            setAllRoles(response.data);
            } catch (err) {
            console.error("Erro ao buscar a lista de cargos", err);
            }
        };
        fetchAllRoles();
    }, []);

    const isRequesterTheLeader = useMemo(() => {
        if (!user || !ministry?.members) return false;
        const self = ministry.members.find(m => m.id === user.id);
        return self?.cargos.includes('Líder');
    }, [user, ministry]);

    // Abre o modal para gerenciar um membro
    const openManageModal = async (member) => {
        setSelectedMember(member);
        setTempSelectedRoles(new Set(member.cargos));
        setIsManageModalOpen(true);
        
        try {
            // CORREÇÃO: Usamos 'api.get' para ambas as chamadas.
            const response = await api.get(`/api/users/${member.id}/skills`);
            const allRolesResponse = await api.get('/api/roles');
            
            const memberSkillIds = new Set(response.data);
            setMemberSkills(allRolesResponse.data.filter(role => memberSkillIds.has(role.id)));
        } catch (err) {
            console.error("Erro ao buscar habilidades do membro", err);
        }
    };

    // 1. Chamado ao clicar em "Salvar Cargos" no modal principal
    const handleSaveChangesClick = () => {
        const newRoles = Array.from(tempSelectedRoles);
        
        // Verifica se o cargo 'Líder' está sendo adicionado
        const isTransferringLeadership = newRoles.includes('Líder');

        if (isTransferringLeadership && isRequesterTheLeader && selectedMember?.id !== user.id) {
            // Se for uma transferência, abre o modal de confirmação
            setConfirmModalState({
                isOpen: true,
                title: 'Confirmar Transferência de Liderança',
                message: `Você tem certeza que deseja tornar ${selectedMember.nome} o novo líder? Você perderá suas permissões de liderança.`,
                confirmText: 'Sim, transferir',
                confirmClass: 'btn--primary',
                onConfirm: () => performLeadershipTransfer()
            });
        } else {
            // Senão, salva os cargos normais diretamente
            performRoleUpdate();
        }
    };

    // 2. Ação executada após a confirmação no segundo modal
    const performLeadershipTransfer = async () => {
        try {
            await api.post(`/api/ministries/${ministryId}/transfer-leadership`, 
            { newLeaderId: selectedMember.id }
            );
            
            // CORREÇÃO: Removemos a tentativa de salvar outros cargos,
            // pois o usuário não tem mais permissão para isso.
            // await performRoleUpdate();
            
            setConfirmModalState({ isOpen: false });
            setIsManageModalOpen(false);

            // Apenas recarregamos os dados da página para refletir o novo líder.
            fetchMinistryDetails();

        } catch (err) {
            alert(err.response?.data?.error || 'Falha ao transferir a liderança.');
            setConfirmModalState({ isOpen: false });
        }
    };
    
    // 3. Ação que salva os cargos normais
    const performRoleUpdate = async () => {
        try {
            // CORREÇÃO: Usamos 'api.put' e removemos a configuração manual de token e headers.
            const newRoles = Array.from(tempSelectedRoles).filter(role => role !== 'Líder');
            await api.put(`/api/ministries/${ministryId}/members/${selectedMember.id}`, { roles: newRoles });
            
            setIsManageModalOpen(false);
            fetchMinistryDetails(); // Recarrega a página para ver todas as mudanças
        } catch (err) {
            alert(err.response?.data?.error || 'Falha ao atualizar os cargos.');
        }
    };

    const handleCopyCode = (code) => {
        navigator.clipboard.writeText(code).then(() => {
            setCopyButtonText('Copiado!');
            setTimeout(() => setCopyButtonText('Copiar'), 2000);
        });
    };

    const handleRoleToggle = (roleName) => {
        const newSelection = new Set(tempSelectedRoles);
        if (newSelection.has(roleName)) {
            newSelection.delete(roleName);
        } else {
            newSelection.add(roleName);
        }
        setTempSelectedRoles(newSelection);
    };

    // Prepara e abre o modal para remover um membro
    const handleRemoveMemberClick = (memberToRemove) => {
        setIsManageModalOpen(false); // Fecha o modal de gerenciamento
        setConfirmModalState({
            isOpen: true,
            title: 'Confirmar Remoção',
            message: `Você tem certeza que deseja remover ${memberToRemove.nome} do ministério?`,
            confirmText: 'Sim, remover',
            confirmClass: 'btn--danger',
            onConfirm: () => performRemoveMember(memberToRemove.id) // Ação a ser executada
        });
    };

    // A função que efetivamente chama a API para remover
    const performRemoveMember = async (memberId) => {
        try {
            // CORREÇÃO: Usamos 'api.delete'
            await api.delete(`/api/ministries/${ministryId}/members/${memberId}`);
            setConfirmModalState({ isOpen: false });
            fetchMinistryDetails();
        } catch (err) {
            console.error(err);
            alert('Falha ao remover o membro.');
            setConfirmModalState({ isOpen: false });
        }
    };

    // Prepara e abre o modal para o usuário sair do ministério
    const handleLeaveMinistryClick = () => {
        setConfirmModalState({
            isOpen: true,
            title: 'Sair do Ministério',
            message: 'Você tem certeza que deseja sair deste ministério?',
            confirmText: 'Sim, sair',
            confirmClass: 'btn--danger',
            onConfirm: () => performLeaveMinistry()
        });
    };

    // A função que efetivamente chama a API para sair
    const performLeaveMinistry = async () => {
        try {
            // CORREÇÃO: Usamos 'api.delete'
            await api.delete(`/api/ministries/${ministryId}/members/${user.id}`);
            navigate('/');
        } catch (err) {
            console.error(err);
            alert('Falha ao sair do ministério.');
            setConfirmModalState({ isOpen: false });
        }
    };

    // NOVO HANDLER para o formulário de evento
    const handleEventFormChange = (e) => {
        setEventFormData({ ...eventFormData, [e.target.name]: e.target.value });
    };

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        try {
            // CORREÇÃO: Usamos 'api.post' e removemos a configuração manual de token/headers.
            // O interceptador no nosso arquivo api.js cuidará da autenticação.
            await api.post(`/api/ministries/${ministryId}/events`, eventFormData);
            
            setIsCreateEventModalOpen(false);
            // Limpa o formulário para a próxima vez
            setEventFormData({ titulo: '', localizacao: '', data_evento: '', observacoes: '' });
            fetchMinistryDetails(); // Recarrega os dados da página
        } catch (err) {
            alert(err.response?.data?.error || 'Falha ao criar o evento.');
        }
    };

    const handleEventClick = async (eventId) => {
        try {
        const response = await api.get(`/api/events/${eventId}`);
        setSelectedEvent(response.data);
        setIsEventDetailsModalOpen(true);
        } catch (err) {
        console.error("Erro ao buscar detalhes do evento", err);
        }
    };

    if (isLoading) {
        return (
        <div className="home-layout">
            <Sidebar />
            <main className="main-content"><div className="loading-state">Carregando Ministério...</div></main>
        </div>
        );
    }

    if (error) {
        return (
        <div className="home-layout">
            <Sidebar />
            <main className="main-content"><div className="error-state">{error}</div></main>
        </div>
        );
    }

    return (
    <>
        {/* Modal para exibir o Código de Convite */}
        <Modal
            isOpen={inviteCodeModal.isOpen}
            onClose={() => setInviteCodeModal({ isOpen: false, code: '', name: '' })}
            title={`Convite para ${inviteCodeModal.name}`}
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

        {/* Modal para Gerenciar Cargos */}
        <Modal 
            isOpen={isManageModalOpen}
            onClose={() => setIsManageModalOpen(false)}
            title={`Gerenciar Cargos de ${selectedMember?.nome}`}
            confirmText="Salvar Alterações"
            onConfirm={handleSaveChangesClick}
            confirmClass="btn--primary"
        >
            <div className="skills-modal-content">
                <p className="modal-subtitle">{memberSkills.length === 0 ? "Este membro ainda não cadastrou habilidades." : "Selecione os cargos baseados nas habilidades do membro."}</p>
                <div className="skills-list">
                    {/* Percorremos sempre a lista mestra de todos os cargos disponíveis */}
                    {allRoles.map(role => {
                        // Lógica especial para o cargo de "Líder"
                        if (role.nome === 'Líder') {
                        // Só mostra a opção se o requisitante for o líder E não estiver se auto-gerenciando
                        if (isRequesterTheLeader && selectedMember?.id !== user.id) {
                            return (
                            <div 
                                key={role.id}
                                // A classe 'selected' é aplicada se "Líder" estiver nos cargos temporariamente selecionados
                                className={`skill-item skill-item--leader ${tempSelectedRoles.has(role.nome) ? 'selected' : ''}`}
                                onClick={() => handleRoleToggle(role.nome)}
                            >
                                <StarIcon /> {'Tornar Líder'}
                            </div>
                            );
                        }
                        return null; // Não mostra a opção "Líder" em nenhum outro caso
                        }
                        
                        // Lógica normal para todos os outros cargos
                        return (
                        <div 
                            key={role.id}
                            // A classe 'selected' é aplicada se o cargo estiver nos cargos temporariamente selecionados
                            className={`skill-item ${tempSelectedRoles.has(role.nome) ? 'selected' : ''}`}
                            onClick={() => handleRoleToggle(role.nome)}
                        >
                            {role.nome}
                        </div>
                        );
                    })}
                </div>
                <hr className="modal-divider"/>
                {/* Botão de remover agora abre o OUTRO modal */}
                <button type="button" className="btn btn--danger" onClick={() => handleRemoveMemberClick(selectedMember)}>
                    Remover do Ministério
                </button>
                {/* <div className="modal-footer fixed">
                    <button onClick={() => setIsSkillsModalOpen(false)} className="btn btn--secondary">Cancelar</button>
                    <button onClick={handleSkillsSave} className="btn btn--primary" disabled={isLoading}>
                    {isLoading ? "Salvando..." : "Salvar"}
                    </button>
                </div> */}
            </div>
        </Modal>

        {/* Modal Genérico de Confirmação */}
        <Modal
            isOpen={confirmModalState.isOpen}
            onClose={() => setConfirmModalState({ isOpen: false })}
            title={confirmModalState.title}
            confirmText={confirmModalState.confirmText}
            confirmClass={confirmModalState.confirmClass}
            onConfirm={confirmModalState.onConfirm}
        >
            <p>{confirmModalState.message}</p>
        </Modal>

        <Modal
            isOpen={isCreateEventModalOpen}
            onClose={() => setIsCreateEventModalOpen(false)}
            title="Criar Nova Escala/Evento"
            confirmText="Criar Evento"
            onConfirm={handleCreateEvent}
            confirmClass="btn--primary"
        >
            <form id="event-form" onSubmit={handleCreateEvent} className="modal-form">
                <div className="info-field">
                    <label>Título do Evento</label>
                    <input type="text" name="titulo" value={eventFormData.titulo} onChange={handleEventFormChange} className="form-input" required />
                </div>
                <div className="info-field">
                    <label>Data e Hora</label>
                    <input type="datetime-local" name="data_evento" value={eventFormData.data_evento} onChange={handleEventFormChange} className="form-input" required />
                </div>
                <div className="info-field">
                    <label>Localização</label>
                    <input type="text" name="localizacao" value={eventFormData.localizacao} onChange={handleEventFormChange} className="form-input" />
                </div>
                <div className="info-field">
                    <label>Observações (Opcional)</label>
                    <textarea name="observacoes" value={eventFormData.observacoes} onChange={handleEventFormChange} className="form-input" rows="3"></textarea>
                </div>
            </form>
        </Modal>

        <EventDetailsModal 
            isOpen={isEventDetailsModalOpen}
            onClose={() => setIsEventDetailsModalOpen(false)}
            event={selectedEvent}
            onUpdate={fetchMinistryDetails} // Passa a função para recarregar os dados
        />

        <div className="home-layout">
            <Sidebar />
            <main className="main-content">
                <header className="page-header">
                    <h2>{ministry?.titulo}</h2>
                    <p>{ministry?.descricao || ministry?.igreja_vinculada}</p>
                </header>

                <section className="dashboard-section">
                    <div className="section-header">
                        <h3 className="section-title">Membros ({ministry?.members?.length || 0})</h3>
                        <button onClick={() => { setInviteCodeModal({ isOpen: true, code: ministry?.codigo_convite, name: ministry?.titulo }); }} className="add-button" title="Convidar para Ministério">
                            +
                        </button>
                    </div>
                    <div className="member-list">
                        {ministry?.members?.map(member => (
                            <div key={member.id} className="member-card">
                            <MemberAvatar user={member} />
                            <div className="member-info">
                                <span className="member-name">{member.nome}</span>
                                {/* NOVA EXIBIÇÃO DE CARGOS COMO TAGS/ELIPSES */}
                                <div className="member-roles-container">
                                    {member.cargos.map(cargo => <span key={cargo} className="role-tag">{cargo}</span>)}
                                </div>
                            </div>
                            {/* Botão de gerenciar só aparece para administradores */}
                            {isRequesterTheLeader && (
                                <button className="manage-member-btn" onClick={() => openManageModal(member)}>
                                <ManageIcon />
                                </button>
                            )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Placeholders para futuras seções */}
                <section className="dashboard-section">
                    <div className="section-header">
                        <h3 className="section-title">Próximas Escalas</h3>
                        {/* NOVO BOTÃO para criar escala (só para admins) */}
                        {isRequesterTheLeader && (
                            <button onClick={() => { setIsCreateEventModalOpen(true); }} className="add-button" title="Criar Escala">
                                +
                            </button>
                        )}
                    </div>
                    <div className="horizontal-scroll-list" style={{ paddingTop: '5px' }}>
                        {events.length > 0 ? (
                            // Se a lista de eventos NÃO ESTÁ VAZIA, exibe os cards
                            events.map(event => (
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
                <section className="dashboard-section">
                    <h3 className="section-title">Repertório</h3>
                    <p className="empty-list-message">Nenhuma música adicionada ainda.</p>
                </section>
                <div className="page-footer-actions">
                    <button className="btn btn--danger" onClick={handleLeaveMinistryClick}>
                    Sair do Ministério
                    </button>
                </div>
            </main>
        </div>
    </>
    );
}

export default MinistryDetailsPage;