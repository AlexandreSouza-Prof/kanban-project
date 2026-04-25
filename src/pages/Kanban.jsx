import { useState, useEffect } from 'react';
import { Search, Plus, Calendar, Trash2 } from 'lucide-react';
import { useStore } from '../store/store';
import styles from '../styles/Kanban.module.css';

const COLUMNS = [
  { id: 'todo', title: 'A Fazer' },
  { id: 'in_progress', title: 'Em Progresso' },
  { id: 'done', title: 'Concluído' }
];

export default function Kanban() {
  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, mine, shared
  const { token, setModalTask, username } = useStore();

  const fetchTasks = async () => {
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await fetch(`/api/tasks${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTasks();
    window.addEventListener('taskSaved', fetchTasks);
    return () => window.removeEventListener('taskSaved', fetchTasks);
  }, [search, token]);

  const handleDragStart = (e, id) => {
    e.dataTransfer.setData('taskId', id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, status) => {
    const id = e.dataTransfer.getData('taskId');
    setTasks(prev => prev.map(t => t.id == id ? { ...t, status } : t));
    await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status })
    });
  };

  const markAsDone = async (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'done' } : t));
    await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status: 'done' })
    });
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;
    await fetch(`/api/tasks/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchTasks();
  };

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={20} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Buscar tarefas..." 
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{display: 'flex', gap: '0.5rem', flex: 1}}>
          <button onClick={() => setFilterType('all')} style={{padding: '0.5rem', borderRadius: 'var(--radius-md)', background: filterType === 'all' ? 'var(--primary-color)' : 'var(--bg-secondary)', color: filterType === 'all' ? '#fff' : 'var(--text-primary)'}}>Todas</button>
          <button onClick={() => setFilterType('mine')} style={{padding: '0.5rem', borderRadius: 'var(--radius-md)', background: filterType === 'mine' ? 'var(--primary-color)' : 'var(--bg-secondary)', color: filterType === 'mine' ? '#fff' : 'var(--text-primary)'}}>Minhas</button>
          <button onClick={() => setFilterType('shared')} style={{padding: '0.5rem', borderRadius: 'var(--radius-md)', background: filterType === 'shared' ? 'var(--primary-color)' : 'var(--bg-secondary)', color: filterType === 'shared' ? '#fff' : 'var(--text-primary)'}}>Compartilhadas</button>
        </div>
        <button className={styles.addButton} onClick={() => setModalTask({})}>
          <Plus size={20} /> Nova Tarefa
        </button>
      </div>

      <div className={styles.board}>
        {COLUMNS.map(col => (
          <div 
            key={col.id} 
            className={styles.column}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            <div className={styles.columnHeader}>
              <span>{col.title}</span>
              <span className={styles.columnCount}>
                {tasks.filter(t => t.status === col.id).length}
              </span>
            </div>
            <div className={styles.columnBody}>
              {tasks.filter(t => t.status === col.id).filter(t => {
                if (filterType === 'all') return true;
                if (filterType === 'mine') return t.owner_name === username || t.user_id === undefined; // user_id is the owner
                if (filterType === 'shared') return t.owner_name !== username && t.user_id !== undefined; // means I am not the owner
                return true;
              }).map(task => {
                const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
                return (
                  <div 
                    key={task.id} 
                    className={styles.card}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                  >
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                       <div className={styles.cardTitle}>{task.title}</div>
                       <div style={{display:'flex', gap:'0.5rem'}}>
                         <button onClick={() => setModalTask(task)} style={{color: 'var(--primary-color)'}}>
                           Editar
                         </button>
                         <button onClick={() => handleDelete(task.id)} style={{color: 'var(--danger-color)'}}>
                           <Trash2 size={16} />
                         </button>
                       </div>
                    </div>
                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.5rem', marginBottom: '0.5rem'}}>
                      {task.tags && task.tags.map(t => (
                        <span key={t.id} style={{fontSize: '0.7rem', backgroundColor: 'var(--primary-color)', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '999px'}}>
                          {t.name}
                        </span>
                      ))}
                    </div>
                    {task.description && <div className={styles.cardDesc}>{task.description}</div>}
                    
                    <div className={styles.cardFooter}>
                      <span className={`${styles.priority} ${styles['priority-' + task.priority]}`}>
                        {task.priority === 'high' ? 'Urgente' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                      </span>
                      {task.due_date && (
                        <span className={`${styles.dueDate} ${isOverdue ? styles.overdue : ''}`}>
                          <Calendar size={14} /> 
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                      
                      <div style={{display: 'flex', alignItems: 'center', marginLeft: 'auto', gap: '0.5rem'}}>
                        {/* Avatar Stack */}
                        <div style={{display: 'flex', flexDirection: 'row-reverse', alignItems: 'center'}}>
                          {task.shared_with && task.shared_with.map((u, i) => (
                            <img key={u.id} src={u.avatar} title={`Compartilhado com ${u.name || u.username}`} alt="avatar" style={{width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--bg-card)', marginLeft: '-8px', zIndex: i}} />
                          ))}
                          <img src={task.owner_avatar || `https://api.dicebear.com/9.x/bottts/svg?seed=${task.owner_name}`} title={`Dono: ${task.owner_name}`} alt="owner" style={{width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--bg-card)', marginLeft: '-8px', zIndex: 100}} />
                        </div>

                        {task.status !== 'done' && (
                          <button onClick={() => markAsDone(task.id)} style={{color: 'var(--success-color)', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid var(--success-color)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)'}}>
                            ✓
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
