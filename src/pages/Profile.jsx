import { useState, useEffect } from 'react';
import { useStore } from '../store/store';
import styles from '../styles/Profile.module.css';
import { LogOut } from 'lucide-react';
import { db, auth, storage } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';

export default function Profile() {
  const { token, name, username, avatar, logout, setAuth } = useStore();
  const [profile, setProfile] = useState(null);
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      getDoc(userRef).then(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile(data);
          setNameInput(data.name || user.displayName || '');
          setEmailInput(data.email || user.email || '');
        } else {
          setProfile({ name: user.displayName, email: user.email, avatar: user.photoURL });
          setNameInput(user.displayName || '');
          setEmailInput(user.email || '');
        }
      }).catch(console.error);
    }
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const user = auth.currentUser;
      let newAvatar = avatar;

      if (file) {
        const storageRef = ref(storage, `avatars/${user.uid}`);
        await uploadBytes(storageRef, file);
        newAvatar = await getDownloadURL(storageRef);
      } else if (prompt) {
        newAvatar = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt + ' avatar portrait')}?width=256&height=256&nologo=true`;
      }

      await setDoc(doc(db, 'users', user.uid), {
        name: nameInput,
        email: emailInput,
        avatar: newAvatar
      }, { merge: true });

      await updateProfile(user, { displayName: nameInput, photoURL: newAvatar });

      setAuth(token, user.email, nameInput, newAvatar);
      alert('Perfil atualizado com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!profile) return <div>Carregando...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.avatarContainer}>
          <img src={previewUrl || avatar || profile.avatar || 'https://via.placeholder.com/120'} alt="Avatar" className={styles.avatar} />
        </div>
        <div className={styles.info}>
          <div className={styles.name}>{name || profile.name || username}</div>
          <div className={styles.email}>{profile.email || 'Sem e-mail cadastrado'}</div>
        </div>
        <form className={styles.actions} onSubmit={handleSaveProfile} style={{width: '100%', gap: '1.5rem'}}>
          
          <div className={styles.uploadGroup}>
            <label>Nome Completo</label>
            <input type="text" className={styles.input} value={nameInput} onChange={e => setNameInput(e.target.value)} required />
          </div>
          
          <div className={styles.uploadGroup}>
            <label>E-mail</label>
            <input type="email" className={styles.input} value={emailInput} onChange={e => setEmailInput(e.target.value)} required />
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', margin: '1rem 0' }}></div>
          
          <div className={styles.uploadGroup}>
            <label>Nova Foto de Perfil (Arquivo)</label>
            <input type="file" className={styles.input} onChange={e => {
              const f = e.target.files[0];
              setFile(f);
              if (f) setPreviewUrl(URL.createObjectURL(f));
            }} />
          </div>
          
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>OU</div>
          
          <div className={styles.uploadGroup}>
            <label>Gerar Avatar via IA (Prompt)</label>
            <input 
              type="text" 
              className={styles.input} 
              placeholder="Ex: um robô futurista em neon azul" 
              value={prompt} 
              onChange={e => setPrompt(e.target.value)} 
            />
            <small style={{color: 'var(--text-secondary)', fontSize: '0.75rem'}}>A IA irá gerar uma imagem única baseada no seu texto.</small>
          </div>
          
          <button type="submit" className={styles.button} disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar Perfil Completo'}
          </button>
        </form>
        
        <button className={`${styles.button} ${styles.buttonDanger}`} onClick={logout} style={{width: '100%'}}>
          <LogOut size={20} style={{marginRight: '0.5rem', verticalAlign: 'middle'}}/>
          Sair da Conta
        </button>
      </div>
    </div>
  );
}
