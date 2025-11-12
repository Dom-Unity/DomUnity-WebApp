import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Auth.css';

function Login() {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
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

        try {
            // TODO: Implement actual gRPC call to backend
            console.log('Login attempt:', formData);

            // Mock success - navigate to profile
            // In production, check response and store token
            navigate('/profile');
        } catch (err) {
            setError('Login failed. Please check your credentials.');
            console.error('Login error:', err);
        }
    };

    return (
        <main className="auth-container">
            <div className="auth-box">
                <h1 className="logo-text">DomUnity</h1>
                <h2>Вход в DomUnity</h2>
                <p className="subtitle">Добре дошли отново!</p>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="email">Имейл адрес*:</label>
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
                        <label htmlFor="password">Парола*:</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <a href="#forgot" className="forgot-password"><u>Забравена парола?</u></a>

                    <button type="submit" className="btn primary full-width">Вход</button>

                    <div className="no-account">
                        <span>Нямате акаунт?</span>
                    </div>

                    <Link to="/signup" className="btn secondary full-width">Регистрация</Link>
                </form>
            </div>
        </main>
    );
}

export default Login;
