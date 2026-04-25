import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Usando um novo arquivo para garantir tabelas limpas sem conflitos de lock
const dbPath = path.resolve(__dirname, '../database_v2.sqlite');

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database_v2.');
    
    db.serialize(() => {
      // Tabela de Usuários com Perfil
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        email TEXT,
        avatar TEXT
      )`);

      // Tabela de Categorias Removida (Será tratada como ENUM/Fixa no front/back: work, personal, studies, home)

      // Tabela de Tags Personalizadas
      db.run(`CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`);

      // Tabela de Tarefas
      db.run(`CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        due_date TEXT,
        priority TEXT DEFAULT 'medium',
        category TEXT DEFAULT 'work',
        status TEXT DEFAULT 'todo',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`);

      // Tabela de Relacionamento (Tarefas e Tags)
      db.run(`CREATE TABLE IF NOT EXISTS task_tags (
        task_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (task_id, tag_id),
        FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
      )`);

      // Tabela de Compartilhamentos (Colaboração)
      db.run(`CREATE TABLE IF NOT EXISTS task_shares (
        task_id INTEGER NOT NULL,
        shared_with_user_id INTEGER NOT NULL,
        PRIMARY KEY (task_id, shared_with_user_id),
        FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
        FOREIGN KEY (shared_with_user_id) REFERENCES users (id) ON DELETE CASCADE
      )`);
    });
  }
});
