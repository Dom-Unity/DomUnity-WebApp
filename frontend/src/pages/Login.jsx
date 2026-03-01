import React, { useState } from "react";
import "./Login.css";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { login } from '../services/apiService';

function Login() {
    const { t } = useTranslation();
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
                setError(result.message || t('auth.loginError'));
            }
        } catch (err) {
            setError(t('auth.loginNetworkError'));
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

                <h2 className="login-title">{t('auth.loginMainTitle')}</h2>
                <p className="login-subtitle">{t('auth.loginSubtitle')}</p>

                {error && <div style={{ color: 'red', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

                <form className="login-form" onSubmit={handleSubmit}>

                    <div className="input-group">
                        <label htmlFor="email">{t('auth.emailLabel')}</label>
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
                        <label htmlFor="password">{t('auth.passwordLabel')}</label>
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
                        <Link to="/forgottenpassword" style={{ color: '#2f5233', fontWeight: 'bold' }}>{t('auth.forgottenPasswordLink')}</Link>
                    </div>

                    <button type="submit" className="btn-login" disabled={loading}>
                        {loading ? t('auth.btnLoading') : t('auth.btnLogin')}
                    </button>

                    <div className="signup-links">
                        <span>{t('auth.noAccount')}</span>
                        <Link to="/signup">{t('auth.signupLink')}</Link>
                    </div>

                </form>

            </div>
        </main>
    );
}

export default Login;
