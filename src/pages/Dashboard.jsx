import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, CheckCircle2, Clock, Target, AlertCircle } from 'lucide-react';
import { useStore } from '../store/store';
import styles from '../styles/Dashboard.module.css';

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, completed: 0, overdue: 0, completed7d: 0, chartData: [], upcomingTasks: [] });
  const { token, name, username, setModalTask } = useStore();

  const fetchDashboard = () => {
    fetch('/api/stats', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(console.error);
  };

  useEffect(() => {
    fetchDashboard();
    window.addEventListener('taskSaved', fetchDashboard);
    return () => window.removeEventListener('taskSaved', fetchDashboard);
  }, [token]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const displayName = name || username || 'visitante';

  return (
    <div className={styles.container}>
      <div>
        <h1 className={styles.greeting}>{getGreeting()}, {displayName}! 👋</h1>
        <p className={styles.subtitle}>Aqui está o resumo da sua produtividade.</p>
      </div>
      
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statInfo}>
            <div className={styles.statTitle}>Tarefas Concluídas (7d)</div>
            <div className={`${styles.statValue} ${styles.completed}`}>{stats.completed7d}</div>
          </div>
          <Target size={40} className={styles.statIcon} style={{color: 'var(--success-color)'}} />
        </div>
        <div className={styles.statCard}>
          <div className={styles.statInfo}>
            <div className={styles.statTitle}>Atrasadas</div>
            <div className={`${styles.statValue} ${styles.overdue}`}>{stats.overdue}</div>
          </div>
          <AlertCircle size={40} className={styles.statIcon} style={{color: 'var(--danger-color)'}} />
        </div>
        <div className={styles.statCard}>
          <div className={styles.statInfo}>
            <div className={styles.statTitle}>Total Pendentes</div>
            <div className={styles.statValue}>{stats.total - stats.completed}</div>
          </div>
          <CheckCircle2 size={40} className={styles.statIcon} />
        </div>
      </div>

      <div className={styles.upcomingSection}>
        <h2 className={styles.sectionTitle}>
          <Clock size={20} /> Próximas a Vencer
        </h2>
        {stats.upcomingTasks && stats.upcomingTasks.length > 0 ? (
          <div className={styles.taskList}>
            {stats.upcomingTasks.map(task => {
              const isUrgent = task.due_date && new Date(task.due_date) < new Date(Date.now() + 86400000);
              return (
                <div key={task.id} className={styles.taskItem} onClick={() => setModalTask(task)} style={{cursor: 'pointer'}}>
                  <div className={styles.taskMain}>
                    <span className={styles.taskTitle}>{task.title}</span>
                    <div className={styles.taskMeta}>
                      <span className={`${styles.taskDueDate} ${isUrgent ? styles.urgent : ''}`}>
                        <Calendar size={14} /> 
                        {new Date(task.due_date).toLocaleDateString()}
                      </span>
                      {task.priority === 'high' && <span style={{color: 'var(--danger-color)', fontSize: '0.75rem'}}>Urgente</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>Nenhuma tarefa próxima do vencimento. Tudo tranquilo! 😎</div>
        )}
      </div>

    </div>
  );
}
