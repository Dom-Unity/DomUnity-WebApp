import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

function Header() {
    return (
        <header className="site-header">
            <div className="site-header__container">
                <div className="site-header__left">
                    <div className="site-header__logo">
                        <Link to="/">
                            <span className="logo-text">DomUnity</span>
                        </Link>
                    </div>
                    <div className="site-header__phone">
                        <a href="tel:+359888440107">+359 88 844 0107</a>
                    </div>
                </div>

                <nav className="site-header__nav">
                    <ul>
                        <li><Link to="/contacts">Контакти</Link></li>
                        <li><a href="#about">За нас</a></li>
                        <li><a href="#services">Услуги</a></li>
                        <li><Link to="/profile">Блог</Link></li>
                        <li><Link to="/offer" className="btn btn--outline">Оферти</Link></li>
                        <li><Link to="/login" className="btn btn--filled">Профил</Link></li>
                    </ul>
                </nav>
            </div>
        </header>
    );
}

export default Header;
