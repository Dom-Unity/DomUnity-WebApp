import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./Home.css";

function Home() {
    const { t } = useTranslation();
    return (
        <main className="main home-main">
            <section className="hero">
                <div className="hero-inner">
                    <div className="hero-text">
                        <img
                            src="/images/logo_image.png"
                            alt="DomUnity Logo"
                            className="hero-logo"
                        />
                        <h1 dangerouslySetInnerHTML={{ __html: t('home.heroTitle') }}></h1>
                        <p>
                            {t('home.heroSubtitle')}
                        </p>

                        <div className="hero-buttons">
                            <Link to="/offer" className="btn secondary">
                                {t('home.btnOffer')}
                            </Link>
                            <Link to="/login" className="btn primary">
                                {t('home.btnLogin')}
                            </Link>
                        </div>

                        <div className="hero-highlights">
                            <div className="hero-highlight">
                                <span className="value">{t('home.highlight1Value')}</span>
                                <span className="label">{t('home.highlight1Label')}</span>
                            </div>
                            <div className="hero-highlight">
                                <span className="value">{t('home.highlight2Value')}</span>
                                <span className="label">{t('home.highlight2Label')}</span>
                            </div>
                            <div className="hero-highlight">
                                <span className="value">{t('home.highlight3Value')}</span>
                                <span className="label">{t('home.highlight3Label')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="section about" id="about">
                <div className="section-header">
                    <h2>{t('home.aboutTitle')}</h2>
                    <p>
                        {t('home.aboutSubtitle')}
                    </p>
                </div>

                <div className="about-grid">
                    <div className="about-card">
                        <h3>{t('home.aboutCard1Title')}</h3>
                        <p>
                            {t('home.aboutCard1Desc')}
                        </p>
                        <ul>
                            <li>{t('home.aboutCard1Bullet1')}</li>
                            <li>{t('home.aboutCard1Bullet2')}</li>
                            <li>{t('home.aboutCard1Bullet3')}</li>
                        </ul>
                    </div>

                    <div className="about-card">
                        <h3>{t('home.aboutCard2Title')}</h3>
                        <p>
                            {t('home.aboutCard2Desc')}
                        </p>
                        <ul>
                            <li>{t('home.aboutCard2Bullet1')}</li>
                            <li>{t('home.aboutCard2Bullet2')}</li>
                            <li>{t('home.aboutCard2Bullet3')}</li>
                        </ul>
                    </div>
                </div>
            </section>

            <section className="section services" id="services">
                <div className="section-header">
                    <h2>{t('home.servicesTitle')}</h2>
                    <p>
                        {t('home.servicesSubtitle')}
                    </p>
                </div>

                <div className="services-grid">
                    <Link to="/services?tab=admin" className="service-card service-card--link">
                        <img src="/images/service_admin.png" alt={t('home.serviceAdminTitle')} />
                        <h3>{t('home.serviceAdminTitle')}</h3>
                        <p>{t('home.serviceAdminDesc')}</p>
                    </Link>

                    <Link to="/services?tab=finance" className="service-card service-card--link">
                        <img src="/images/service_finance.png" alt={t('home.serviceFinanceTitle')} />
                        <h3>{t('home.serviceFinanceTitle')}</h3>
                        <p>{t('home.serviceFinanceDesc')}</p>
                    </Link>

                    <Link to="/services?tab=maintenance" className="service-card service-card--link">
                        <img src="/images/service_maintenance.png" alt={t('home.serviceMaintenanceTitle')} />
                        <h3>{t('home.serviceMaintenanceTitle')}</h3>
                        <p>{t('home.serviceMaintenanceDesc')}</p>
                    </Link>

                    <Link to="/services?tab=cleaning" className="service-card service-card--link">
                        <img src="/images/service_cleaning.png" alt={t('home.serviceCleaningTitle')} />
                        <h3>{t('home.serviceCleaningTitle')}</h3>
                        <p>{t('home.serviceCleaningDesc')}</p>
                    </Link>
                </div>
            </section>

            <section className="section how-it-works">
                <div className="section-header">
                    <h2>{t('home.howItWorksTitle')}</h2>
                    <p>{t('home.howItWorksSubtitle')}</p>
                </div>

                <div className="steps-grid">
                    <div className="step-card">
                        <span className="step-number">1</span>
                        <h3>{t('home.step1Title')}</h3>
                        <p>
                            {t('home.step1Desc')}
                        </p>
                    </div>
                    <div className="step-card">
                        <span className="step-number">2</span>
                        <h3>{t('home.step2Title')}</h3>
                        <p>
                            {t('home.step2Desc')}
                        </p>
                    </div>
                    <div className="step-card">
                        <span className="step-number">3</span>
                        <h3>{t('home.step3Title')}</h3>
                        <p>
                            {t('home.step3Desc')}
                        </p>
                    </div>
                </div>
            </section>

            <section className="section advantages">
                <div className="advantages-inner">
                    <div className="advantages-text">
                        <h2>{t('home.advantagesTitle')}</h2>
                        <p>
                            {t('home.advantagesDesc')}
                        </p>

                        <ul className="advantages-list">
                            <li>{t('home.advBullet1')}</li>
                            <li>{t('home.advBullet2')}</li>
                            <li>{t('home.advBullet3')}</li>
                            <li>{t('home.advBullet4')}</li>
                        </ul>
                    </div>

                    <div className="advantages-side">
                        <div className="advantages-box">
                            <h3>{t('home.advBoxTitle')}</h3>
                            <p>
                                {t('home.advBoxDesc')}
                            </p>
                            <div className="adv-buttons">
                                <Link to="/offer" className="btn primary">
                                    {t('home.btnRequestOffer')}
                                </Link>
                                <Link to="/contacts" className="btn secondary">
                                    {t('home.btnContacts')}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default Home;