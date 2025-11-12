import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Auth.css';

function Signup() {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
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

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        try {
            // TODO: Implement actual gRPC call to backend
            console.log('Signup attempt:', formData);

            // Mock success - navigate to login
            navigate('/login');
        } catch (err) {
            setError('Registration failed. Please try again.');
            console.error('Signup error:', err);
        }
    };

    return (
        <main className="auth-container">
            <div className="auth-box">
                <h1 className="logo-text">DomUnity</h1>
                <h2>Създайте акаунт в DomUnity</h2>
                <p className="subtitle">Присъединете се към нашата общност!</p>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="fullName">Име и фамилия:</label>
                        <input
                            id="fullName"
                            name="fullName"
                            type="text"
                            value={formData.fullName}
                            onChange={handleChange}
                        />
                        <small>Минимум 5 символа</small>
                    </div>

                    <div className="input-group">
                        <label htmlFor="email">Email*:</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="phone">Телефонен номер:</label>
                        <input
                            id="phone"
                            name="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="password">Парола:</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                        <small>Главна, малка буква на латиница, число, минимум 8 символа</small>
                    </div>

                    <div className="input-group">
                        <label htmlFor="confirmPassword">Потвърдете паролата:</label>
                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <button type="submit" className="btn primary full-width">Регистрация</button>

                    <div className="has-account">
                        <span>Вече имате акаунт?</span>
                    </div>

                    <Link to="/login" className="btn secondary full-width">Вход</Link>
                </form>
            </div>
        </main>
    );
}

export default Signup;
