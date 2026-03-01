import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./Privacy.css";

export default function Privacy() {
  const { t } = useTranslation();
  return (
    <main className="privacy-container">
      <div className="privacy-box">
        <div className="privacy-logo-wrapper">
          <img
            src="/images/logo_image.png"
            alt="DomUnity Logo"
            className="privacy-logo"
          />
        </div>

        <h1 className="privacy-title">{t('privacy.title')}</h1>
        <p className="privacy-subtitle">
          {t('privacy.subtitle')}
        </p>

        <div className="privacy-content">
          <section className="privacy-section">
            <h2>{t('privacy.sec1Title')}</h2>
            <p>
              {t('privacy.sec1Desc')}
            </p>
          </section>

          <section className="privacy-section">
            <h2>{t('privacy.sec2Title')}</h2>
            <p>
              {t('privacy.sec2Desc')}
            </p>
          </section>

          <section className="privacy-section">
            <h2>{t('privacy.sec3Title')}</h2>
            <ul>
              <li>{t('privacy.sec3Li1')}</li>
              <li>{t('privacy.sec3Li2')}</li>
              <li>{t('privacy.sec3Li3')}</li>
              <li>{t('privacy.sec3Li4')}</li>
              <li>{t('privacy.sec3Li5')}</li>
              <li>{t('privacy.sec3Li6')}</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>{t('privacy.sec4Title')}</h2>
            <ul>
              <li>{t('privacy.sec4Li1')}</li>
              <li>{t('privacy.sec4Li2')}</li>
              <li>{t('privacy.sec4Li3')}</li>
              <li>{t('privacy.sec4Li4')}</li>
              <li>{t('privacy.sec4Li5')}</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>{t('privacy.sec5Title')}</h2>
            <p>
              {t('privacy.sec5Desc')}
            </p>
          </section>

          <section className="privacy-section">
            <h2>{t('privacy.sec6Title')}</h2>
            <p>
              {t('privacy.sec6Desc')}
            </p>
          </section>

          <section className="privacy-section">
            <h2>{t('privacy.sec7Title')}</h2>
            <p>
              {t('privacy.sec7Desc')}
            </p>
          </section>

          <section className="privacy-section">
            <h2>{t('privacy.sec8Title')}</h2>
            <ul>
              <li>{t('privacy.sec8Li1')}</li>
              <li>{t('privacy.sec8Li2')}</li>
              <li>{t('privacy.sec8Li3')}</li>
              <li>{t('privacy.sec8Li4')}</li>
              <li>{t('privacy.sec8Li5')}</li>
              <li>{t('privacy.sec8Li6')}</li>
              <li>{t('privacy.sec8Li7')}</li>
            </ul>
          </section>

          <section className="privacy-section">
            <h2>{t('privacy.sec9Title')}</h2>
            <p>
              {t('privacy.sec9Desc')}
            </p>
          </section>

          <section className="privacy-section">
            <h2>{t('privacy.sec10Title')}</h2>
            <p>
              {t('privacy.sec10Desc')}
            </p>
          </section>

          <section className="privacy-section">
            <h2>{t('privacy.sec11Title')}</h2>
            <p>
              {t('privacy.sec11Desc1')}
              {" "}
              <Link to="/contacts" className="privacy-link">{t('privacy.linkContacts')}</Link>
            </p>
            <p>
              {t('privacy.sec11Desc2')}
              {" "}
              <Link to="/terms" className="privacy-link">{t('privacy.linkTerms')}</Link>
            </p>
          </section>
        </div>

        <div className="privacy-actions">
          <Link to="/" className="privacy-btn privacy-btn--secondary">
            {t('privacy.btnHome')}
          </Link>
          <Link to="/contacts" className="privacy-btn privacy-btn--primary">
            {t('privacy.btnContact')}
          </Link>
        </div>

        <p className="privacy-smallprint">
          {t('privacy.smallprint')}
        </p>
      </div>
    </main>
  );
}