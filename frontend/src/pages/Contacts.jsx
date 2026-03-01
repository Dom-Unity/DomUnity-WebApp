import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './Contacts.css';
import { sendContactForm } from '../services/apiService';

function Contacts() {
    const { t } = useTranslation();
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
                setSuccess(t('contacts.successMsg'));
                setFormData({ name: '', phone: '', email: '', message: '' });
            } else {
                setError(result.message || t('contacts.errorMsg'));
            }
        } catch (err) {
            console.error('Contact form error:', err);
            setError(t('contacts.networkError'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="contact-page">

            <div className="contact-title-block">
                <h1>{t('contacts.pageTitle')}</h1>
                <p>{t('contacts.pageSubtitle')}</p>
            </div>

            <div className="contact-card">

                {/* LEFT SIDE */}
                <div className="contact-info">
                    <h2>{t('contacts.infoTitle')}</h2>

                    <div className="info-row no-icon">
                        <div>
                            <h3>{t('contacts.phoneLabel')}</h3>
                            <p>
                                <a href="tel:+359888440107" className="contact-link">
                                    +359 88 844 0107
                                </a>
                            </p>
                        </div>
                    </div>

                    <div className="info-row no-icon">
                        <div>
                            <h3>{t('contacts.emailLabel')}</h3>
                            <p>
                                <a href="mailto:info@domunity.bg" className="contact-link">
                                    info@domunity.bg
                                </a>
                            </p>
                        </div>
                    </div>

                    <div className="info-row no-icon">
                        <div>
                            <h3>{t('contacts.addressLabel')}</h3>
                            <p>
                                <a
                                    href="https://www.google.com/maps/search/?api=1&query=гр.+София,+ж.к.+Овча+Купел+2,+бул.+Президент+Линкълн+1200"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="contact-link"
                                >
                                    {t('contacts.addressValue')}
                                </a>
                            </p>
                        </div>
                    </div>
                </div>

                <form className="contact-form" onSubmit={handleSubmit}>
                    <h2>{t('contacts.formTitle')}</h2>

                    {success && <div style={{ color: 'green', marginBottom: '1rem' }}>{success}</div>}
                    {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

                    <div className="form-group">
                        <label>{t('contacts.nameInput')}</label>
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
                        <label>{t('contacts.phoneInput')}</label>
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
                        <label>{t('contacts.emailInput')}</label>
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
                        <label>{t('contacts.messageInput')}</label>
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
                        {loading ? t('contacts.btnSubmitting') : t('contacts.btnSubmit')}
                    </button>
                </form>
            </div>

        </main>
    );
}

export default Contacts;
