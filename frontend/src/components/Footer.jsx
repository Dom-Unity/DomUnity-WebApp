import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./Footer.css";

const Footer = () => {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState(null);

  const FAQ = [
    {
      q: t('footer.faqQ1'),
      a: t('footer.faqA1')
    },
    {
      q: t('footer.faqQ2'),
      a: t('footer.faqA2')
    },
    {
      q: t('footer.faqQ3'),
      a: t('footer.faqA3')
    },
    {
      q: t('footer.faqQ4'),
      a: t('footer.faqA4')
    }
  ];

  const toggleFaq = (idx) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <footer className="footer">
      <div className="footer__container">
        {/* NEWSLETTER */}
        <div className="footer__newsletter">
          <h2>{t('footer.newsletterTitle')}</h2>

          <form
            className="footer__newsletter-form"
            onSubmit={(e) => {
              e.preventDefault();
              // Тук за реална система: POST към backend / newsletter service
              alert(t('footer.newsletterAlert'));
            }}
          >
            <input type="email" placeholder={t('footer.newsletterPlaceholder')} required />
            <button type="submit">{t('footer.newsletterBtn')}</button>
          </form>
        </div>

        {/* BOTTOM AREA */}
        <div className="footer__bottom-area">
          {/* CONTACTS */}
          <div className="footer__contacts">
            <h3>{t('footer.contactsTitle')}</h3>
            <ul>
              <li>
                <a href="tel:+359888440107">+359 88 844 0107</a>
              </li>
              <li>
                <a href="mailto:bobovlahov@gmail.com">bobovlahov@gmail.com</a>
              </li>
              <li>
                {t('footer.contactAddress1')}<br />
                {t('footer.contactAddress2')}
              </li>
            </ul>

            <div className="footer__socials">
              <a
                href="https://www.facebook.com/profile.php?id=61582683208565"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
              >
                <img src="/images/facebook_logo.png" alt="Facebook" />
              </a>

              <a
                href="https://www.instagram.com/dom_unity/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
              >
                <img src="/images/instagram_logo.png" alt="Instagram" />
              </a>
            </div>
          </div>

          {/* LINKS */}
          <div className="footer__links">
            <h3>{t('footer.policiesTitle')}</h3>
            <ul>
              <li>
                <Link to="/terms" className="footer-link">
                  {t('footer.policyTerms')}
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="footer-link">
                  {t('footer.policyPrivacy')}
                </Link>
              </li>
              <li>
                <Link to="/contacts" className="footer-link">
                  {t('footer.policyContact')}
                </Link>
              </li>
            </ul>
          </div>

          {/* FAQ */}
          <div className="footer__faq">
            <h3>{t('footer.faqTitle')}</h3>

            <div className="faq-list">
              {FAQ.map((item, idx) => {
                const isOpen = openIndex === idx;
                return (
                  <div key={item.q} className={`faq-item ${isOpen ? "is-open" : ""}`}>
                    <button
                      type="button"
                      className="faq-question"
                      onClick={() => toggleFaq(idx)}
                      aria-expanded={isOpen}
                    >
                      <span>{item.q}</span>
                      <span className="faq-icon">{isOpen ? "−" : "+"}</span>
                    </button>

                    {isOpen && <div className="faq-answer">{item.a}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="footer__bottom">
        <p>{t('footer.bottomText')}</p>
      </div>
    </footer>
  );
};

export default Footer;