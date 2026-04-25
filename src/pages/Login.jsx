import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/store';
import styles from '../styles/Login.module.css';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const setAuth = useStore((state) => state.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const endpoint = isLogin ? '/api/login' : '/api/register';
    const body = isLogin ? { username, password } : { username, password, name, email };
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Erro na requisição');
      }

      if (isLogin) {
        setAuth(data.token, data.username, data.name, data.avatar);
        navigate('/');
      } else {
        setIsLogin(true);
        setUsername('');
        setPassword('');
        setName('');
        setEmail('');
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
            <>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Nome Completo</label>
                <input type="text" className={styles.input} value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>E-mail</label>
                <input type="email" className={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </>
          )}

          <div className={styles.inputGroup}>
            <label className={styles.label}>Nome de Usuário</label>
            <input 
              type="text" 
              className={styles.input} 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required 
            />
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
