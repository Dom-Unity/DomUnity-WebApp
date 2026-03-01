import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './Login.css';
import { register } from '../services/apiService';

function Signup() {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (formData.password !== formData.confirmPassword) {
            setError(t('auth.passwordMismatch'));
            return;
        }

        if (formData.password.length < 8) {
            setError(t('auth.passwordLengthError'));
            return;
        }

        setLoading(true);

        try {
            const result = await register(
                formData.email,
                formData.password,
                formData.fullName,
                formData.phone
            );

            if (result.success) {
                setSuccess(t('auth.signupSuccess'));
                setTimeout(() => navigate('/login'), 2000);
            } else {
                setError(result.message || t('auth.signupError'));
            }
        } catch (err) {
            setError(t('auth.signupNetworkError'));
            console.error('Signup error:', err);
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

                <h2 className="login-title">{t('auth.signupMainTitle')}</h2>
                <p className="login-subtitle">{t('auth.signupSubtitle')}</p>

                {error && <div style={{ color: 'red', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
                {success && <div style={{ color: 'green', marginBottom: '1rem', textAlign: 'center' }}>{success}</div>}

                <form className="login-form" onSubmit={handleSubmit}>

                    <div className="input-group">
                        <label htmlFor="fullName">{t('auth.nameLabel')}</label>
                        <input
                            id="fullName"
                            name="fullName"
                            type="text"
                            value={formData.fullName}
                            onChange={handleChange}
                            disabled={loading}
                        />
                    </div>

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
                        <label htmlFor="phone">{t('auth.phoneLabel')}</label>
                        <input
                            id="phone"
                            name="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={handleChange}
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
                        <small style={{ color: '#666', fontSize: '0.85rem' }}>{t('auth.passwordHint')}</small>
                    </div>

                    <div className="input-group">
                        <label htmlFor="confirmPassword">{t('auth.confirmPasswordLabel')}</label>
                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                            disabled={loading}
                        />
                    </div>

                    <button type="submit" className="btn-login" disabled={loading}>
                        {loading ? t('auth.btnLoading') : t('auth.btnSignup')}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '15px' }}>
                        <span>{t('auth.haveAccount')}</span>
                        <Link to="/login" style={{ color: '#2f5233', fontWeight: 'bold' }}>{t('auth.loginLink')}</Link>
                    </div>

                </form>

            </div>
        </main>
    );
}

export default Signup;
