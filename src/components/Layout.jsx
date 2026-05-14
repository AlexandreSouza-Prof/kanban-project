import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, KanbanSquare, Settings, LogOut, Moon, Sun, User, Palette, Plus } from 'lucide-react';
import { useStore } from '../store/store';
import styles from '../styles/Layout.module.css';
import TaskModal from './TaskModal';

export default function Layout() {
  const { username, name, avatar, logout, theme, toggleTheme, modalTask, setModalTask } = useStore();

  const getThemeName = () => {
    if(theme === 'light') return 'Modo Claro';
    if(theme === 'dark') return 'Modo Escuro';
    return 'Modo Clássico';
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Palette;

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <KanbanSquare size={28} />
          <span>KanbanPro</span>
        </div>
        
        <nav className={styles.nav}>
          <NavLink 
            to="/" 
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
            end
          >
            <LayoutDashboard size={20} /> Dashboard
          </NavLink>
          <NavLink 
            to="/kanban" 
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
          >
            <KanbanSquare size={20} /> Minhas Tarefas
          </NavLink>
          <NavLink 
            to="/profile" 
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
          >
            <Settings size={20} /> Configurações
          </NavLink>
        </nav>

        <div className={styles.bottomSection}>
          <button className={styles.actionButton} onClick={toggleTheme}>
            <ThemeIcon size={20} />
            {getThemeName()}
          </button>
          
          <div className={styles.userProfile}>
            <img src={avatar || 'https://via.placeholder.com/40'} alt="Avatar" className={styles.userAvatar} />
            <div className={styles.userInfo}>
              <span className={styles.userName}>{name || username}</span>
              <span className={styles.themeText} style={{cursor:'pointer'}} onClick={logout}>Sair</span>
            </div>
          </div>
        </div>
      </aside>

      <main className={styles.mainContent}>
        <div className={styles.pageContent}>
          <Outlet />
        </div>
        
        {/* FAB Global */}
        <button className={styles.fab} onClick={() => setModalTask({})}>
          <Plus size={24} />
        </button>
      </main>

      {/* Modal Global */}
      {modalTask !== null && (
        <TaskModal 
          task={modalTask} 
          onClose={() => setModalTask(null)} 
          onSave={() => window.dispatchEvent(new Event('taskSaved'))} 
        />
      )}
    </div>
  );
}
