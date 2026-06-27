import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "flag-icons/css/flag-icons.min.css";
import "./Header.css";
import { isAuthenticated, getUser, logout } from "../services/apiService";

function Header() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const authed = isAuthenticated();
  const user = getUser();

  const [menuOpen, setMenuOpen] = useState(false);
  const [desktopLangOpen, setDesktopLangOpen] = useState(false);
  const [mobileLangOpen, setMobileLangOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const langRef = useRef(null);
  const mobileLangRef = useRef(null);
  const userRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close any open menus whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
    setMobileLangOpen(false);
    setDesktopLangOpen(false);
    setUserMenuOpen(false);
  }, [location]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setDesktopLangOpen(false);
      if (mobileLangRef.current && !mobileLangRef.current.contains(e.target)) setMobileLangOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const closeMobileMenu = () => {
    setMenuOpen(false);
    setMobileLangOpen(false);
  };

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    closeMobileMenu();
    navigate("/login");
  };

  const navLinks = authed
    ? [
        { to: "/", label: t("header.home", { defaultValue: "Начало" }) },
        { to: "/reports", label: t("header.reports", { defaultValue: "Отчети" }) },
        { to: "/issues", label: t("header.issues", { defaultValue: "Сигнали" }) },
        { to: "/events", label: t("header.events", { defaultValue: "Събития" }) },
        { to: "/messages", label: t("header.messages", { defaultValue: "Съобщения" }) },
      ]
    : [
        { to: "/", label: t("header.home", { defaultValue: "Начало" }) },
        { to: "/services", label: t("header.services", { defaultValue: "Услуги" }) },
        { to: "/offer", label: t("header.offers", { defaultValue: "Оферти" }) },
        { to: "/contacts", label: t("header.contacts", { defaultValue: "Контакти" }) },
      ];

  const displayName = (user && (user.full_name || user.email)) || t("header.profile", { defaultValue: "Профил" });

  const LangSwitcher = ({ open, setOpen, refEl, idPrefix }) => (
    <div className="nav-dropdown" ref={refEl}>
      <button
        className="nav-dropdown__trigger lang-btn"
        onClick={() => setOpen((v) => !v)}
        type="button"
        aria-label="Language"
      >
        {i18n.resolvedLanguage === "bg" ? <span className="fi fi-bg" /> : <span className="fi fi-gb" />} ▾
      </button>
      {open && (
        <div className="nav-dropdown__menu nav-dropdown__menu--lang">
          <button
            onClick={() => {
              i18n.changeLanguage("bg");
              setOpen(false);
            }}
            className="lang-option"
            type="button"
            key={`${idPrefix}-bg`}
          >
            <span className="fi fi-bg" /> BG
          </button>
          <button
            onClick={() => {
              i18n.changeLanguage("en");
              setOpen(false);
            }}
            className="lang-option"
            type="button"
            key={`${idPrefix}-en`}
          >
            <span className="fi fi-gb" /> EN
          </button>
        </div>
      )}
    </div>
  );

  return (
    <header className={`header ${scrolled ? "header--scrolled" : ""}`}>
      <div className="header__container">
        <Link to="/" className="header__logo" onClick={closeMobileMenu}>
          <img src="/images/logo_image.png" alt="DomUnity Logo" />
        </Link>

        <nav className="header__nav">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to} className="header__nav-link">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="header__right">
          <div className="header__buttons">
            <LangSwitcher open={desktopLangOpen} setOpen={setDesktopLangOpen} refEl={langRef} idPrefix="d" />

            {authed ? (
              <>
                <button
                  type="button"
                  className="header__bell"
                  title={t("header.notifications", { defaultValue: "Известия (скоро)" })}
                  onClick={() => navigate("/messages")}
                  aria-label="Notifications"
                >
                  🔔
                </button>

                <div className="nav-dropdown user-menu" ref={userRef}>
                  <button
                    type="button"
                    className="user-menu__trigger"
                    onClick={() => setUserMenuOpen((v) => !v)}
                  >
                    <img src="/images/profile.png" alt="" className="user-menu__avatar" />
                    <span className="user-menu__name">{displayName}</span>
                    <span className="user-menu__arrow">▾</span>
                  </button>

                  {userMenuOpen && (
                    <div className="nav-dropdown__menu user-menu__dropdown">
                      <Link to="/profile" onClick={() => setUserMenuOpen(false)}>
                        {t("header.myProfile", { defaultValue: "Моят профил" })}
                      </Link>
                      <Link to="/editprofile" onClick={() => setUserMenuOpen(false)}>
                        {t("header.editProfile", { defaultValue: "Редактирай профил" })}
                      </Link>
                      <button type="button" className="user-menu__logout" onClick={handleLogout}>
                        {t("header.logout", { defaultValue: "Изход" })}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/offer" className="btn-offer">
                  {t("header.offers", { defaultValue: "Оферти" })}
                </Link>
                <Link to="/login" className="btn-profile">
                  {t("header.login", { defaultValue: "Вход" })}
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className={`hamburger ${menuOpen ? "open" : ""}`}
            onClick={() => {
              setMenuOpen((v) => !v);
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
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to} onClick={closeMobileMenu}>
              {link.label}
            </Link>
          ))}

          <LangSwitcher open={mobileLangOpen} setOpen={setMobileLangOpen} refEl={mobileLangRef} idPrefix="m" />

          <div className="mobile-menu__actions">
            {authed ? (
              <>
                <Link to="/profile" className="btn-profile mobile-action-btn" onClick={closeMobileMenu}>
                  {t("header.myProfile", { defaultValue: "Моят профил" })}
                </Link>
                <Link to="/editprofile" className="mobile-action-btn" onClick={closeMobileMenu}>
                  {t("header.editProfile", { defaultValue: "Редактирай профил" })}
                </Link>
                <button type="button" className="btn-offer mobile-action-btn" onClick={handleLogout}>
                  {t("header.logout", { defaultValue: "Изход" })}
                </button>
              </>
            ) : (
              <>
                <Link to="/offer" className="btn-offer mobile-action-btn" onClick={closeMobileMenu}>
                  {t("header.offers", { defaultValue: "Оферти" })}
                </Link>
                <Link to="/login" className="btn-profile mobile-action-btn" onClick={closeMobileMenu}>
                  {t("header.login", { defaultValue: "Вход" })}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
