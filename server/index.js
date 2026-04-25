import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
// Servir arquivos estáticos para os avatares
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = process.env.PORT || 3001;
const JWT_SECRET = 'super-secret-key-kanban-2026';

// Garantir que a pasta uploads existe
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configurar Multer para upload de imagens
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- ROTAS DE AUTENTICAÇÃO E PERFIL ---

app.post('/api/register', async (req, res) => {
  const { username, password, name, email } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Faltam dados.' });
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    // DiceBear padrão se não tiver avatar
    const avatar = `https://api.dicebear.com/9.x/bottts/svg?seed=${username}`;

    db.run('INSERT INTO users (username, password, name, email, avatar) VALUES (?, ?, ?, ?, ?)', 
      [username, hashedPassword, name, email, avatar], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Usuário já existe' });
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ message: 'Conta criada' });
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(400).json({ error: 'Credenciais inválidas' });
    
    try {
      if (await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, username: user.username, avatar: user.avatar, name: user.name });
      } else {
        res.status(400).json({ error: 'Credenciais inválidas' });
      }
    } catch {
      res.status(500).json({ error: 'Erro no servidor' });
    }
  });
});

app.get('/api/profile', authenticateToken, (req, res) => {
  db.get('SELECT id, username, name, email, avatar FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(user);
  });
});

app.put('/api/profile', authenticateToken, (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Nome e email são obrigatórios.' });

  db.run('UPDATE users SET name = ?, email = ? WHERE id = ?', [name, email, req.user.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Profile updated' });
  });
});

app.post('/api/profile/avatar', authenticateToken, upload.single('avatar'), (req, res) => {
  let avatarUrl = '';
  if (req.file) {
    avatarUrl = `/uploads/${req.file.filename}`;
  } else if (req.body.promptUrl) {
    avatarUrl = req.body.promptUrl;
  } else {
    return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
  }

  db.run('UPDATE users SET avatar = ? WHERE id = ?', [avatarUrl, req.user.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ avatar: avatarUrl });
  });
});

app.get('/api/users', authenticateToken, (req, res) => {
  db.all('SELECT id, username, name, avatar FROM users WHERE id != ?', [req.user.id], (err, users) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(users);
  });
});

// --- ROTAS DE TAGS ---

app.get('/api/tags', authenticateToken, (req, res) => {
  db.all('SELECT * FROM tags WHERE user_id = ?', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/users', authenticateToken, (req, res) => {
  db.all('SELECT id, username, name, avatar FROM users WHERE id != ?', [req.user.id], (err, users) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(users);
  });
});

app.post('/api/tags', authenticateToken, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome da tag é obrigatório' });
  
  db.run('INSERT INTO tags (user_id, name) VALUES (?, ?)', [req.user.id, name], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name });
  });
});

// --- ROTAS DE TAREFAS (COM TAGS) ---

app.get('/api/tasks', authenticateToken, (req, res) => {
  const { search } = req.query;
  let query = `
    SELECT tasks.*, users.avatar as owner_avatar, users.name as owner_name 
    FROM tasks 
    JOIN users ON tasks.user_id = users.id 
    WHERE (tasks.user_id = ? OR tasks.id IN (SELECT task_id FROM task_shares WHERE shared_with_user_id = ?))
  `;
  let params = [req.user.id, req.user.id];

  if (search) {
    query += ' AND (tasks.title LIKE ? OR tasks.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  query += ' ORDER BY tasks.created_at DESC';

  db.all(query, params, (err, tasks) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Buscar tags para todas as tarefas
    db.all('SELECT task_tags.task_id, tags.id, tags.name FROM task_tags JOIN tags ON tags.id = task_tags.tag_id', [], (err, tagsData) => {
      if (err) return res.status(500).json({ error: err.message });
      
      db.all('SELECT task_shares.task_id, users.id, users.name, users.avatar FROM task_shares JOIN users ON users.id = task_shares.shared_with_user_id', [], (err, sharesData) => {
        if (err) return res.status(500).json({ error: err.message });

        const tasksWithTags = tasks.map(task => {
          return {
            ...task,
            tags: tagsData.filter(t => t.task_id === task.id).map(t => ({ id: t.id, name: t.name })),
            shared_with: sharesData.filter(s => s.task_id === task.id).map(s => ({ id: s.id, name: s.name, avatar: s.avatar }))
          };
        });
        res.json(tasksWithTags);
      });
    });
  });
});

app.post('/api/tasks', authenticateToken, (req, res) => {
  const { title, description, due_date, priority, category, status, tags, shared_with } = req.body;
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    const sql = `INSERT INTO tasks (user_id, title, description, due_date, priority, category, status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [req.user.id, title, description || '', due_date || null, priority || 'medium', category || 'work', status || 'todo'];

    db.run(sql, params, function(err) {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: err.message });
      }
      
      const taskId = this.lastID;
      if (tags && tags.length > 0) {
        const stmt = db.prepare('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)');
        tags.forEach(tagId => {
          stmt.run([taskId, tagId]);
        });
        stmt.finalize();
      }
      
      if (shared_with && shared_with.length > 0) {
        const stmtShare = db.prepare('INSERT INTO task_shares (task_id, shared_with_user_id) VALUES (?, ?)');
        shared_with.forEach(userId => stmtShare.run([taskId, userId]));
        stmtShare.finalize();
      }
      
      db.run('COMMIT', () => {
        res.status(201).json({ id: taskId, title, status });
      });
    });
  });
});

app.put('/api/tasks/:id', authenticateToken, (req, res) => {
  const { title, description, due_date, priority, category, status, shared_with } = req.body;
  const taskId = req.params.id;
  
  const sql = `UPDATE tasks SET 
               title = COALESCE(?, title),
               description = COALESCE(?, description),
               due_date = COALESCE(?, due_date),
               priority = COALESCE(?, priority),
               category = COALESCE(?, category),
               status = COALESCE(?, status)
               WHERE id = ? AND (user_id = ? OR id IN (SELECT task_id FROM task_shares WHERE shared_with_user_id = ?))`;
               
  db.run(sql, [title, description, due_date, priority, category, status, taskId, req.user.id, req.user.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    if (shared_with !== undefined) {
      db.run('DELETE FROM task_shares WHERE task_id = ?', [taskId], (err) => {
        if (!err && shared_with.length > 0) {
          const stmtShare = db.prepare('INSERT INTO task_shares (task_id, shared_with_user_id) VALUES (?, ?)');
          shared_with.forEach(userId => stmtShare.run([taskId, userId]));
          stmtShare.finalize();
        }
      });
    }
    
    res.json({ message: 'Updated' });
  });
});

app.delete('/api/tasks/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Deleted successfully' });
  });
});

app.get('/api/stats', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const statsQuery = `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN status != 'done' AND due_date IS NOT NULL AND due_date < date('now') THEN 1 ELSE 0 END) as overdue FROM tasks WHERE user_id = ?`;
  const chartQuery = `SELECT date(due_date) as date, COUNT(*) as count FROM tasks WHERE user_id = ? AND status = 'done' AND due_date >= date('now', '-7 days') GROUP BY date(due_date) ORDER BY date(due_date) ASC`;
  const recentCompletedQuery = `SELECT COUNT(*) as completed_7d FROM tasks WHERE user_id = ? AND status = 'done' AND due_date >= date('now', '-7 days')`;
  const upcomingQuery = `SELECT * FROM tasks WHERE user_id = ? AND status != 'done' AND due_date IS NOT NULL AND due_date >= date('now') ORDER BY due_date ASC LIMIT 5`;

  db.get(statsQuery, [userId], (err, stats) => {
    if (err) return res.status(500).json({ error: err.message });
    db.all(chartQuery, [userId], (err, chartData) => {
      if (err) return res.status(500).json({ error: err.message });
      db.get(recentCompletedQuery, [userId], (err, recent) => {
        if (err) return res.status(500).json({ error: err.message });
        db.all(upcomingQuery, [userId], (err, upcomingTasks) => {
          if (err) return res.status(500).json({ error: err.message });
          
          res.json({
            total: stats.total || 0,
            completed: stats.completed || 0,
            overdue: stats.overdue || 0,
            completed7d: recent.completed_7d || 0,
            chartData,
            upcomingTasks
          });
        });
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`);
});
