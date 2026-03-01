import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "flag-icons/css/flag-icons.min.css";
import "./Header.css";

function Header() {
  const { t, i18n } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const servicesRef = useRef(null);
  const langRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (servicesRef.current && !servicesRef.current.contains(e.target)) {
        setServicesOpen(false);
      }
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const closeMobileMenu = () => {
    setMenuOpen(false);
    setServicesOpen(false);
    setLangOpen(false);
  };

  return (
    <header className={`header ${scrolled ? "header--scrolled" : ""}`}>
      <div className="header__container">
        <Link to="/" className="header__logo" onClick={closeMobileMenu}>
          <img src="/images/logo_image.png" alt="DomUnity Logo" />
        </Link>

        {/* DESKTOP NAV */}
        <nav className="header__nav">
          <div className="header__search">
            <input type="text" placeholder={t('header.search')} />
          </div>

          <Link to="/contacts">{t('header.contacts')}</Link>
          <Link to="/offer">{t('header.offers')}</Link>

          <div className="nav-dropdown" ref={servicesRef}>
            <button
              className="nav-dropdown__trigger"
              onClick={() => setServicesOpen((v) => !v)}
              type="button"
            >
              {t('header.services')} ▾
            </button>

            {servicesOpen && (
              <div className="nav-dropdown__menu">
                <Link to="/services?tab=admin" onClick={() => setServicesOpen(false)}>
                  {t('header.adminMgt')}
                </Link>
                <Link to="/services?tab=finance" onClick={() => setServicesOpen(false)}>
                  {t('header.finance')}
                </Link>
                <Link to="/services?tab=maintenance" onClick={() => setServicesOpen(false)}>
                  {t('header.maintenance')}
                </Link>
                <Link to="/services?tab=cleaning" onClick={() => setServicesOpen(false)}>
                  {t('header.cleaning')}
                </Link>
              </div>
            )}
          </div>

          <Link to="/residents">{t('header.admin')}</Link>
        </nav>

        {/* RIGHT SIDE */}
        <div className="header__right">
          <div className="header__buttons">
            <div className="nav-dropdown" ref={langRef} style={{ marginRight: '15px', zIndex: 100 }}>
              <button
                className="nav-dropdown__trigger"
                onClick={() => setLangOpen((v) => !v)}
                type="button"
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '0', fontSize: '1.2rem', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
              >
                {i18n.resolvedLanguage === 'bg' ? <span className="fi fi-bg"></span> : <span className="fi fi-gb"></span>} ▾
              </button>

              {langOpen && (
                <div className="nav-dropdown__menu nav-dropdown__menu--lang" style={{ minWidth: 'max-content', padding: '0.5rem 0', zIndex: 100 }}>
                  <button
                    onClick={() => { i18n.changeLanguage('bg'); setLangOpen(false); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '0.5rem 1rem', width: '100%', textAlign: 'left', fontSize: '1rem', fontWeight: i18n.resolvedLanguage === 'bg' ? 'bold' : 'normal' }}
                  >
                    <span className="fi fi-bg"></span> BG
                  </button>
                  <button
                    onClick={() => { i18n.changeLanguage('en'); setLangOpen(false); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '0.5rem 1rem', width: '100%', textAlign: 'left', fontSize: '1rem', fontWeight: i18n.resolvedLanguage === 'en' ? 'bold' : 'normal' }}
                  >
                    <span className="fi fi-gb"></span> EN
                  </button>
                </div>
              )}
            </div>
            <Link to="/offer" className="btn-offer">
              {t('header.offers')}
            </Link>
            <Link to="/login" className="btn-profile">
              {t('header.profile')}
            </Link>
          </div>

          <button
            type="button"
            className={`hamburger ${menuOpen ? "open" : ""}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Отвори меню"
            aria-expanded={menuOpen}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>

      {/* MOBILE MENU (rendered ONLY when open) */}
      {menuOpen && (
        <div className="mobile-menu">
          <div className="mobile-search">
            <input type="text" placeholder={t('header.search')} />
          </div>

          <Link to="/contacts" onClick={closeMobileMenu}>
            {t('header.contacts')}
          </Link>

          <div className="mobile-dropdown">
            <button
              type="button"
              className="mobile-dropdown__trigger"
              onClick={() => setServicesOpen((v) => !v)}
            >
              {t('header.services')} ▾
            </button>

            {servicesOpen && (
              <div className="mobile-dropdown__menu">
                <Link to="/services?tab=admin" onClick={closeMobileMenu}>
                  {t('header.adminMgt')}
                </Link>
                <Link to="/services?tab=finance" onClick={closeMobileMenu}>
                  {t('header.finance')}
                </Link>
                <Link to="/services?tab=maintenance" onClick={closeMobileMenu}>
                  {t('header.maintenance')}
                </Link>
                <Link to="/services?tab=cleaning" onClick={closeMobileMenu}>
                  {t('header.cleaning')}
                </Link>
              </div>
            )}
          </div>

          <a href="#about" onClick={closeMobileMenu}>
            {t('header.about')}
          </a>

          <hr />

          <Link to="/offer" onClick={closeMobileMenu}>
            {t('header.offers')}
          </Link>
          <Link to="/login" onClick={closeMobileMenu}>
            {t('header.profile')}
          </Link>

          <div className="mobile-dropdown" style={{ margin: 'auto auto 0 auto', width: 'fit-content', position: 'relative' }}>
            <button
              type="button"
              className="mobile-dropdown__trigger"
              onClick={() => setLangOpen((v) => !v)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '1.2rem', padding: '8px 16px', background: 'rgba(255, 255, 255, 0.9)', border: '1px solid rgba(47, 82, 51, 0.3)', borderRadius: '12px', cursor: 'pointer', color: '#2f5233' }}
            >
              {i18n.resolvedLanguage === 'bg' ? <span className="fi fi-bg"></span> : <span className="fi fi-gb"></span>} ▾
            </button>

            {langOpen && (
              <div className="mobile-dropdown__menu" style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px', background: '#fff', border: '2px solid #2f5233', borderRadius: '12px', boxShadow: '0 -6px 16px rgba(47, 82, 51, 0.25)', zIndex: 60, marginBottom: '10px' }}>
                <button
                  onClick={() => { i18n.changeLanguage('bg'); closeMobileMenu(); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 1rem', fontSize: '1.2rem', display: 'flex', gap: '8px', color: '#2f5233', fontWeight: i18n.resolvedLanguage === 'bg' ? 'bold' : 'normal', width: '100%' }}
                >
                  <span className="fi fi-bg"></span> BG
                </button>
                <div style={{ height: '1px', width: '100%', background: 'rgba(47, 82, 51, 0.18)', margin: '4px 0' }}></div>
                <button
                  onClick={() => { i18n.changeLanguage('en'); closeMobileMenu(); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 1rem', fontSize: '1.2rem', display: 'flex', gap: '8px', color: '#2f5233', fontWeight: i18n.resolvedLanguage === 'en' ? 'bold' : 'normal', width: '100%' }}
                >
                  <span className="fi fi-gb"></span> EN
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;