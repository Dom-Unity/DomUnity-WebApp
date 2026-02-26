import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./Footer.css";

const FAQ = [
  {
    q: "Как работи DomUnity?",
    a: "DomUnity комбинира професионално управление на сгради с онлайн платформа за прозрачни отчети, сигнали и комуникация с живущите."
  },
  {
    q: "Какво включва услугата домоуправител?",
    a: "Административно управление, финансово обслужване, организация на ремонти/поддръжка и координация с доставчици според договорените услуги."
  },
  {
    q: "Могат ли живущите да следят разходите?",
    a: "Да — всеки апартамент има достъп до начисления, плащания и отчети (според правата в системата)."
  },
  {
    q: "Как подавам сигнал за проблем?",
    a: "Чрез профила си в клиентския портал (или чрез директен контакт с администратора, ако предпочитате)."
  }
];

const Footer = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFaq = (idx) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <footer className="footer">
      <div className="footer__container">
        {/* NEWSLETTER */}
        <div className="footer__newsletter">
          <h2>Абонирай се за актуални новини и полезни съвети</h2>

          <form
            className="footer__newsletter-form"
            onSubmit={(e) => {
              e.preventDefault();
              // Тук за реална система: POST към backend / newsletter service
              alert("Благодарим! Абонаментът е приет. (демо)");
            }}
          >
            <input type="email" placeholder="Вашият e-mail *" required />
            <button type="submit">Абониране</button>
          </form>
        </div>

        {/* BOTTOM AREA */}
        <div className="footer__bottom-area">
          {/* CONTACTS */}
          <div className="footer__contacts">
            <h3>Контакти</h3>
            <ul>
              <li>
                <a href="tel:+359888440107">+359 88 844 0107</a>
              </li>
              <li>
                <a href="mailto:bobovlahov@gmail.com">bobovlahov@gmail.com</a>
              </li>
              <li>
                гр. София, ж.к. Овча Купел 2<br />
                бул. Президент Линкълн 1200
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
            <h3>Политики</h3>
            <ul>
              <li>
                <Link to="/terms" className="footer-link">
                  Общи условия
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="footer-link">
                  Политика за поверителност
                </Link>
              </li>
              <li>
                <Link to="/contacts" className="footer-link">
                  Свържи се с нас
                </Link>
              </li>
            </ul>
          </div>

          {/* FAQ */}
          <div className="footer__faq">
            <h3>Въпроси и отговори</h3>

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
        <p>© 2025 DomUnity. Всички права запазени.</p>
      </div>
    </footer>
  );
};

export default Footer;