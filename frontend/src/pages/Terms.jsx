import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./Terms.css";

export default function Terms() {
  const { t } = useTranslation();
  return (
    <main className="terms-container">
      <div className="terms-box">
        <div className="terms-logo-wrapper">
          <img
            src="/images/logo_image.png"
            alt="DomUnity Logo"
            className="terms-logo"
          />
        </div>

        <h1 className="terms-title">{t('terms.title')}</h1>
        <p className="terms-subtitle">
          {t('terms.subtitle')}
        </p>

        <div className="terms-content">
          <section className="terms-section">
            <h2>{t('terms.sec1Title')}</h2>
            <p>
              {t('terms.sec1Desc')}
            </p>
          </section>

          <section className="terms-section">
            <h2>{t('terms.sec2Title')}</h2>
            <ul>
              <li><strong>{t('terms.sec2Li1User')}</strong>{t('terms.sec2Li1Desc')}</li>
              <li><strong>{t('terms.sec2Li2Admin')}</strong>{t('terms.sec2Li2Desc')}</li>
              <li><strong>{t('terms.sec2Li3Building')}</strong>{t('terms.sec2Li3Desc')}</li>
              <li><strong>{t('terms.sec2Li4Profile')}</strong>{t('terms.sec2Li4Desc')}</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2>{t('terms.sec3Title')}</h2>
            <p>
              {t('terms.sec3Desc')}
            </p>
          </section>

          <section className="terms-section">
            <h2>{t('terms.sec4Title')}</h2>
            <p>
              {t('terms.sec4Desc')}
            </p>
          </section>

          <section className="terms-section">
            <h2>{t('terms.sec5Title')}</h2>
            <ul>
              <li>{t('terms.sec5Li1')}</li>
              <li>{t('terms.sec5Li2')}</li>
              <li>{t('terms.sec5Li3')}</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2>{t('terms.sec6Title')}</h2>
            <p>
              {t('terms.sec6Desc')}
            </p>
          </section>

          <section className="terms-section">
            <h2>{t('terms.sec7Title')}</h2>
            <p>
              {t('terms.sec7Desc1')}
            </p>
            <p>
              <Link to="/privacy" className="terms-link">{t('terms.sec7Desc2')}</Link>
            </p>
          </section>

          <section className="terms-section">
            <h2>{t('terms.sec8Title')}</h2>
            <p>
              {t('terms.sec8Desc')}
            </p>
          </section>

          <section className="terms-section">
            <h2>{t('terms.sec9Title')}</h2>
            <p>
              {t('terms.sec9Desc')}
              {" "}
              <Link to="/contacts" className="terms-link">{t('terms.linkContacts')}</Link>
            </p>
          </section>
        </div>

        <div className="terms-actions">
          <Link to="/" className="terms-btn terms-btn--secondary">
            {t('terms.btnHome')}
          </Link>
          <Link to="/contacts" className="terms-btn terms-btn--primary">
            {t('terms.btnContact')}
          </Link>
        </div>

        <p className="terms-smallprint">
          {t('terms.smallprint')}
        </p>
      </div>
    </main>
  );
}