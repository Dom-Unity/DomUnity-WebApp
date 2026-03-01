import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import "./Offer.css";
import { requestOffer, requestPresentation } from '../services/apiService';

function Offer() {
    const { t } = useTranslation();
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

    // eslint-disable-next-line no-unused-vars
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const handleOfferSubmit = async (e) => {
        e.preventDefault();
        if (!offerData.agree) {
            setError(t('offer.errorAgree'));
            return;
        }
        setLoading(true);
        setSuccess('');
        setError('');

        try {
            const result = await requestOffer(offerData);
            if (result.success) {
                setSuccess(t('offer.successOffer'));
                setOfferData({ phone: '', email: '', city: 'София', numProperties: 1, address: '', additionalInfo: '', agree: false });
            } else {
                setError(result.message || t('offer.errorSend'));
            }
        } catch (err) {
            setError(t('offer.networkError'));
        } finally {
            setLoading(false);
        }
    };

    const handlePresentationSubmit = async (e) => {
        e.preventDefault();
        if (!presentationData.agree) {
            setError(t('offer.errorAgree'));
            return;
        }
        setLoading(true);
        setSuccess('');
        setError('');

        try {
            const result = await requestPresentation(presentationData);
            if (result.success) {
                setSuccess(t('offer.successPres'));
                setPresentationData({ date: '', buildingType: 'Ново строителство', phone: '', email: '', address: '', additionalInfo: '', agree: false });
            } else {
                setError(result.message || t('offer.errorSend'));
            }
        } catch (err) {
            setError(t('offer.networkError'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="offer-page">

            <div className="page-top">
                <h1>{activeTab === "offer" ? t('offer.tabOffer') : t('offer.tabPresentation')}</h1>
                <p className="page-subtitle">
                    {t('offer.pageSubtitle')}
                </p>
            </div>

            <div className="offer-tabs">
                <button
                    className={`tab ${activeTab === "offer" ? "active" : ""}`}
                    onClick={() => setActiveTab("offer")}
                >
                    {t('offer.tabOffer')}
                </button>

                <button
                    className={`tab ${activeTab === "presentation" ? "active" : ""}`}
                    onClick={() => setActiveTab("presentation")}
                >
                    {t('offer.tabPresentation')}
                </button>
            </div>

            <div className="offer-card">
                {success && <div style={{ color: 'green', marginBottom: '1rem', textAlign: 'center', padding: '10px', background: '#e8f5e9', borderRadius: '8px' }}>{success}</div>}
                {error && <div style={{ color: 'red', marginBottom: '1rem', textAlign: 'center', padding: '10px', background: '#ffebee', borderRadius: '8px' }}>{error}</div>}
                {activeTab === "offer" ? (
                    <form onSubmit={handleOfferSubmit} className="form-side">

                        <div className="form-section-title">{t('offer.contactInfoTitle')}</div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>{t('offer.phoneLabel')}</label>
                                <input
                                    name="phone"
                                    value={offerData.phone}
                                    onChange={handleOfferChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>{t('offer.emailLabel')}</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={offerData.email}
                                    onChange={handleOfferChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-section-title">{t('offer.propertyInfoTitle')}</div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>{t('offer.cityLabel')}</label>
                                <select name="city" value={offerData.city} onChange={handleOfferChange}>
                                    <option value="София">{t('offer.citySofia')}</option>
                                    <option value="Пловдив">{t('offer.cityPlovdiv')}</option>
                                    <option value="Варна">{t('offer.cityVarna')}</option>
                                    <option value="Бургас">{t('offer.cityBurgas')}</option>
                                    <option value="Друг">{t('offer.cityOther')}</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>{t('offer.numPropertiesLabel')}</label>
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
                            <label>{t('offer.addressLabel')}</label>
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
                                {t('offer.agreeOfferLabel')}
                            </label>
                        </div>

                        <button className="submit-btn">{t('offer.btnSubmitOffer')}</button>
                    </form>
                ) : (
                    <form onSubmit={handlePresentationSubmit} className="form-side">

                        <div className="form-section-title">{t('offer.presentationInfoTitle')}</div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>{t('offer.dateLabel')}</label>
                                <input
                                    type="date"
                                    name="date"
                                    value={presentationData.date}
                                    onChange={handlePresentationChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>{t('offer.buildingTypeLabel')}</label>
                                <select
                                    name="buildingType"
                                    value={presentationData.buildingType}
                                    onChange={handlePresentationChange}
                                >
                                    <option value="Ново строителство">{t('offer.buildingTypeNew')}</option>
                                    <option value="Старо строителство">{t('offer.buildingTypeOld')}</option>
                                    <option value="Комплекс от затворен тип">{t('offer.buildingTypeComplex')}</option>
                                    <option value="Друго">{t('offer.buildingTypeOther')}</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-section-title">{t('offer.contactInfoTitlePres')}</div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>{t('offer.phoneLabel')}</label>
                                <input
                                    name="phone"
                                    value={presentationData.phone}
                                    onChange={handlePresentationChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>{t('offer.emailLabel')}</label>
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
                            <label>{t('offer.addressLabelPres')}</label>
                            <input
                                name="address"
                                value={presentationData.address}
                                onChange={handlePresentationChange}
                            />
                        </div>

                        <div className="form-group">
                            <label>{t('offer.additionalInfoLabelPres')}</label>
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
                                {t('offer.agreePresLabel')}
                            </label>
                        </div>

                        <button className="submit-btn">{t('offer.btnSubmitPres')}</button>
                    </form>
                )}
            </div>

        </main>
    );
}

export default Offer;
