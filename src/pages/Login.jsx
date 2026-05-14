import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/store';
import styles from '../styles/Login.module.css';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';


export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const setAuth = useStore((state) => state.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const token = await user.getIdToken();
        
        setAuth(token, user.email, user.displayName || user.email, user.photoURL);
        navigate('/');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName: name });
        
        setIsLogin(true);
        setPassword('');
        setError('Conta criada com sucesso! Faça login.');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>{isLogin ? 'Bem-vindo de volta' : 'Criar Conta'}</h1>
        
        {error && <div className={styles.error}>{error}</div>}

        <form className={styles.form} onSubmit={handleSubmit}>
          {!isLogin && (
            <div className={styles.inputGroup}>
              <label className={styles.label}>Nome Completo</label>
              <input type="text" className={styles.input} value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}

          <div className={styles.inputGroup}>
            <label className={styles.label}>E-mail</label>
            <input type="email" className={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          
          <div className={styles.inputGroup}>
            <label className={styles.label}>Senha</label>
            <input 
              type="password" 
              className={styles.input} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <button type="submit" className={styles.button}>
            {isLogin ? 'Entrar' : 'Registrar'}
          </button>
        </form>

        <p className={styles.toggleText}>
          {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
          {' '}
          <button 
            type="button" 
            className={styles.toggleLink} 
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
          >
            {isLogin ? 'Crie uma agora' : 'Faça login'}
          </button>
        </p>
      </div>
    </div>
  );
}
