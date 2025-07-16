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

  // TODO: Adicionar mais funções aqui conforme necessário
  // Ex: createMinisterio, addMemberToMinisterio, createMusica, etc.
};

// Exportamos as funções para serem usadas em outros lugares
module.exports = userQueries;