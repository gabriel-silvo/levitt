// levitt-backend/index.js

// Importe o nanoid no topo
const { customAlphabet } = require('nanoid');
// Importe o jwt no topo do arquivo
const jwt = require('jsonwebtoken');

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const queries = require('./src/queries'); // Importando nossas funções do banco de dados

const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const upload = require('./src/middleware/multer');
const authMiddleware = require('./src/middleware/auth');
const cloudinary = require('./src/config/cloudinary');

// 1. Define o alfabeto: apenas letras maiúsculas e números.
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
// 2. Cria um gerador que usa esse alfabeto e tem um tamanho fixo de 6 caracteres.
const generateInviteCode = customAlphabet(alphabet, 6);

// Cria a aplicação Express
const app = express();

// Configura os middlewares
app.use(cors());
app.use(express.json());

// --- ROTAS DA API ---

// Rota de teste
app.get('/', (req, res) => {
  res.json({ message: 'Olá! A API do Levitt está funcionando!' });
});

/**
 * ROTA DE REGISTRO DE USUÁRIO - VERSÃO ATUALIZADA COM GERAÇÃO DE TOKEN
 */
app.post('/register', async (req, res) => {
  const { nome, email, senha, data_nascimento, igreja_local } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
  }

  try {
    const existingUser = await queries.findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Este email já está em uso.' });
    }

    const saltRounds = 10;
    const senha_hash = await bcrypt.hash(senha, saltRounds);

    const newUser = await queries.createUser({
      nome,
      email,
      senha_hash,
      data_nascimento,
      igreja_local,
    });

    // --- CORREÇÃO PRINCIPAL AQUI ---
    // 1. Gera o payload para o nosso token
    const payload = { 
      id: newUser.id, 
      email: newUser.email, 
      nome: newUser.nome,
      imagem_url: newUser.imagem_url,
      igreja_local: user.igreja_local,
      data_nascimento: user.data_nascimento,
      telefone: user.telefone
    };

    // 2. Assina e cria o token
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    // 3. Envia o token na resposta de sucesso
    res.status(201).json({
      message: 'Usuário criado com sucesso!',
      user: payload,
      token: token, // O frontend agora receberá o token!
    });

  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor ao tentar registrar o usuário.' });
  }
});

/**
 * ROTA DE LOGIN DE USUÁRIO
 * Método: POST
 * Corpo da requisição: { email, senha }
 */
app.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  // Validação básica
  if (!email || !senha) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
  }

  try {
    // 1. Encontrar o usuário pelo email
    const user = await queries.findUserByEmail(email);
    if (!user) {
      // Usamos a mesma mensagem de erro para não informar se o email existe ou não
      return res.status(401).json({ error: 'Email ou senha inválidos.' }); // 401 Unauthorized
    }

    // 2. Comparar a senha fornecida com o hash armazenado no banco
    const isPasswordCorrect = await bcrypt.compare(senha, user.senha_hash);
    if (!isPasswordCorrect) {
      return res.status(401).json({ error: 'Email ou senha inválidos.' });
    }

    // --- LÓGICA DO JWT ---
    // 1. Crie o "payload" - as informações que queremos guardar no token
    const payload = {
      id: user.id,
      email: user.email,
      nome: user.nome,
      imagem_url: user.imagem_url,
      igreja_local: user.igreja_local,
      data_nascimento: user.data_nascimento,
      telefone: user.telefone
    };

    // 2. Assine o token com o segredo do .env
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1d' } // Token expira em 1 dia
    );

    // 3. Envie o token na resposta
    res.status(200).json({
      message: 'Login bem-sucedido!',
      token: token, // Enviando o token para o frontend
      user: payload,
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor ao tentar fazer login.' });
  }
});

/**
 * ROTA DE LOGIN COM GOOGLE
 * Método: POST
 * Corpo: { token } (token JWT fornecido pelo Google)
 */
app.post('/auth/google-login', async (req, res) => {
    const { token } = req.body;
    try {
        // 1. Verifica o token do Google recebido do frontend
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const { sub: google_id, email, name: nome, picture: imagem_url } = ticket.getPayload();

        // 2. Encontra ou cria o usuário em nosso banco de dados
        const user = await queries.findOrCreateUserByGoogle({ google_id, email, nome, imagem_url });

        // 3. Gera o nosso próprio token JWT para a nossa aplicação
        const payload = {
          id: user.id,
          email: user.email,
          nome: user.nome,
          imagem_url: user.imagem_url,
          igreja_local: user.igreja_local,
          data_nascimento: user.data_nascimento,
          telefone: user.telefone
        };
        const appToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

        // 4. Envia nosso token de volta para o frontend
        res.status(200).json({
            message: 'Login com Google bem-sucedido!',
            token: appToken,
            user: payload,
        });

    } catch (error) {
        console.error("Erro no login com Google:", error);
        res.status(401).json({ error: 'Falha na autenticação com Google.' });
    }
});

// Define a porta onde o servidor vai rodar
const PORT = process.env.PORT || 3001;

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}.`);
});

/**
 * ROTA PARA ATUALIZAR O AVATAR DO USUÁRIO
 * Método: PUT
 * Rota protegida por autenticação JWT
 * Corpo: FormData com um campo 'avatar' contendo o arquivo da imagem
 */
app.put('/api/users/me/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo de imagem enviado.' });
    }

    // O Multer nos dá o arquivo em 'req.file.buffer'.
    // Precisamos convertê-lo para um formato que o Cloudinary entenda.
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    let dataURI = 'data:' + req.file.mimetype + ';base64,' + b64;

    // 1. Envia a imagem para o Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'levitt-avatars', // Salva numa pasta específica no Cloudinary
    });

    // 2. Pega a URL segura da imagem retornada pelo Cloudinary
    const imageUrl = result.secure_url;

    // 3. Atualiza o banco de dados com a nova URL do avatar
    // O 'req.user.id' vem do nosso authMiddleware que decodificou o token
    const updatedUser = await queries.updateUserAvatar(req.user.id, imageUrl);

    res.status(200).json({
      message: 'Avatar atualizado com sucesso!',
      user: updatedUser,
    });

  } catch (error) {
    console.error('Erro ao atualizar avatar:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor ao atualizar o avatar.' });
  }
});

/**
 * ROTA PARA ATUALIZAR AS INFORMAÇÕES DO USUÁRIO
 * Método: PUT
 * Rota protegida por autenticação JWT
 */
app.put('/api/users/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id; // Pega o ID do usuário a partir do token
    const userData = req.body; // Pega os novos dados do corpo da requisição

    const updatedUser = await queries.updateUserInfo(userId, userData);

    // Precisamos gerar um novo token com as informações atualizadas
    const payload = {
      id: updatedUser.id,
      email: updatedUser.email,
      nome: updatedUser.nome,
      imagem_url: updatedUser.imagem_url,
      igreja_local: updatedUser.igreja_local,
      data_nascimento: updatedUser.data_nascimento,
      telefone: updatedUser.telefone
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.status(200).json({
      message: 'Informações atualizadas com sucesso!',
      user: payload,
      token: token // Enviamos um novo token com os dados atualizados
    });
  } catch (error) {
    console.error('Erro ao atualizar informações do usuário:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});

/**
 * ROTA PARA DELETAR A CONTA DO USUÁRIO
 * Método: DELETE
 * Rota protegida por autenticação JWT
 */
app.delete('/api/users/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    await queries.deleteUserById(userId);
    res.status(200).json({ message: 'Conta deletada com sucesso.' });
  } catch (error) {
    console.error('Erro ao deletar conta:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});

/**
 * ROTA PARA BUSCAR DADOS DO DASHBOARD (HOMEPAGE)
 * Método: GET
 * Rota protegida por autenticação JWT
 */
app.get('/api/dashboard', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Buscar os ministérios do usuário
    const ministries = await queries.getMinistriesByUserIdWithMemberCount(userId);

    // 2. Preparar para buscar os eventos
    const ministryIds = ministries.map(m => m.id);
    
    // 3. Buscar os próximos eventos desses ministérios
    const events = await queries.getUpcomingEventsByMinistryIds(ministryIds);

    // 4. Enviar os dados consolidados para o frontend
    res.status(200).json({ ministries, events });

  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});

/**
 * ROTA PARA CRIAR UM NOVO MINISTÉRIO
 * Método: POST
 * Corpo: { titulo }
 */
app.post('/api/ministries', authMiddleware, async (req, res) => {
  // Agora recebemos um objeto com os dados
  const ministryData = req.body;
  const creatorId = req.user.id;

  if (!ministryData.titulo || ministryData.titulo.trim() === '') {
    return res.status(400).json({ error: 'O título do ministério é obrigatório.' });
  }

  try {
    const inviteCode = generateInviteCode();
    const fullMinistryData = { ...ministryData, codigo_convite: inviteCode };

    const newMinistry = await queries.createMinistry(fullMinistryData, creatorId);
    res.status(201).json(newMinistry);
  } catch (error) {
    // ...
  }
});

app.post('/api/ministries/join', authMiddleware, async (req, res) => {
  const { inviteCode } = req.body;
  const userId = req.user.id;

  if (!inviteCode) {
    return res.status(400).json({ error: 'O código de convite é obrigatório.' });
  }

  try {
    const result = await queries.joinMinistryByCode(userId, inviteCode);
    res.status(200).json(result);
  } catch (error) {
    // Retorna o erro específico que a query gerou (ex: "Código inválido")
    res.status(400).json({ error: error.message });
  }
});

/**
 * ROTA PARA BUSCAR OS DETALHES DE UM MINISTÉRIO ESPECÍFICO
 * Método: GET
 * Parâmetro: /:id (o ID do ministério)
 */
app.get('/api/ministries/:id', authMiddleware, async (req, res) => {
  try {
    const ministryId = req.params.id;
    const requesterId = req.user.id; // ID do usuário logado
    const ministryDetails = await queries.getMinistryDetailsById(ministryId, requesterId);
    res.status(200).json(ministryDetails);
  } catch (error) {
    if (error.message.includes('Acesso negado')) {
      return res.status(403).json({ error: error.message }); // 403 Forbidden
    }
    if (error.message.includes('não encontrado')) {
      return res.status(404).json({ error: error.message }); // 404 Not Found
    }
    console.error('Erro ao buscar detalhes do ministério:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});

/**
 * ROTA PARA ATUALIZAR OS CARGOS DE UM MEMBRO
 * Método: PUT
 * Parâmetros: /:ministryId/members/:memberId
 * Corpo: { roles: ['Novo Cargo 1', 'Novo Cargo 2'] }
 */
app.put('/api/ministries/:ministryId/members/:memberId', authMiddleware, async (req, res) => {
  try {
    const { ministryId, memberId } = req.params;
    const { roles } = req.body;
    const requesterId = req.user.id;
    // --- NOVA REGRA DE NEGÓCIO ---
    const currentRoles = await queries.getUserRolesInMinistry(memberId, ministryId);
    const isCurrentlyLeader = currentRoles.includes('Líder');
    const willBeLeader = req.body.roles.includes('Líder');

    // Verificação de Permissão: O requisitante é líder?
    const isAdmin = await queries.isUserMinistryAdmin(requesterId, ministryId);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Acesso negado. Você não é administrador ou líder deste ministério.' });
    }

    // Se ele é líder atualmente, mas não será mais...
    if (isCurrentlyLeader && !willBeLeader) {
      const leaderCount = await queries.countMinistryLeaders(ministryId);
      if (leaderCount <= 1) {
        return res.status(400).json({ error: 'Não é possível remover o cargo do único líder. Promova outro membro primeiro.' });
      }
    }

    await queries.updateUserRolesInMinistry(memberId, ministryId, roles);
    res.status(200).json({ message: 'Cargos atualizados com sucesso.' });
  } catch (error) {
    console.error('Erro ao atualizar cargos:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});

/**
 * ROTA PARA TRANSFERIR A LIDERANÇA DE UM MINISTÉRIO
 * Método: POST
 * Corpo: { newLeaderId }
 */
app.post('/api/ministries/:ministryId/transfer-leadership', authMiddleware, async (req, res) => {
  try {
    const { ministryId } = req.params;
    const { newLeaderId } = req.body;
    const requesterId = req.user.id;

    // 1. Verifica se o requisitante é o líder atual
    const currentLeaderRoles = await queries.getUserRolesInMinistry(requesterId, ministryId);
    if (!currentLeaderRoles.includes('Líder')) {
      return res.status(403).json({ error: 'Acesso negado. Apenas o líder atual pode transferir a liderança.' });
    }
    
    // Garante que o líder não está tentando transferir para si mesmo
    if (parseInt(requesterId, 10) === parseInt(newLeaderId, 10)) {
        return res.status(400).json({ error: 'Você já é o líder deste ministério.' });
    }

    // 2. Executa a transferência
    await queries.transferMinistryLeadership(ministryId, requesterId, newLeaderId);
    
    res.status(200).json({ message: 'Liderança transferida com sucesso.' });
  } catch (error) {
    console.error('Erro ao transferir liderança:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});

/**
 * ROTA PARA REMOVER UM MEMBRO DE UM MINISTÉRIO
 * Método: DELETE
 * Parâmetros: /:ministryId/members/:memberId
 */
app.delete('/api/ministries/:ministryId/members/:memberId', authMiddleware, async (req, res) => {
  try {
    const { ministryId, memberId } = req.params;
    const requesterId = req.user.id;

    // --- LÓGICA DE PERMISSÃO (Continua a mesma) ---
    const isAdmin = await queries.isUserMinistryAdmin(requesterId, ministryId);
    if (!isAdmin && requesterId !== parseInt(memberId)) {
      return res.status(403).json({ error: 'Acesso negado. Permissão insuficiente.' });
    }

    // --- LÓGICA DE NEGÓCIO REMOVIDA DAQUI ---
    // Toda a inteligência de sucessão de liderança agora está
    // encapsulada dentro da função 'removeUserFromMinistry'.
    
    // Simplesmente chamamos a função e confiamos que ela fará o trabalho certo.
    const result = await queries.removeUserFromMinistry(memberId, ministryId);
    
    // Retornamos a mensagem de sucesso que a função nos deu.
    res.status(200).json(result);

  } catch (error) {
    // A rota agora também retornará as mensagens de erro específicas da query
    // (ex: "Você é o único líder. Por favor, promova outro membro...").
    console.error('Erro na rota de remoção de membro:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Rota para buscar a lista mestra de todos os cargos
app.get('/api/roles', authMiddleware, async (req, res) => {
  try {
    const roles = await queries.getAllBaseRoles();
    res.status(200).json(roles);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar cargos.' });
  }
});

// Rota para buscar as habilidades do usuário logado
app.get('/api/users/me/skills', authMiddleware, async (req, res) => {
  try {
    const skills = await queries.getUserSkills(req.user.id);
    res.status(200).json(skills);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar habilidades do usuário.' });
  }
});

// Rota para buscar as habilidades de um usuário específico pelo ID
app.get('/api/users/:userId/skills', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const skills = await queries.getUserSkills(userId);
    res.status(200).json(skills);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar habilidades do usuário.' });
  }
});

// Rota para atualizar as habilidades do usuário logado
app.put('/api/users/me/skills', authMiddleware, async (req, res) => {
  try {
    const { skillIds } = req.body; // Espera um array de IDs: [1, 5, 8]
    await queries.updateUserSkills(req.user.id, skillIds);
    res.status(200).json({ message: 'Habilidades atualizadas.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar habilidades.' });
  }
});

/**
 * ROTA PARA CRIAR UM NOVO EVENTO PARA UM MINISTÉRIO
 * Método: POST
 * Parâmetro: /:ministryId/events
 */
app.post('/api/ministries/:ministryId/events', authMiddleware, async (req, res) => {
  try {
    const { ministryId } = req.params;
    const eventData = req.body;
    const requesterId = req.user.id;

    // Verificação de Permissão: O requisitante é líder?
    const isAdmin = await queries.isUserMinistryAdmin(requesterId, ministryId);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem criar eventos.' });
    }

    if (!eventData.titulo || !eventData.data_evento || !eventData.localizacao) {
      return res.status(400).json({ error: 'Preencha todos os campos obrigatórios!' });
    }

    const newEvent = await queries.createEvent(eventData, ministryId, requesterId);
    res.status(201).json(newEvent);

  } catch (error) {
    console.error('Erro ao criar evento:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor.' });
  }
});

app.get('/api/ministries/:ministryId/events', authMiddleware, async (req, res) => {
  try {
    const { ministryId } = req.params;
    const events = await queries.getEventsByMinistryId(ministryId);
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar eventos.' });
  }
});

// Rota para buscar os detalhes de um evento
app.get('/api/events/:eventId', authMiddleware, async (req, res) => {
  try {
    const eventDetails = await queries.getEventDetailsById(req.params.eventId);
    res.status(200).json(eventDetails);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Rota para um usuário confirmar/recusar presença (RSVP)
app.post('/api/events/:eventId/rsvp', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body; // 'Confirmado' ou 'Recusado'
    const userId = req.user.id;
    const { eventId } = req.params;
    const updatedRsvp = await queries.updateUserEventStatus(userId, eventId, status);
    res.status(200).json(updatedRsvp);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar status de participação.' });
  }
});

// Rota para deletar um evento (apenas para admins do ministério)
app.delete('/api/events/:eventId', authMiddleware, async (req, res) => {
  try {
    // (Lógica de verificação de admin do ministério a ser adicionada aqui)
    await queries.deleteEvent(req.params.eventId);
    res.status(200).json({ message: 'Evento deletado com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar evento.' });
  }
});