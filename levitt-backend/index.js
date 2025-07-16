// levitt-backend/index.js

// Importe o jwt no topo do arquivo
const jwt = require('jsonwebtoken');

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const userQueries = require('./src/queries'); // Importando nossas funções do banco de dados

// Cria a aplicação Express
const app = express();

const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const upload = require('./src/middleware/multer');
const authMiddleware = require('./src/middleware/auth');
const cloudinary = require('./src/config/cloudinary');

// Configura os middlewares
app.use(cors());
app.use(express.json());

// --- ROTAS DA API ---

// Rota de teste
app.get('/', (req, res) => {
  res.json({ message: 'Olá! A API do Levitt está funcionando!' });
});

/**
 * ROTA DE REGISTRO DE USUÁRIO
 * Método: POST
 * Corpo da requisição: { nome, email, senha, data_nascimento, igreja_local }
 */
app.post('/register', async (req, res) => {
  const { nome, email, senha, data_nascimento, igreja_local } = req.body;

  // Validação básica
  if (!nome || !email || !senha) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
  }

  try {
    // 1. Verificar se o usuário já existe
    const existingUser = await userQueries.findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Este email já está em uso.' }); // 409 Conflict
    }

    // 2. Criptografar a senha
    const saltRounds = 10; // Fator de custo para o hash
    const senha_hash = await bcrypt.hash(senha, saltRounds);

    // 3. Criar o novo usuário no banco de dados
    const newUser = await userQueries.createUser({
      nome,
      email,
      senha_hash, // Passando a senha criptografada
      data_nascimento,
      igreja_local,
    });

    // 4. Enviar resposta de sucesso
    res.status(201).json({
      message: 'Usuário criado com sucesso!',
      user: newUser, // Retorna os dados do usuário criado (sem a senha)
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
    const user = await userQueries.findUserByEmail(email);
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
        const { sub: google_id, email, name: nome } = ticket.getPayload();

        // 2. Encontra ou cria o usuário em nosso banco de dados
        const user = await userQueries.findOrCreateUserByGoogle({ google_id, email, nome });

        // 3. Gera o nosso próprio token JWT para a nossa aplicação
        const payload = { id: user.id, email: user.email, nome: user.nome };
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
    const updatedUser = await userQueries.updateUserAvatar(req.user.id, imageUrl);

    res.status(200).json({
      message: 'Avatar atualizado com sucesso!',
      user: updatedUser,
    });

  } catch (error) {
    console.error('Erro ao atualizar avatar:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor ao atualizar o avatar.' });
  }
});