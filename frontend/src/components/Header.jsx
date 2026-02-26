import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./Header.css";

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const servicesRef = useRef(null);

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
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const closeMobileMenu = () => {
    setMenuOpen(false);
    setServicesOpen(false);
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
            <input type="text" placeholder="Търсене..." />
          </div>

          <Link to="/contacts">Контакти</Link>
          <Link to="/offer">Оферти</Link>

          <div className="nav-dropdown" ref={servicesRef}>
            <button
              className="nav-dropdown__trigger"
              onClick={() => setServicesOpen((v) => !v)}
              type="button"
            >
              Услуги ▾
            </button>

            {servicesOpen && (
              <div className="nav-dropdown__menu">
                <Link to="/services?tab=admin" onClick={() => setServicesOpen(false)}>
                  Административно управление
                </Link>
                <Link to="/services?tab=finance" onClick={() => setServicesOpen(false)}>
                  Финансово обслужване
                </Link>
                <Link to="/services?tab=maintenance" onClick={() => setServicesOpen(false)}>
                  Техническа поддръжка
                </Link>
                <Link to="/services?tab=cleaning" onClick={() => setServicesOpen(false)}>
                  Почистване и хигиена
                </Link>
              </div>
            )}
          </div>

          <Link to="/residents">Admin</Link>
        </nav>

        {/* RIGHT SIDE */}
        <div className="header__right">
          <div className="header__buttons">
            <Link to="/offer" className="btn-offer">
              Оферти
            </Link>
            <Link to="/login" className="btn-profile">
              Профил
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
            <input type="text" placeholder="Търсене..." />
          </div>

          <Link to="/contacts" onClick={closeMobileMenu}>
            Контакти
          </Link>

          <div className="mobile-dropdown">
            <button
              type="button"
              className="mobile-dropdown__trigger"
              onClick={() => setServicesOpen((v) => !v)}
            >
              Услуги ▾
            </button>

            {servicesOpen && (
              <div className="mobile-dropdown__menu">
                <Link to="/services?tab=admin" onClick={closeMobileMenu}>
                  Административно управление
                </Link>
                <Link to="/services?tab=finance" onClick={closeMobileMenu}>
                  Финансово обслужване
                </Link>
                <Link to="/services?tab=maintenance" onClick={closeMobileMenu}>
                  Техническа поддръжка
                </Link>
                <Link to="/services?tab=cleaning" onClick={closeMobileMenu}>
                  Почистване и хигиена
                </Link>
              </div>
            )}
          </div>

          <a href="#about" onClick={closeMobileMenu}>
            За нас
          </a>

          <hr />

          <Link to="/offer" onClick={closeMobileMenu}>
            Оферти
          </Link>
          <Link to="/login" onClick={closeMobileMenu}>
            Профил
          </Link>
        </div>
      )}
    </header>
  );
}

export default Header;