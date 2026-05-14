import { create } from 'zustand';

export const useStore = create((set) => ({
  token: localStorage.getItem('kanban_token') || null,
  username: localStorage.getItem('kanban_username') || null,
  name: localStorage.getItem('kanban_name') || null,
  avatar: localStorage.getItem('kanban_avatar') || null,
  theme: localStorage.getItem('kanban_theme') || 'light', // 'light', 'dark', 'classic'
  modalTask: null,
  
  setModalTask: (task) => set({ modalTask: task }),
  setAuth: (token, username, name, avatar) => {
    localStorage.setItem('kanban_token', token);
    localStorage.setItem('kanban_username', username);
    if(name) localStorage.setItem('kanban_name', name);
    if(avatar) localStorage.setItem('kanban_avatar', avatar);
    set({ token, username, name, avatar });
  },
  
  logout: () => {
    localStorage.removeItem('kanban_token');
    localStorage.removeItem('kanban_username');
    localStorage.removeItem('kanban_name');
    localStorage.removeItem('kanban_avatar');
    set({ token: null, username: null, name: null, avatar: null });
  },

  toggleTheme: () => {
    set((state) => {
      const themes = ['light', 'dark', 'classic'];
      const currentIndex = themes.indexOf(state.theme);
      const newTheme = themes[(currentIndex + 1) % themes.length];
      localStorage.setItem('kanban_theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
      return { theme: newTheme };
    });
  },
  
  setThemeOnLoad: () => {
    const theme = localStorage.getItem('kanban_theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
  }
}));
