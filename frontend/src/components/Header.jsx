import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "flag-icons/css/flag-icons.min.css";
import "./Header.css";

function Header() {
  const { t, i18n } = useTranslation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [desktopServicesOpen, setDesktopServicesOpen] = useState(false);
  const [desktopLangOpen, setDesktopLangOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [mobileLangOpen, setMobileLangOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const servicesRef = useRef(null);
  const langRef = useRef(null);
  const mobileServicesRef = useRef(null);
  const mobileLangRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (servicesRef.current && !servicesRef.current.contains(e.target)) {
        setDesktopServicesOpen(false);
      }

      if (langRef.current && !langRef.current.contains(e.target)) {
        setDesktopLangOpen(false);
      }

      if (mobileServicesRef.current && !mobileServicesRef.current.contains(e.target)) {
        setMobileServicesOpen(false);
      }

      if (mobileLangRef.current && !mobileLangRef.current.contains(e.target)) {
        setMobileLangOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const closeMobileMenu = () => {
    setMenuOpen(false);
    setMobileServicesOpen(false);
    setMobileLangOpen(false);
  };

  return (
    <header className={`header ${scrolled ? "header--scrolled" : ""}`}>
      <div className="header__container">
        <Link to="/" className="header__logo" onClick={closeMobileMenu}>
          <img src="/images/logo_image.png" alt="DomUnity Logo" />
        </Link>

        <nav className="header__nav">
          <div className="header__search">
            <input type="text" placeholder={t("header.search")} />
          </div>

          <Link to="/contacts">{t("header.contacts")}</Link>
          <Link to="/offer">{t("header.offers")}</Link>

          <div className="nav-dropdown" ref={servicesRef}>
            <button
              className="nav-dropdown__trigger"
              onClick={() => setDesktopServicesOpen((v) => !v)}
              type="button"
            >
              {t("header.services")} ▾
            </button>

            {desktopServicesOpen && (
              <div className="nav-dropdown__menu">
                <Link to="/services?tab=admin" onClick={() => setDesktopServicesOpen(false)}>
                  {t("header.adminMgt")}
                </Link>
                <Link to="/services?tab=finance" onClick={() => setDesktopServicesOpen(false)}>
                  {t("header.finance")}
                </Link>
                <Link to="/services?tab=maintenance" onClick={() => setDesktopServicesOpen(false)}>
                  {t("header.maintenance")}
                </Link>
                <Link to="/services?tab=cleaning" onClick={() => setDesktopServicesOpen(false)}>
                  {t("header.cleaning")}
                </Link>
              </div>
            )}
          </div>

          <Link to="/residents">{t("header.admin")}</Link>
        </nav>

        <div className="header__right">
          <div className="header__buttons">
            <div className="nav-dropdown" ref={langRef}>
              <button
                className="nav-dropdown__trigger lang-btn"
                onClick={() => setDesktopLangOpen((v) => !v)}
                type="button"
              >
                {i18n.resolvedLanguage === "bg" ? (
                  <span className="fi fi-bg"></span>
                ) : (
                  <span className="fi fi-gb"></span>
                )}
                ▾
              </button>

              {desktopLangOpen && (
                <div className="nav-dropdown__menu nav-dropdown__menu--lang">
                  <button
                    onClick={() => {
                      i18n.changeLanguage("bg");
                      setDesktopLangOpen(false);
                    }}
                    className="lang-option"
                    type="button"
                  >
                    <span className="fi fi-bg"></span> BG
                  </button>

                  <button
                    onClick={() => {
                      i18n.changeLanguage("en");
                      setDesktopLangOpen(false);
                    }}
                    className="lang-option"
                    type="button"
                  >
                    <span className="fi fi-gb"></span> EN
                  </button>
                </div>
              )}
            </div>

            <Link to="/offer" className="btn-offer">
              {t("header.offers")}
            </Link>

            <Link to="/login" className="btn-profile">
              {t("header.profile")}
            </Link>
          </div>

          <button
            type="button"
            className={`hamburger ${menuOpen ? "open" : ""}`}
            onClick={() => {
              setMenuOpen((v) => !v);
              setMobileServicesOpen(false);
              setMobileLangOpen(false);
            }}
            aria-label="Отвори меню"
            aria-expanded={menuOpen}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="mobile-menu">
          <div className="mobile-search">
            <input type="text" placeholder={t("header.search")} />
          </div>

          <Link to="/contacts" onClick={closeMobileMenu}>
            {t("header.contacts")}
          </Link>

          <Link to="/offer" onClick={closeMobileMenu}>
            {t("header.offers")}
          </Link>

          <div className="mobile-dropdown" ref={mobileServicesRef}>
            <button
              type="button"
              className="mobile-dropdown__trigger"
              onClick={() => {
                setMobileServicesOpen((v) => !v);
                setMobileLangOpen(false);
              }}
            >
              <span>{t("header.services")}</span>
              <span className={`mobile-dropdown__arrow ${mobileServicesOpen ? "open" : ""}`}>
                ▾
              </span>
            </button>

            {mobileServicesOpen && (
              <div className="mobile-dropdown__menu">
                <Link to="/services?tab=admin" onClick={closeMobileMenu}>
                  {t("header.adminMgt")}
                </Link>
                <Link to="/services?tab=finance" onClick={closeMobileMenu}>
                  {t("header.finance")}
                </Link>
                <Link to="/services?tab=maintenance" onClick={closeMobileMenu}>
                  {t("header.maintenance")}
                </Link>
                <Link to="/services?tab=cleaning" onClick={closeMobileMenu}>
                  {t("header.cleaning")}
                </Link>
              </div>
            )}
          </div>

          <Link to="/residents" onClick={closeMobileMenu}>
            {t("header.admin")}
          </Link>

          <div className="mobile-dropdown" ref={mobileLangRef}>
            <button
              type="button"
              className="mobile-dropdown__trigger"
              onClick={() => {
                setMobileLangOpen((v) => !v);
                setMobileServicesOpen(false);
              }}
            >
              <span className="mobile-lang-trigger">
                {i18n.resolvedLanguage === "bg" ? (
                  <>
                    <span className="fi fi-bg"></span>
                    <span>BG</span>
                  </>
                ) : (
                  <>
                    <span className="fi fi-gb"></span>
                    <span>EN</span>
                  </>
                )}
              </span>
              <span className={`mobile-dropdown__arrow ${mobileLangOpen ? "open" : ""}`}>
                ▾
              </span>
            </button>

            {mobileLangOpen && (
              <div className="mobile-dropdown__menu mobile-dropdown__menu--lang">
                <button
                  type="button"
                  className="mobile-lang-option"
                  onClick={() => {
                    i18n.changeLanguage("bg");
                    closeMobileMenu();
                  }}
                >
                  <span className="fi fi-bg"></span>
                  <span>Български</span>
                </button>

                <button
                  type="button"
                  className="mobile-lang-option"
                  onClick={() => {
                    i18n.changeLanguage("en");
                    closeMobileMenu();
                  }}
                >
                  <span className="fi fi-gb"></span>
                  <span>English</span>
                </button>
              </div>
            )}
          </div>

          <div className="mobile-menu__actions">
            <Link to="/offer" className="btn-offer mobile-action-btn" onClick={closeMobileMenu}>
              {t("header.offers")}
            </Link>
            <Link to="/login" className="btn-profile mobile-action-btn" onClick={closeMobileMenu}>
              {t("header.profile")}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;