import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Header.module.css';

export default function Header() {
    const { isAuthenticated, logout } = useAuth();

    return (
        <header className={styles.siteHeader}>
            <div className={styles.container}>
                <div className={styles.left}>
                    <Link to="/" className={styles.logo}>
                        <img src="/images/logo_image.png" alt="DomUnity Logo" />
                    </Link>
                    <div className={styles.phone}>
                        <a href="tel:+359888440107">+359 88 844 0107</a>
                    </div>
                </div>

                <nav className={styles.nav}>
                    <ul>
                        <li><Link to="/contacts">Контакти</Link></li>
                        <li><a href="#about">За нас</a></li>
                        <li><a href="#services">Услуги</a></li>
                        <li><a href="#blog">Блог</a></li>
                        <li>
                            <Link to="/offer" className={`${styles.btn} ${styles.btnOutline}`}>
                                Оферти
                            </Link>
                        </li>
                        <li>
                            {isAuthenticated ? (
                                <button onClick={logout} className={`${styles.btn} ${styles.btnFilled}`}>
                                    Изход
                                </button>
                            ) : (
                                <Link to="/login" className={`${styles.btn} ${styles.btnFilled}`}>
                                    Профил
                                </Link>
                            )}
                        </li>
                    </ul>
                </nav>
            </div>
        </header>
    );
}
