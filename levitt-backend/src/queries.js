const db = require('./db');

// --- FUNÇÕES DE USUÁRIO ---

const createUser = async ({ nome, email, senha_hash, data_nascimento, igreja_local }) => {
  const text = `
    INSERT INTO usuarios(nome, email, senha_hash, data_nascimento, igreja_local)
    VALUES($1, $2, $3, $4, $5)
    RETURNING id, nome, email;
  `;
  const values = [nome, email, senha_hash, data_nascimento, igreja_local];
  const result = await db.query(text, values);
  return result.rows[0];
};

const deleteUserById = async (userId) => {
  const text = 'DELETE FROM usuarios WHERE id = $1';
  await db.query(text, [userId]);
  return { message: 'Usuário deletado com sucesso.' };
};

const findUserByEmail = async (email) => {
  const text = 'SELECT * FROM usuarios WHERE email = $1';
  const values = [email];
  const result = await db.query(text, values);
  return result.rows[0];
};

const findOrCreateUserByGoogle = async ({ google_id, email, nome, imagem_url }) => {
  let user = await db.query('SELECT * FROM usuarios WHERE google_id = $1', [google_id]);
  if (user.rows[0]) {
    return user.rows[0];
  }

  user = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
  if (user.rows[0]) {
    const updateQuery = `
      UPDATE usuarios SET google_id = $1, imagem_url = COALESCE(imagem_url, $3) 
      WHERE email = $2 RETURNING *;`;
    const values = [google_id, email, imagem_url];
    const updatedUser = await db.query(updateQuery, values);
    return updatedUser.rows[0];
  }

  const createQuery = `
    INSERT INTO usuarios(nome, email, google_id, senha_hash, imagem_url)
    VALUES($1, $2, $3, NULL, $4) RETURNING *;`;
  const createValues = [nome, email, google_id, imagem_url];
  const newUser = await db.query(createQuery, createValues);
  return newUser.rows[0];
};

const updateUserAvatar = async (userId, imageUrl) => {
  const text = `
    UPDATE usuarios SET imagem_url = $1 WHERE id = $2
    RETURNING id, email, nome, imagem_url;`;
  const values = [imageUrl, userId];
  const result = await db.query(text, values);
  return result.rows[0];
};

const updateUserInfo = async (userId, { nome, igreja_local, data_nascimento, telefone }) => {
  const text = `
    UPDATE usuarios SET nome = $1, igreja_local = $2, data_nascimento = $3, telefone = $4
    WHERE id = $5
    RETURNING id, email, nome, imagem_url, igreja_local, data_nascimento, telefone;`;
  const values = [nome, igreja_local, data_nascimento, telefone, userId];
  const result = await db.query(text, values);
  return result.rows[0];
};


// --- FUNÇÕES DE MINISTÉRIO ---

const createMinistry = async (ministryData, creatorId) => {
  const { titulo, igreja_vinculada, descricao, codigo_convite } = ministryData;
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const ministryQuery = 'INSERT INTO ministerios(titulo, igreja_vinculada, descricao, codigo_convite) VALUES($1, $2, $3, $4) RETURNING id';
    const ministryResult = await client.query(ministryQuery, [titulo, igreja_vinculada, descricao, codigo_convite]);
    const ministryId = ministryResult.rows[0].id;
    const memberQuery = 'INSERT INTO membros_ministerio(usuario_id, ministerio_id, cargo) VALUES($1, $2, $3)';
    await client.query(memberQuery, [creatorId, ministryId, 'Líder']);
    await client.query('COMMIT');
    return { id: ministryId, titulo, codigo_convite };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

const getMinistriesByUserIdWithMemberCount = async (userId) => {
  const text = `
    SELECT
      m.id,
      m.titulo,
      m.igreja_vinculada,
      -- CORREÇÃO AQUI: Adiciona DISTINCT para contar apenas membros únicos
      COUNT(DISTINCT mm_count.usuario_id) AS member_count
    FROM ministerios m
    JOIN membros_ministerio mm_user ON m.id = mm_user.ministerio_id
    LEFT JOIN membros_ministerio mm_count ON m.id = mm_count.ministerio_id
    WHERE mm_user.usuario_id = $1
    GROUP BY m.id, m.titulo, m.igreja_vinculada
    ORDER BY m.titulo ASC;
  `;
  const values = [userId];
  const result = await db.query(text, values);
  return result.rows;
};

const joinMinistryByCode = async (userId, inviteCode) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Encontra o ministério pelo código de convite
    const ministryResult = await client.query('SELECT id FROM ministerios WHERE codigo_convite = $1', [inviteCode.toUpperCase()]);
    if (ministryResult.rows.length === 0) {
      throw new Error('Código de convite inválido ou não encontrado.');
    }
    const ministryId = ministryResult.rows[0].id;

    // 2. Verifica se o usuário já não é um membro
    const memberResult = await client.query('SELECT 1 FROM membros_ministerio WHERE usuario_id = $1 AND ministerio_id = $2', [userId, ministryId]);
    if (memberResult.rows.length > 0) {
      throw new Error('Você já faz parte deste ministério.');
    }

    // 3. Adiciona o usuário como um "Membro"
    await client.query('INSERT INTO membros_ministerio(usuario_id, ministerio_id, cargo) VALUES($1, $2, $3)', [userId, ministryId, 'Membro']);
    
    await client.query('COMMIT');
    return { ...ministryResult.rows[0], message: 'Entrada no ministério realizada com sucesso!' };
  } catch (e) {
    await client.query('ROLLBACK');
    // Joga o erro com a mensagem específica para o frontend
    throw new Error(e.message || 'Ocorreu um erro ao entrar no ministério.');
  } finally {
    client.release();
  }
};

const getMinistryDetailsById = async (ministryId, requesterId) => {
  // Query para buscar os detalhes do ministério
  const ministryQuery = 'SELECT * FROM ministerios WHERE id = $1';
  const ministryResult = await db.query(ministryQuery, [ministryId]);

  if (ministryResult.rows.length === 0) {
    throw new Error('Ministério não encontrado.');
  }
  const ministryDetails = ministryResult.rows[0];

  // Query para buscar todos os membros e seus cargos
  const membersQuery = `
    SELECT u.id, u.nome, u.email, u.imagem_url, mm.cargo
    FROM usuarios u
    JOIN membros_ministerio mm ON u.id = mm.usuario_id
    WHERE mm.ministerio_id = $1
    ORDER BY u.nome ASC;
  `;
  const membersResult = await db.query(membersQuery, [ministryId]);
  
  // Agrupa os cargos por membro, caso um membro tenha múltiplos cargos
  const membersWithRoles = membersResult.rows.reduce((acc, row) => {
    if (!acc[row.id]) {
      acc[row.id] = {
        id: row.id,
        nome: row.nome,
        email: row.email,
        imagem_url: row.imagem_url,
        cargos: []
      };
    }
    acc[row.id].cargos.push(row.cargo);
    return acc;
  }, {});
  const members = Object.values(membersWithRoles);
  
  // Verifica se o usuário que fez a requisição é membro deste ministério
  const isMember = members.some(member => member.id === requesterId);
  if (!isMember) {
    throw new Error('Acesso negado. Você não é membro deste ministério.');
  }

  return { ...ministryDetails, members };
};

const isUserMinistryAdmin = async (userId, ministryId) => {
  const text = `
    SELECT 1 FROM membros_ministerio
    WHERE usuario_id = $1 AND ministerio_id = $2 AND (cargo = 'Administrador' OR cargo = 'Líder')
  `;
  const values = [userId, ministryId];
  const result = await db.query(text, values);
  return result.rows.length > 0;
};

// Deleta todos os cargos de um usuário em um ministério e insere os novos
const updateUserRolesInMinistry = async (userId, ministryId, newRoles) => {
  // Garante que a palavra 'Líder' não está sendo gerenciada por aqui
  const filteredRoles = newRoles.filter(role => role !== 'Líder');

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    // Deleta todos os cargos antigos (exceto 'Líder')
    await client.query("DELETE FROM membros_ministerio WHERE usuario_id = $1 AND ministerio_id = $2 AND cargo != 'Líder'", [userId, ministryId]);
    
    // Insere os novos cargos filtrados
    for (const role of filteredRoles) {
      if(role.trim() !== '') {
        const insertQuery = 'INSERT INTO membros_ministerio(usuario_id, ministerio_id, cargo) VALUES($1, $2, $3)';
        await client.query(insertQuery, [userId, ministryId, role.trim()]);
      }
    }
    
    await client.query('COMMIT');
    return { message: 'Cargos atualizados com sucesso.' };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

// Nova função auxiliar para encontrar o próximo líder
const findNextLeaderCandidate = async (client, ministryId, departingLeaderId) => {
  // Critério 1: Procura por Admins (excluindo o líder que está saindo)
  let candidates = await client.query("SELECT usuario_id FROM membros_ministerio WHERE ministerio_id = $1 AND cargo = 'Administrador' AND usuario_id != $2 ORDER BY usuario_id ASC LIMIT 1", [ministryId, departingLeaderId]);
  if (candidates.rows.length > 0) {
    return candidates.rows[0].usuario_id;
  }
  
  // Critério 2: Se não há admins, procura pelo primeiro membro qualquer
  candidates = await client.query('SELECT usuario_id FROM membros_ministerio WHERE ministerio_id = $1 AND usuario_id != $2 ORDER BY usuario_id ASC LIMIT 1', [ministryId, departingLeaderId]);
  if (candidates.rows.length > 0) {
    return candidates.rows[0].usuario_id;
  }

  // Se não houver nenhum outro membro
  return null;
};

const transferMinistryLeadership = async (ministryId, oldLeaderId, newLeaderId) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Remove o cargo 'Líder' do líder antigo.
    // Usamos UPDATE para o caso de ele ter outros cargos que devem permanecer.
    await client.query(
      "DELETE FROM membros_ministerio WHERE usuario_id = $1 AND ministerio_id = $2 AND cargo = 'Líder'",
      [oldLeaderId, ministryId]
    );

    // 2. Adiciona o cargo 'Líder' ao novo líder.
    // ON CONFLICT garante que não haverá erro se ele já for membro com outro cargo.
    await client.query(
      "INSERT INTO membros_ministerio(usuario_id, ministerio_id, cargo) VALUES($1, $2, 'Líder') ON CONFLICT (usuario_id, ministerio_id, cargo) DO NOTHING",
      [newLeaderId, ministryId]
    );

    await client.query('COMMIT');
    return { message: 'Liderança transferida com sucesso.' };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

const removeUserFromMinistry = async (userId, ministryId) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Pega os cargos atuais do usuário que está saindo
    const rolesResult = await client.query('SELECT cargo FROM membros_ministerio WHERE usuario_id = $1 AND ministerio_id = $2', [userId, ministryId]);
    const isLeader = rolesResult.rows.map(r => r.cargo).includes('Líder');

    // 2. Lógica de verificação para líderes (AGORA SIMPLIFICADA)
    if (isLeader) {
      // Se ele é o líder, sabemos que ele é o único. Apenas procuramos um sucessor.
      const nextLeaderId = await findNextLeaderCandidate(client, ministryId, userId);
      
      if (nextLeaderId) {
        // Se encontrou um sucessor, promove-o
        console.log(`Líder ID ${userId} está saindo. Promovendo automaticamente o usuário ID ${nextLeaderId}.`);
        await client.query("INSERT INTO membros_ministerio(usuario_id, ministerio_id, cargo) VALUES($1, $2, 'Líder') ON CONFLICT (usuario_id, ministerio_id, cargo) DO NOTHING", [nextLeaderId, ministryId]);
      }
      // Se não encontrou sucessor (ele era o último membro), a lógica prossegue e o ministério será deletado.
    }
    
    // 3. Remove o membro (todos os seus cargos)
    const deleteResult = await client.query('DELETE FROM membros_ministerio WHERE usuario_id = $1 AND ministerio_id = $2', [userId, ministryId]);
    if (deleteResult.rowCount === 0) {
      throw new Error('Membro não encontrado neste ministério.');
    }
    
    // 4. Verifica se o ministério ficou vazio e o deleta
    const finalCountResult = await client.query('SELECT COUNT(DISTINCT usuario_id) FROM membros_ministerio WHERE ministerio_id = $1', [ministryId]);
    if (parseInt(finalCountResult.rows[0].count, 10) === 0) {
      console.log(`Ministério ID ${ministryId} ficou sem membros e será deletado.`);
      await client.query('DELETE FROM ministerios WHERE id = $1', [ministryId]);
    }
    
    await client.query('COMMIT');
    return { message: 'Operação de remoção/saída concluída com sucesso.' };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

const getAllBaseRoles = async () => {
  const text = 'SELECT * FROM cargos_base ORDER BY nome ASC';
  const result = await db.query(text);
  return result.rows;
};

const getUserSkills = async (userId) => {
  const text = 'SELECT cargo_id FROM habilidades_usuario WHERE usuario_id = $1';
  const result = await db.query(text, [userId]);
  // Retorna um array simples de IDs, ex: [1, 5, 8]
  return result.rows.map(row => row.cargo_id); 
};

const updateUserSkills = async (userId, skillIds) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    // 1. Deleta todas as habilidades antigas do usuário
    await client.query('DELETE FROM habilidades_usuario WHERE usuario_id = $1', [userId]);
    
    // 2. Insere as novas habilidades
    if (skillIds && skillIds.length > 0) {
      const insertPromises = skillIds.map(skillId => {
        const insertQuery = 'INSERT INTO habilidades_usuario(usuario_id, cargo_id) VALUES($1, $2)';
        return client.query(insertQuery, [userId, skillId]);
      });
      await Promise.all(insertPromises);
    }
    
    await client.query('COMMIT');
    return { message: 'Habilidades atualizadas com sucesso.' };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

const countMinistryLeaders = async (ministryId) => {
  const text = `
    SELECT COUNT(*) FROM membros_ministerio
    WHERE ministerio_id = $1 AND cargo = 'Líder'
  `;
  const result = await db.query(text, [ministryId]);
  return parseInt(result.rows[0].count, 10);
};

const findUserById = async (userId) => {
  // Simplesmente busca um usuário pelo seu ID primário.
  const text = 'SELECT id, nome, email FROM usuarios WHERE id = $1';
  const result = await db.query(text, [userId]);
  return result.rows[0];
};

const getUserRolesInMinistry = async (userId, ministryId) => {
  // Busca todos os cargos de um usuário específico em um ministério específico.
  const text = `
    SELECT cargo FROM membros_ministerio
    WHERE usuario_id = $1 AND ministerio_id = $2
  `;
  const values = [userId, ministryId];
  const result = await db.query(text, values);
  // Retorna um array de strings com os nomes dos cargos, ex: ['Líder', 'Guitarrista']
  return result.rows.map(row => row.cargo);
};

const createEvent = async (eventData, ministryId, creatorId) => {
  const { titulo, localizacao, data_evento, observacoes } = eventData;
  const text = `
    INSERT INTO eventos(ministerio_id, titulo, localizacao, data_evento, observacoes)
    VALUES($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const values = [ministryId, titulo, localizacao, data_evento, observacoes];
  const result = await db.query(text, values);
  return result.rows[0];
};

const getUpcomingEventsByMinistryIds = async (ministryIds) => {
  if (!ministryIds || ministryIds.length === 0) return [];
  const text = `
    SELECT e.id, e.titulo, e.data_evento, m.titulo as ministerio_titulo
    FROM eventos e
    JOIN ministerios m ON e.ministerio_id = m.id
    WHERE e.ministerio_id = ANY($1) AND e.data_evento >= NOW()
    ORDER BY e.data_evento ASC
    LIMIT 10;`;
  const values = [ministryIds];
  const result = await db.query(text, values);
  return result.rows;
};

const getEventsByMinistryId = async (ministryId) => {
  const text = `
    SELECT * FROM eventos 
    WHERE ministerio_id = $1 AND data_evento >= NOW() 
    ORDER BY data_evento ASC`;
  const result = await db.query(text, [ministryId]);
  return result.rows;
};

const getEventDetailsById = async (eventId) => {
  const eventQuery = 'SELECT * FROM eventos WHERE id = $1';
  const eventResult = await db.query(eventQuery, [eventId]);
  if (eventResult.rows.length === 0) throw new Error('Evento não encontrado.');
  const eventDetails = eventResult.rows[0];

  // Busca os membros que confirmaram/recusaram
  const rsvpQuery = `
    SELECT u.id, u.nome, u.imagem_url, pe.status
    FROM participacao_evento pe
    JOIN usuarios u ON pe.usuario_id = u.id
    WHERE pe.evento_id = $1;
  `;
  const rsvpResult = await db.query(rsvpQuery, [eventId]);
  eventDetails.participantes = rsvpResult.rows;

  // Busca as músicas do repertório (funcionalidade futura)
  // const songsQuery = '...';
  eventDetails.musicas = []; // Placeholder

  return eventDetails;
};

const updateUserEventStatus = async (userId, eventId, status) => {
  // ON CONFLICT...DO UPDATE é uma forma de fazer "INSERT ou UPDATE se já existir"
  const text = `
    INSERT INTO participacao_evento (usuario_id, evento_id, status)
    VALUES ($1, $2, $3)
    ON CONFLICT (usuario_id, evento_id)
    DO UPDATE SET status = $3
    RETURNING *;
  `;
  const values = [userId, eventId, status];
  const result = await db.query(text, values);
  return result.rows[0];
};

const deleteEvent = async (eventId) => {
  const text = 'DELETE FROM eventos WHERE id = $1';
  await db.query(text, [eventId]);
  return { message: 'Evento deletado com sucesso.' };
};

// Exportamos um único objeto com todas as nossas funções
module.exports = {
  createUser,
  deleteUserById,
  findUserByEmail,
  findOrCreateUserByGoogle,
  updateUserAvatar,
  updateUserInfo,
  createMinistry,
  getMinistriesByUserIdWithMemberCount,
  joinMinistryByCode,
  getMinistryDetailsById,
  isUserMinistryAdmin,
  updateUserRolesInMinistry,
  findNextLeaderCandidate,
  transferMinistryLeadership,
  removeUserFromMinistry,
  getAllBaseRoles,
  getUserSkills,
  updateUserSkills,
  countMinistryLeaders,
  findUserById,
  getUserRolesInMinistry,
  createEvent,
  getUpcomingEventsByMinistryIds,
  getEventsByMinistryId,
  getEventDetailsById,
  updateUserEventStatus,
  deleteEvent,
};