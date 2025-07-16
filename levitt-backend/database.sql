-- levitt-backend/database.sql

-- Limpa as tabelas existentes para permitir a recriação do zero (cuidado ao usar em produção)
DROP TABLE IF EXISTS membros_ministerio, musicas, eventos, ministerios, usuarios CASCADE;

-- Tabela de Usuários
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL, -- Armazenaremos a senha criptografada (hash)
    google_id VARCHAR(255) UNIQUE, -- Para login social com Google
    data_nascimento DATE,
    igreja_local VARCHAR(255),
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Ministérios
CREATE TABLE ministerios (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    lider_id INTEGER NOT NULL,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Chave estrangeira para o líder do ministério
    -- Se o líder for excluído, o ministério não poderá existir sem um líder.
    -- Neste caso, a lógica da aplicação deverá tratar a exclusão de um líder.
    CONSTRAINT fk_lider FOREIGN KEY(lider_id) REFERENCES usuarios(id) ON DELETE RESTRICT
);

-- Tabela de Ligação: Membros e seus Cargos nos Ministérios
CREATE TABLE membros_ministerio (
    usuario_id INTEGER NOT NULL,
    ministerio_id INTEGER NOT NULL,
    cargo VARCHAR(100) NOT NULL, -- Ex: 'Vocalista', 'Líder', 'Guitarrista'
    
    -- Chave primária composta para garantir que um usuário só possa ter um cargo por ministério
    PRIMARY KEY (usuario_id, ministerio_id),
    
    -- Chaves estrangeiras
    CONSTRAINT fk_usuario FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_ministerio FOREIGN KEY(ministerio_id) REFERENCES ministerios(id) ON DELETE CASCADE
);

-- Tabela de Músicas
CREATE TABLE musicas (
    id SERIAL PRIMARY KEY,
    ministerio_id INTEGER NOT NULL, -- A qual ministério esta música pertence
    titulo VARCHAR(255) NOT NULL,
    artista VARCHAR(255) NOT NULL,
    tom VARCHAR(20), -- Ex: 'C', 'G#m'
    bpm INTEGER,
    link_cifra TEXT,
    link_video TEXT,
    link_plataforma TEXT,
    
    CONSTRAINT fk_ministerio FOREIGN KEY(ministerio_id) REFERENCES ministerios(id) ON DELETE CASCADE
);

-- Tabela de Eventos (Escalas)
CREATE TABLE eventos (
    id SERIAL PRIMARY KEY,
    ministerio_id INTEGER NOT NULL, -- A qual ministério este evento pertence
    titulo VARCHAR(255) NOT NULL,
    localizacao VARCHAR(255) NOT NULL,
    data_evento TIMESTAMP WITH TIME ZONE NOT NULL,
    observacoes TEXT,
    
    CONSTRAINT fk_ministerio FOREIGN KEY(ministerio_id) REFERENCES ministerios(id) ON DELETE CASCADE
);

-- Comentários sobre as decisões:
-- ON DELETE CASCADE: Se um ministério for deletado, todos os seus membros, músicas e eventos relacionados são automaticamente removidos. Se um usuário for deletado, sua participação nos ministérios é removida.
-- ON DELETE RESTRICT: Impede que um usuário que é líder de um ministério seja deletado. A aplicação precisará primeiro designar um novo líder antes de permitir a exclusão.
-- senha_hash: NUNCA guarde senhas em texto plano. Usaremos uma biblioteca como `bcrypt` para gerar um "hash" seguro da senha.