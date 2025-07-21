// levitt-backend/src/queries.js

const db = require('./db');
// No futuro, importaremos o bcrypt aqui para lidar com senhas
// const bcrypt = require('bcrypt');

const userQueries = {
  /**
   * Cria um novo usuário no banco de dados.
   * A senha deve ser previamente criptografada com bcrypt.
   */
  createUser: async ({ nome, email, senha_hash, data_nascimento, igreja_local }) => {
    const text = `
      INSERT INTO usuarios(nome, email, senha_hash, data_nascimento, igreja_local)
      VALUES($1, $2, $3, $4, $5)
      RETURNING id, nome, email;
    `;
    const values = [nome, email, senha_hash, data_nascimento, igreja_local];
    const result = await db.query(text, values);
    return result.rows[0];
  },

  /**
   * Encontra um usuário pelo seu email.
   * Essencial para verificar se um usuário já existe ou para o processo de login.
   */
  findUserByEmail: async (email) => {
    const text = 'SELECT * FROM usuarios WHERE email = $1';
    const values = [email];
    const result = await db.query(text, values);
    return result.rows[0];
  },

  findOrCreateUserByGoogle: async ({ google_id, email, nome, imagem_url }) => {
    // Passo 1: Tenta encontrar pelo google_id.
    let user = await db.query('SELECT * FROM usuarios WHERE google_id = $1', [google_id]);
    if (user.rows[0]) {
        return user.rows[0];
    }

    // Passo 2: Se não, tenta encontrar pelo email.
    user = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (user.rows[0]) {
        // Encontrou um usuário existente por email. Vamos vincular a conta.
        const updateQuery = `
            UPDATE usuarios
            SET
                google_id = $1,
                imagem_url = COALESCE(imagem_url, $3) 
            WHERE email = $2
            RETURNING *;
        `;
        // Agora a variável 'imagem_url' existe e pode ser usada aqui.
        const values = [google_id, email, imagem_url];
        const updatedUser = await db.query(updateQuery, values);
        
        return updatedUser.rows[0];
    }

    // Passo 3: Se não encontrou de nenhuma forma, cria um novo usuário.
    const createQuery = `
        INSERT INTO usuarios(nome, email, google_id, senha_hash, imagem_url)
        VALUES($1, $2, $3, NULL, $4)
        RETURNING *;
    `;
    // E aqui também.
    const createValues = [nome, email, google_id, imagem_url];
    const newUser = await db.query(createQuery, createValues);
    return newUser.rows[0];
  },

  updateUserAvatar: async (userId, imageUrl) => {
    const text = `
      UPDATE usuarios
      SET imagem_url = $1
      WHERE id = $2
      RETURNING id, email, nome, imagem_url;
    `;
    const values = [imageUrl, userId];
    const result = await db.query(text, values);
    return result.rows[0];
  },

  updateUserInfo: async (userId, { nome, igreja_local, data_nascimento, telefone }) => {
    const text = `
      UPDATE usuarios
      SET nome = $1, igreja_local = $2, data_nascimento = $3, telefone = $4
      WHERE id = $5
      RETURNING id, email, nome, imagem_url, igreja_local, data_nascimento, telefone;
    `;
    const values = [nome, igreja_local, data_nascimento, telefone, userId];
    const result = await db.query(text, values);
    return result.rows[0];
  },
};

// Exportamos as funções para serem usadas em outros lugares
module.exports = userQueries;