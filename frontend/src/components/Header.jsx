import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./Header.css";

function Header() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [servicesOpen, setServicesOpen] = useState(false);
    const [langOpen, setLangOpen] = useState(false);
    const [lang, setLang] = useState("BG");
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

    return (
        <header className={`header ${scrolled ? "header--scrolled" : ""}`}>
            <div className="header__container">
                <Link to="/" className="header__logo">
                    <img src="/images/logo_image.png" alt="DomUnity Logo" />
                </Link>

                <nav className="header__nav">
                    <div className="header__search">
                        <input type="text" placeholder="Търсене..." />
                    </div>

                    <Link to="/contacts">Контакти</Link>
                    

                    <div className="nav-dropdown" ref={servicesRef}>
                        <button
                            className="nav-dropdown__trigger"
                            onClick={() => setServicesOpen(!servicesOpen)}
                        >
                            Услуги ▾
                        </button>

                        {servicesOpen && (
                            <div className="nav-dropdown__menu">
                                <a href="#admin">Административно управление</a>
                                <a href="#finance">Финансово обслужване</a>
                                <a href="#maintenance">Техническа поддръжка</a>
                                <a href="#cleaning">Почистване и хигиена</a>
                            </div>
                        )}
                    </div>

                    <Link to="/residents">Admin</Link>
                </nav>

                <div className="header__right">
                    <div
                        className="lang-selector"
                        ref={langRef}
                        onClick={() => setLangOpen(!langOpen)}
                    >
                        <button className="lang-btn">{lang} ▾</button>
                        {langOpen && (
                            <div className="lang-menu">
                                <button onClick={() => setLang("BG")}>BG</button>
                                <button onClick={() => setLang("EN")}>EN</button>
                            </div>
                        )}
                    </div>

                    <div className="header__buttons">
                        <Link to="/offer" className="btn-offer">Оферти</Link>
                        <Link to="/login" className="btn-profile">Профил</Link>
                    </div>

                    <button
                        className={`hamburger ${menuOpen ? "open" : ""}`}
                        onClick={() => setMenuOpen(!menuOpen)}
                    >
                        <span></span><span></span><span></span>
                    </button>
                </div>
            </div>

            {menuOpen && (
                <div className="mobile-menu">
                    <div className="mobile-search">
                        <input type="text" placeholder="Търсене..." />
                    </div>

                    <Link to="/contacts" onClick={() => setMenuOpen(false)}>Контакти</Link>

                    <div className="mobile-dropdown">
                        <button
                            className="mobile-dropdown__trigger"
                            onClick={() => setServicesOpen(!servicesOpen)}
                        >
                            Услуги ▾
                        </button>

                        {servicesOpen && (
                            <div className="mobile-dropdown__menu">
                                <a href="#admin">Административно управление</a>
                                <a href="#finance">Финансово обслужване</a>
                                <a href="#maintenance">Техническа поддръжка</a>
                                <a href="#cleaning">Почистване и хигиена</a>
                            </div>
                        )}
                    </div>

                    <a href="#about" onClick={() => setMenuOpen(false)}>За нас</a>

                    <hr />

                    <Link to="/offer" onClick={() => setMenuOpen(false)}>Оферти</Link>
                    <Link to="/login" onClick={() => setMenuOpen(false)}>Профил</Link>
                </div>
            )}
        </header>
    );
}

export default Header;
