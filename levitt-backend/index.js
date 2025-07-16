// levitt-backend/index.js

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const userQueries = require('./src/queries'); // Importando nossas funções do banco de dados

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

    // Se chegou até aqui, o login foi bem-sucedido!
    // PRÓXIMO PASSO FUTURO: Gerar um Token JWT (JSON Web Token) aqui.
    
    // 3. Enviar resposta de sucesso
    res.status(200).json({
      message: 'Login bem-sucedido!',
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
      },
      // token: 'AQUI_VIRÁ_O_TOKEN_JWT' // Descomentar no futuro
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Ocorreu um erro no servidor ao tentar fazer login.' });
  }
});


// Define a porta onde o servidor vai rodar
const PORT = process.env.PORT || 3001;

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}.`);
});