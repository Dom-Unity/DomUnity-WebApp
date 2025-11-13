import React from 'react';
import './Footer.css';

const Footer = () => {
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
                        <p>✉️ <a href="mailto:bobovlahov@gmail.com">bobovlahov@gmail.com</a></p>
                        <p>📍 <a href="https://www.google.com/maps/search/?api=1&query=гр.+София,+ж.к.+Овча+Купел+2,+бул.+Президент+Линкълн+1200" target="_blank">гр. София, ж.к. Овча Купел 2,<br />бул. Президент Линкълн 1200</a></p>
                        <div className="site-footer__socials">
                            <a href="https://www.facebook.com/profile.php?id=61582683208565" target="_blank">
                                <img src="/images/facebook_logo.png" alt="Facebook" />
                            </a>
                            <a href="https://www.instagram.com/dom_unity/" target="_blank">
                                <img src="/images/instagram_logo.png" alt="Instagram" />
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
};

export default Footer;
