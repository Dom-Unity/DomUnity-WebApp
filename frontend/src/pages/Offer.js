import React, { useState } from 'react';
import './Offer.css';

function Offer() {
    const [activeTab, setActiveTab] = useState('offer');
    const [offerData, setOfferData] = useState({
        phone: '',
        email: '',
        city: 'София',
        numProperties: 1,
        address: '',
        additionalInfo: ''
    });

    const [presentationData, setPresentationData] = useState({
        date: '',
        buildingType: 'Ново строителство',
        phone: '',
        email: '',
        address: '',
        additionalInfo: ''
    });

    const handleOfferChange = (e) => {
        setOfferData({ ...offerData, [e.target.name]: e.target.value });
    };

    const handlePresentationChange = (e) => {
        setPresentationData({ ...presentationData, [e.target.name]: e.target.value });
    };

    const handleOfferSubmit = (e) => {
        e.preventDefault();
        // TODO: Implement gRPC call
        console.log('Offer request:', offerData);
        alert('Офертата е изпратена успешно!');
    };

    const handlePresentationSubmit = (e) => {
        e.preventDefault();
        // TODO: Implement gRPC call
        console.log('Presentation request:', presentationData);
        alert('Заявката за презентация е изпратена успешно!');
    };

    return (
        <main className="offer-page">
            <div className="page-top">
                <h1>Вземи оферта</h1>
            </div>

            <div className="offer-tabs">
                <button
                    className={`tab ${activeTab === 'offer' ? 'active' : ''}`}
                    onClick={() => setActiveTab('offer')}
                >
                    Вземи оферта
                </button>
                <button
                    className={`tab ${activeTab === 'presentation' ? 'active' : ''}`}
                    onClick={() => setActiveTab('presentation')}
                >
                    Заяви презентация
                </button>
            </div>

            <div className="offer-card">
                {activeTab === 'offer' ? (
                    <form className="form-side" onSubmit={handleOfferSubmit}>
                        <h2>Попълни формата</h2>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Телефон *</label>
                                <input type="text" name="phone" value={offerData.phone} onChange={handleOfferChange} required />
                            </div>
                            <div className="form-group">
                                <label>E-mail *</label>
                                <input type="email" name="email" value={offerData.email} onChange={handleOfferChange} required />
                            </div>
                        </div>
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
                                <input type="number" name="numProperties" value={offerData.numProperties} onChange={handleOfferChange} min="1" required />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Адрес *</label>
                            <input type="text" name="address" value={offerData.address} onChange={handleOfferChange} required />
                        </div>
                        <div className="form-group">
                            <label>Допълнителна информация</label>
                            <textarea name="additionalInfo" value={offerData.additionalInfo} onChange={handleOfferChange} rows="4"></textarea>
                        </div>
                        <button type="submit" className="submit-btn">Изпрати</button>
                    </form>
                ) : (
                    <form className="form-side" onSubmit={handlePresentationSubmit}>
                        <h2>Попълни за презентация</h2>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Дата *</label>
                                <input type="date" name="date" value={presentationData.date} onChange={handlePresentationChange} required />
                            </div>
                            <div className="form-group">
                                <label>Тип сграда *</label>
                                <select name="buildingType" value={presentationData.buildingType} onChange={handlePresentationChange}>
                                    <option>Ново строителство</option>
                                    <option>Старо строителство</option>
                                    <option>Комплекс от затворен тип</option>
                                    <option>Друго</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Телефон *</label>
                                <input type="text" name="phone" value={presentationData.phone} onChange={handlePresentationChange} required />
                            </div>
                            <div className="form-group">
                                <label>E-mail *</label>
                                <input type="email" name="email" value={presentationData.email} onChange={handlePresentationChange} required />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Адрес</label>
                            <input type="text" name="address" value={presentationData.address} onChange={handlePresentationChange} />
                        </div>
                        <div className="form-group">
                            <label>Допълнителна информация</label>
                            <textarea name="additionalInfo" value={presentationData.additionalInfo} onChange={handlePresentationChange} rows="4"></textarea>
                        </div>
                        <button type="submit" className="submit-btn">Изпрати</button>
                    </form>
                )}
            </div>
        </main>
    );
}

export default Offer;
