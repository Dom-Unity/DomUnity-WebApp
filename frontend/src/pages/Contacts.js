import React, { useState } from 'react';
import './Contacts.css';

function Contacts() {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        message: ''
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // TODO: Implement gRPC call to backend
        console.log('Contact form submission:', formData);
        alert('Съобщението е изпратено успешно!');
        setFormData({ name: '', phone: '', email: '', message: '' });
    };

    return (
        <main className="contact-page">
            <div className="contact-card">
                <div className="contact-info">
                    <h2>Свържете се с нас</h2>

                    <div className="info-row">
                        <h3>Телефон</h3>
                        <p>359 888 440 107<br />359 888 440 107</p>
                    </div>

                    <div className="info-row">
                        <h3>E-mail</h3>
                        <p>info@domunity.bg</p>
                    </div>

                    <div className="info-row">
                        <h3>Адрес</h3>
                        <p>гр. София,<br />ж.к. Младост 1,<br />ул. Примерна №15</p>
                    </div>
                </div>

                <form className="contact-form" onSubmit={handleSubmit}>
                    <h3>Изпратете запитване</h3>

                    <div className="form-group">
                        <label>Име *</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
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
                        />
                    </div>

                    <div className="form-group">
                        <label>Съобщение *</label>
                        <textarea
                            name="message"
                            value={formData.message}
                            onChange={handleChange}
                            required
                            rows="5"
                        ></textarea>
                    </div>

                    <button type="submit" className="submit-btn">Изпрати</button>
                </form>
            </div>
        </main>
    );
}

export default Contacts;
