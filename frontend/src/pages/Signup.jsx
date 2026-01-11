import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';
import { register } from '../services/apiService';

function Signup() {
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
            setError('Паролите не съвпадат');
            return;
        }

        if (formData.password.length < 8) {
            setError('Паролата трябва да е поне 8 символа');
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
                setSuccess('Регистрацията е успешна! Пренасочване...');
                setTimeout(() => navigate('/login'), 2000);
            } else {
                setError(result.message || 'Регистрацията не бе успешна. Опитайте отново.');
            }
        } catch (err) {
            setError('Грешка при регистрация. Опитайте по-късно.');
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

                <h2 className="login-title">Регистрация</h2>
                <p className="login-subtitle">Създайте нов акаунт</p>

                {error && <div style={{ color: 'red', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
                {success && <div style={{ color: 'green', marginBottom: '1rem', textAlign: 'center' }}>{success}</div>}

                <form className="login-form" onSubmit={handleSubmit}>

                    <div className="input-group">
                        <label htmlFor="fullName">Име и фамилия</label>
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
                        <label htmlFor="phone">Телефон</label>
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
                        <small style={{ color: '#666', fontSize: '0.85rem' }}>Минимум 8 символа</small>
                    </div>

                    <div className="input-group">
                        <label htmlFor="confirmPassword">Потвърдете паролата*</label>
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
                        {loading ? 'Зареждане...' : 'Регистрация'}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '15px' }}>
                        <span>Вече имате акаунт? </span>
                        <Link to="/login" style={{ color: '#2f5233', fontWeight: 'bold' }}>Вход</Link>
                    </div>

                </form>

            </div>
        </main>
    );
}

export default Signup;
