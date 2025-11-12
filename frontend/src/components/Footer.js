import React from 'react';
import './Footer.css';

function Footer() {
    return (
        <footer className="site-footer">
            <div className="site-footer__container">
                <div className="site-footer__inner">
                    <div className="site-footer__box site-footer__newsletter-popup">
                        <h2>Абонирай се, за да следиш последните новини, свързани с управление на сгради!</h2>
                        <form>
                            <input className="email_input" type="email" placeholder="Вашият e-mail *" required />
                            <button className="submit_button" type="submit">Абониране</button>
                        </form>
                    </div>

                    <div className="site-footer__box">
                        <h2>Услуги</h2>
                        <ul>
                            <li><a href="#services">Професионален домоуправител</a></li>
                            <li><a href="#services">За кого е услугата</a></li>
                            <li><a href="#services">Допълнителни услуги</a></li>
                            <li><a href="#profile">Клиентски портал</a></li>
                            <li><a href="#faq">Въпроси и отговори</a></li>
                        </ul>
                    </div>

                    <div className="site-footer__box">
                        <h2>Информация</h2>
                        <ul>
                            <li><a href="#about">За DomUnity</a></li>
                            <li><a href="#history">Нашата история</a></li>
                            <li><a href="#team">Нашият екип</a></li>
                            <li><a href="#terms">Общи условия</a></li>
                            <li><a href="#privacy">Политика за поверителност</a></li>
                        </ul>
                    </div>

                    <div className="site-footer__box">
                        <h2>Контакти</h2>
                        <p>📞 <a href="tel:+359888440107">+359 88 844 0107</a></p>
                        <p>✉️ <a href="mailto:info@domunity.bg">info@domunity.bg</a></p>
                        <p>📍 гр. София, ж.к. Младост 1,<br />ул. Примерна №15</p>

                        <div className="site-footer__socials">
                            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
                                Facebook
                            </a>
                            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
                                Instagram
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            <div className="site-footer__bottom">
                <p>© 2025 DomUnity. All rights reserved.</p>
            </div>
        </footer>
    );
}

export default Footer;
