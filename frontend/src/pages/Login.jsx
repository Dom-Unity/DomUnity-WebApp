import React, { useState } from "react";
import "./Login.css";
import { useNavigate, Link } from "react-router-dom";
import { login } from '../services/apiService';

function Login() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await login(formData.email, formData.password);

            if (result.success) {
                navigate('/profile');
            } else {
                setError(result.message || 'Грешка при вход. Проверете данните си.');
            }
        } catch (err) {
            setError('Грешка при вход. Опитайте по-късно.');
            console.error('Login error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="login-container">
            <div className="login-box">

                <div className="login-logo-wrapper">
                    <img
                        src="/images/logo_image.png"
                        alt="DomUnity Logo"
                        className="login-logo"
                    />
                </div>

                <h2 className="login-title">Вход в DomUnity</h2>
                <p className="login-subtitle">Добре дошли отново</p>

                {error && <div style={{ color: 'red', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

                <form className="login-form" onSubmit={handleSubmit}>

                    <div className="input-group">
                        <label htmlFor="email">Имейл адрес*</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="password">Парола*</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="login-links">
                        <a href="#forgot">Забравена парола?</a>
                    </div>

                    <button type="submit" className="btn-login" disabled={loading}>
                        {loading ? 'Зареждане...' : 'Влез'}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '15px' }}>
                        <span>Нямате акаунт? </span>
                        <Link to="/signup" style={{ color: '#2f5233', fontWeight: 'bold' }}>Регистрация</Link>
                    </div>

                </form>

            </div>
        </main>
    );
}

export default Login;
