import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, CheckCircle2, Clock, Target, AlertCircle } from 'lucide-react';
import { useStore } from '../store/store';
import styles from '../styles/Dashboard.module.css';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, completed: 0, overdue: 0, completed7d: 0, chartData: [], upcomingTasks: [] });
  const { name, username, setModalTask } = useStore();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'tasks'),
      where('owner_id', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const total = tasks.length;
      const completed = tasks.filter(t => t.status === 'done').length;
      
      const now = new Date();
      const overdue = tasks.filter(t => {
        if (t.status === 'done') return false;
        if (!t.due_date) return false;
        return new Date(t.due_date) < now;
      }).length;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const completed7d = tasks.filter(t => {
        if (t.status !== 'done') return false;
        if (!t.updated_at) return false;
        return new Date(t.updated_at) >= sevenDaysAgo;
      }).length;

      const upcomingTasks = tasks
        .filter(t => {
          if (t.status === 'done') return false;
          if (!t.due_date) return false;
          return new Date(t.due_date) >= now;
        })
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
        .slice(0, 5);

      setStats({ total, completed, overdue, completed7d, chartData: [], upcomingTasks });
    });

    return () => unsubscribe();
  }, []);

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
