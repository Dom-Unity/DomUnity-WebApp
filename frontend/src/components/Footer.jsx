import React from "react";
import "./Footer.css";

const Footer = () => {
    return (
        <footer className="footer">

            <div className="footer__container">

                {/* NEWSLETTER */}
                <div className="footer__newsletter">
                    <h2>Абонирай се за актуални новини и полезни съвети</h2>

                    <form className="footer__newsletter-form">
                        <input
                            type="email"
                            placeholder="Вашият e-mail *"
                            required
                        />
                        <button type="submit">Абониране</button>
                    </form>
                </div>

                {/* MAIN GRID */}
                <div className="footer__grid">

                    <div className="footer__column">
                        <h3>Услуги</h3>
                        <ul>
                            <li><a href="#">Професионален домоуправител</a></li>
                            <li><a href="#">За кого е услугата</a></li>
                            <li><a href="#">Допълнителни услуги</a></li>
                            <li><a href="#">Клиентски портал</a></li>
                            <li><a href="#">Въпроси и отговори</a></li>
                        </ul>
                    </div>

                    <div className="footer__column">
                        <h3>Информация</h3>
                        <ul>
                            <li><a href="#">За DomUnity</a></li>
                            <li><a href="#">Нашата история</a></li>
                            <li><a href="#">Нашият екип</a></li>
                            <li><a href="#">Общи условия</a></li>
                            <li><a href="#">Политика за поверителност</a></li>
                        </ul>
                    </div>

                    <div className="footer__column">
                        <h3>Контакти</h3>
                        <ul>
                            <li><a href="tel:+359888440107">+359 88 844 0107</a></li>
                            <li><a href="mailto:bobovlahov@gmail.com">bobovlahov@gmail.com</a></li>
                            <li>
                                гр. София, ж.к. Овча Купел 2<br />
                                бул. Президент Линкълн 1200
                            </li>
                        </ul>

                        {/* SOCIAL ICONS — ADDED HERE */}
                        <div className="footer__socials">
                            <a
                                href="https://www.facebook.com/profile.php?id=61582683208565"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <img src="/images/facebook_logo.png" alt="Facebook" />
                            </a>

                            <a
                                href="https://www.instagram.com/dom_unity/"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <img src="/images/instagram_logo.png" alt="Instagram" />
                            </a>
                        </div>
                    </div>

                </div>

            </div>

            {/* BOTTOM BAR */}
            <div className="footer__bottom">
                <p>© 2025 DomUnity. Всички права запазени.</p>
            </div>

        </footer>
    );
};

export default Footer;
