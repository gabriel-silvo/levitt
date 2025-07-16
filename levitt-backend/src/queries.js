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

  findOrCreateUserByGoogle: async ({ google_id, email, nome }) => {
    // Tenta encontrar o usuário pelo google_id primeiro
    let user = await db.query('SELECT * FROM usuarios WHERE google_id = $1', [google_id]);
    if (user.rows[0]) {
        return user.rows[0]; // Retorna o usuário se encontrado
    }

    // Se não, tenta encontrar pelo email (caso ele já tenha uma conta local)
    user = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (user.rows[0]) {
        // Se encontrou por email, atualiza com o google_id para vincular as contas
        const updatedUser = await db.query(
            'UPDATE usuarios SET google_id = $1 WHERE email = $2 RETURNING *',
            [google_id, email]
        );
        return updatedUser.rows[0];
    }

    // Se não encontrou de nenhuma forma, cria um novo usuário
    // A senha será nula, pois a autenticação é via Google
    const text = `
        INSERT INTO usuarios(nome, email, google_id, senha_hash)
        VALUES($1, $2, $3, NULL)
        RETURNING *;
    `;
    const values = [nome, email, google_id];
    const newUser = await db.query(text, values);
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
};

// Exportamos as funções para serem usadas em outros lugares
module.exports = userQueries;