import { useState, useEffect } from 'react';
import { useStore } from '../store/store';
import styles from '../styles/Kanban.module.css';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, setDoc, addDoc } from 'firebase/firestore';

export default function TaskModal({ task, onClose, onSave }) {
  const isEditing = !!task?.id;
  const [formData, setFormData] = useState({
    title: task?.title || '', 
    description: task?.description || '', 
    due_date: task?.due_date || '', 
    priority: task?.priority || 'medium', 
    category: task?.category || 'work', 
    tags: task?.tags || [],
    shared_with: task?.shared_with || []
  });
  const [tagInput, setTagInput] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const usersCol = collection(db, 'users');
      getDocs(usersCol).then(snapshot => {
        const users = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(u => u.id !== user.uid);
        setAvailableUsers(users);
      }).catch(console.error);
    }
  }, []);

  const toggleShare = (userId) => {
    setFormData(prev => {
      const isShared = prev.shared_with.includes(userId);
      if (isShared) {
        return { ...prev, shared_with: prev.shared_with.filter(id => id !== userId) };
      } else {
        return { ...prev, shared_with: [...prev.shared_with, userId] };
      }
    });
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!tagInput.trim()) return;
      const tName = tagInput.trim().toLowerCase();
      if (!formData.tags.includes(tName)) {
        setFormData(p => ({...p, tags: [...p.tags, tName]}));
      }
      setTagInput('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('O título é obrigatório.');
      return;
    }
    setError('');

    try {
      const user = auth.currentUser;
      const taskData = {
        ...formData,
        owner_id: user.uid,
        owner_name: user.displayName || user.email,
        owner_avatar: user.photoURL || '',
        updated_at: new Date().toISOString()
      };

      if (isEditing) {
        await setDoc(doc(db, 'tasks', task.id), taskData, { merge: true });
      } else {
        taskData.created_at = new Date().toISOString();
        taskData.status = 'todo'; // default status
        await addDoc(collection(db, 'tasks'), taskData);
      }

      if(onSave) onSave();
      if(onClose) onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2 className={styles.modalTitle}>{isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
        {error && <div style={{color: 'white', backgroundColor: 'var(--danger-color)', padding: '0.5rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem'}}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label>Título</label>
            <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          </div>
          <div className={styles.formGroup}>
            <label>Descrição</label>
            <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>
          <div style={{display: 'flex', gap: '1rem'}}>
            <div className={styles.formGroup} style={{flex: 1}}>
              <label>Prazo</label>
              <input type="date" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} />
            </div>
            <div className={styles.formGroup} style={{flex: 1}}>
              <label>Prioridade</label>
              <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Urgente</option>
              </select>
            </div>
            <div className={styles.formGroup} style={{flex: 1}}>
              <label>Categoria</label>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                <option value="work">Trabalho</option>
                <option value="personal">Pessoal</option>
                <option value="studies">Estudos</option>
                <option value="home">Casa</option>
              </select>
            </div>
          </div>
          <div className={styles.formGroup}>
            <label>Tags (Pressione Enter para adicionar)</label>
            <input 
              type="text" 
              placeholder="Ex: reunião, projeto_x" 
              value={tagInput} 
              onChange={e => setTagInput(e.target.value)} 
              onKeyDown={handleAddTag} 
            />
            <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem'}}>
              {formData.tags.map(tagName => (
                <span key={tagName} style={{backgroundColor: 'var(--border-color)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.2rem'}}>
                  {tagName}
                  <button type="button" onClick={() => setFormData(p => ({...p, tags: p.tags.filter(name => name !== tagName)}))} style={{color: 'var(--danger-color)'}}>x</button>
                </span>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Compartilhar com (Opcional)</label>
            <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem', maxHeight: '100px', overflowY: 'auto', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)'}}>
              {availableUsers.length === 0 ? (
                <span style={{color: 'var(--text-secondary)', fontSize: '0.85rem'}}>Nenhum outro usuário encontrado.</span>
              ) : (
                availableUsers.map(user => {
                  const isSelected = formData.shared_with.includes(user.id);
                  return (
                    <div 
                      key={user.id} 
                      onClick={() => toggleShare(user.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.6rem', 
                        borderRadius: 'var(--radius-md)', cursor: 'pointer',
                        backgroundColor: isSelected ? 'var(--primary-color)' : 'var(--bg-secondary)',
                        color: isSelected ? 'white' : 'var(--text-primary)',
                        transition: 'all 0.2s ease',
                        border: '1px solid',
                        borderColor: isSelected ? 'var(--primary-color)' : 'transparent'
                      }}
                    >
                      <img src={user.avatar} alt={user.name} style={{width: 20, height: 20, borderRadius: '50%'}} />
                      <span style={{fontSize: '0.85rem'}}>{user.name || user.username}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className={styles.modalActions}>
            <button type="button" className={styles.btnCancel} onClick={onClose}>Cancelar</button>
            <button type="submit" className={styles.addButton}>Salvar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
