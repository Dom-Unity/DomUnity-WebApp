import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Auth.module.css';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await login(email, password);
            navigate('/');
        } catch (error) {
            // Error handled by AuthContext with toast
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className={styles.container}>
            <div className={styles.box}>
                <img src="/images/logo_image.png" alt="DomUnity Logo" className={styles.logo} />
                <h2>Вход в DomUnity</h2>
                <p className={styles.subtitle}>Добре дошли отново!</p>

                <form onSubmit={handleSubmit}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="email">Имейл адрес*:</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="password">Парола*:</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <a href="#" className={styles.forgotPassword}>
                        <u>Забравена парола?</u>
                    </a>

                    <button type="submit" className={`${styles.btn} ${styles.primary}`} disabled={isLoading}>
                        {isLoading ? 'Влизане...' : 'Вход'}
                    </button>

                    <div className={styles.noAccount}>
                        <span>Нямате акаунт?</span>
                    </div>

                    <Link to="/signup" className={`${styles.btn} ${styles.secondary}`}>
                        Регистрация
                    </Link>
                </form>
            </div>
        </main>
    );
}
