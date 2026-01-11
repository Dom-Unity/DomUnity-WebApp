import React, { useState } from "react";
import "./Offer.css";
import { requestOffer, requestPresentation } from '../services/apiService';

function Offer() {
    const [activeTab, setActiveTab] = useState("offer");

    const [offerData, setOfferData] = useState({
        phone: "",
        email: "",
        city: "София",
        numProperties: 1,
        address: "",
        additionalInfo: "",
        agree: false
    });

    const [presentationData, setPresentationData] = useState({
        date: "",
        buildingType: "Ново строителство",
        phone: "",
        email: "",
        address: "",
        additionalInfo: "",
        agree: false
    });

    const handleOfferChange = (e) => {
        const { name, value, type, checked } = e.target;
        setOfferData({ ...offerData, [name]: type === "checkbox" ? checked : value });
    };

    const handlePresentationChange = (e) => {
        const { name, value, type, checked } = e.target;
        setPresentationData({ ...presentationData, [name]: type === "checkbox" ? checked : value });
    };

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const handleOfferSubmit = async (e) => {
        e.preventDefault();
        if (!offerData.agree) {
            setError("Трябва да приемете политиката за поверителност.");
            return;
        }
        setLoading(true);
        setSuccess('');
        setError('');

        try {
            const result = await requestOffer(offerData);
            if (result.success) {
                setSuccess('Офертата е изпратена успешно!');
                setOfferData({ phone: '', email: '', city: 'София', numProperties: 1, address: '', additionalInfo: '', agree: false });
            } else {
                setError(result.message || 'Грешка при изпращане.');
            }
        } catch (err) {
            setError('Грешка при изпращане. Опитайте по-късно.');
        } finally {
            setLoading(false);
        }
    };

    const handlePresentationSubmit = async (e) => {
        e.preventDefault();
        if (!presentationData.agree) {
            setError("Трябва да приемете политиката за поверителност.");
            return;
        }
        setLoading(true);
        setSuccess('');
        setError('');

        try {
            const result = await requestPresentation(presentationData);
            if (result.success) {
                setSuccess('Заявката за презентация е изпратена успешно!');
                setPresentationData({ date: '', buildingType: 'Ново строителство', phone: '', email: '', address: '', additionalInfo: '', agree: false });
            } else {
                setError(result.message || 'Грешка при изпращане.');
            }
        } catch (err) {
            setError('Грешка при изпращане. Опитайте по-късно.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="offer-page">

            <div className="page-top">
                <h1>{activeTab === "offer" ? "Вземи оферта" : "Заяви презентация"}</h1>
                <p className="page-subtitle">
                    Попълнете формата и наш консултант ще се свърже с вас до 24 часа.
                </p>
            </div>

            <div className="offer-tabs">
                <button
                    className={`tab ${activeTab === "offer" ? "active" : ""}`}
                    onClick={() => setActiveTab("offer")}
                >
                    Вземи оферта
                </button>

                <button
                    className={`tab ${activeTab === "presentation" ? "active" : ""}`}
                    onClick={() => setActiveTab("presentation")}
                >
                    Заяви презентация
                </button>
            </div>

            <div className="offer-card">
                {success && <div style={{ color: 'green', marginBottom: '1rem', textAlign: 'center', padding: '10px', background: '#e8f5e9', borderRadius: '8px' }}>{success}</div>}
                {error && <div style={{ color: 'red', marginBottom: '1rem', textAlign: 'center', padding: '10px', background: '#ffebee', borderRadius: '8px' }}>{error}</div>}
                {activeTab === "offer" ? (
                    <form onSubmit={handleOfferSubmit} className="form-side">

                        <div className="form-section-title">Информация за контакт</div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Телефон *</label>
                                <input
                                    name="phone"
                                    value={offerData.phone}
                                    onChange={handleOfferChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>E-mail *</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={offerData.email}
                                    onChange={handleOfferChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-section-title">Информация за имота</div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Град *</label>
                                <select name="city" value={offerData.city} onChange={handleOfferChange}>
                                    <option>София</option>
                                    <option>Пловдив</option>
                                    <option>Варна</option>
                                    <option>Бургас</option>
                                    <option>Друг</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Брой обекти *</label>
                                <input
                                    type="number"
                                    min="1"
                                    name="numProperties"
                                    value={offerData.numProperties}
                                    onChange={handleOfferChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Адрес *</label>
                            <input
                                name="address"
                                value={offerData.address}
                                onChange={handleOfferChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Допълнителна информация</label>
                            <textarea
                                name="additionalInfo"
                                value={offerData.additionalInfo}
                                onChange={handleOfferChange}
                            ></textarea>
                        </div>

                        <div className="checkbox-group">
                            <input
                                type="checkbox"
                                id="agree-offer"
                                name="agree"
                                checked={offerData.agree}
                                onChange={handleOfferChange}
                            />
                            <label htmlFor="agree-offer">
                                Съгласен съм с политиката за поверителност *
                            </label>
                        </div>

                        <button className="submit-btn">Изпрати</button>
                    </form>
                ) : (
                    <form onSubmit={handlePresentationSubmit} className="form-side">

                        <div className="form-section-title">Информация за презентация</div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Дата *</label>
                                <input
                                    type="date"
                                    name="date"
                                    value={presentationData.date}
                                    onChange={handlePresentationChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Тип сграда *</label>
                                <select
                                    name="buildingType"
                                    value={presentationData.buildingType}
                                    onChange={handlePresentationChange}
                                >
                                    <option>Ново строителство</option>
                                    <option>Старо строителство</option>
                                    <option>Комплекс от затворен тип</option>
                                    <option>Друго</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-section-title">Контактна информация</div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Телефон *</label>
                                <input
                                    name="phone"
                                    value={presentationData.phone}
                                    onChange={handlePresentationChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>E-mail *</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={presentationData.email}
                                    onChange={handlePresentationChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Адрес</label>
                            <input
                                name="address"
                                value={presentationData.address}
                                onChange={handlePresentationChange}
                            />
                        </div>

                        <div className="form-group">
                            <label>Допълнителна информация</label>
                            <textarea
                                name="additionalInfo"
                                value={presentationData.additionalInfo}
                                onChange={handlePresentationChange}
                            ></textarea>
                        </div>

                        <div className="checkbox-group">
                            <input
                                type="checkbox"
                                id="agree-presentation"
                                name="agree"
                                checked={presentationData.agree}
                                onChange={handlePresentationChange}
                            />
                            <label htmlFor="agree-presentation">
                                Съгласен съм с политиката за поверителност *
                            </label>
                        </div>

                        <button className="submit-btn">Заяви презентация</button>
                    </form>
                )}
            </div>

        </main>
    );
}

export default Offer;
