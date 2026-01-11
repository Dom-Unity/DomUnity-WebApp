import React, { useState } from 'react';
import './Contacts.css';
import { sendContactForm } from '../services/apiService';

function Contacts() {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        message: ''
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccess('');
        setError('');

        try {
            const result = await sendContactForm(
                formData.name,
                formData.phone,
                formData.email,
                formData.message
            );

            if (result.success) {
                setSuccess('Съобщението е изпратено успешно!');
                setFormData({ name: '', phone: '', email: '', message: '' });
            } else {
                setError(result.message || 'Грешка при изпращане. Моля, опитайте отново.');
            }
        } catch (err) {
            console.error('Contact form error:', err);
            setError('Грешка при изпращане. Моля, опитайте отново по-късно.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="contact-page">

            <div className="contact-title-block">
                <h1>Свържете се с нас</h1>
                <p>Наш екип ще отговори на вашето запитване до 24 часа.</p>
            </div>

            <div className="contact-card">

                {/* LEFT SIDE */}
                <div className="contact-info">
                    <h2>Контактна информация</h2>

                    <div className="info-row no-icon">
                        <div>
                            <h3>Телефон</h3>
                            <p>
                                <a href="tel:+359888440107" className="contact-link">
                                    +359 88 844 0107
                                </a>
                            </p>
                        </div>
                    </div>

                    <div className="info-row no-icon">
                        <div>
                            <h3>E-mail</h3>
                            <p>
                                <a href="mailto:info@domunity.bg" className="contact-link">
                                    info@domunity.bg
                                </a>
                            </p>
                        </div>
                    </div>

                    <div className="info-row no-icon">
                        <div>
                            <h3>Адрес</h3>
                            <p>
                                <a
                                    href="https://www.google.com/maps/search/?api=1&query=гр.+София,+ж.к.+Овча+Купел+2,+бул.+Президент+Линкълн+1200"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="contact-link"
                                >
                                    гр. София,
                                    ж.к. Овча Купел 2,
                                    бул. Президент Линкълн 1200
                                </a>
                            </p>
                        </div>
                    </div>
                </div>

                <form className="contact-form" onSubmit={handleSubmit}>
                    <h2>Изпратете запитване</h2>

                    {success && <div style={{ color: 'green', marginBottom: '1rem' }}>{success}</div>}
                    {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

                    <div className="form-group">
                        <label>Име *</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label>Телефон *</label>
                        <input
                            type="text"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label>E-mail *</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label>Съобщение *</label>
                        <textarea
                            name="message"
                            value={formData.message}
                            onChange={handleChange}
                            rows="5"
                            required
                            disabled={loading}
                        ></textarea>
                    </div>

                    <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? 'Изпращане...' : 'Изпрати'}
                    </button>
                </form>
            </div>

        </main>
    );
}

export default Contacts;
