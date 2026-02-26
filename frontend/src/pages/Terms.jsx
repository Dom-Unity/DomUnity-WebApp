import React from "react";
import { Link } from "react-router-dom";
import "./Terms.css";

export default function Terms() {
  return (
    <main className="terms-container">
      <div className="terms-box">
        <div className="terms-logo-wrapper">
          <img
            src="/images/logo_image.png"
            alt="DomUnity Logo"
            className="terms-logo"
          />
        </div>

        <h1 className="terms-title">Общи условия</h1>
        <p className="terms-subtitle">
          Последна актуализация: 2025 г. (примерен текст – заменете с вашите реални условия)
        </p>

        <div className="terms-content">
          <section className="terms-section">
            <h2>1. Общи положения</h2>
            <p>
              Настоящите Общи условия уреждат правилата за достъп и използване на
              платформата DomUnity („Платформата“), включително клиентски портал,
              публични страници и функционалности за комуникация между администратор
              (домоуправител) и потребители (живущи/собственици).
            </p>
          </section>

          <section className="terms-section">
            <h2>2. Дефиниции</h2>
            <ul>
              <li><strong>Потребител</strong> – лице, което използва платформата.</li>
              <li><strong>Администратор</strong> – домоуправител/упълномощено лице, което управлява данни и достъпи.</li>
              <li><strong>Сграда/Вход</strong> – обект на управление в платформата.</li>
              <li><strong>Профил</strong> – потребителски акаунт с права за достъп.</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2>3. Регистрация и достъп</h2>
            <p>
              Достъпът до клиентския портал може да бъде предоставен от Администратора
              след верификация на самоличност/принадлежност към конкретна етажна собственост.
              Потребителят носи отговорност за опазване на своите данни за вход.
            </p>
          </section>

          <section className="terms-section">
            <h2>4. Услуги и функционалности</h2>
            <p>
              Платформата може да предоставя: преглед на начисления и плащания, известия,
              подаване на сигнали, достъп до документи и отчети, както и други функционалности
              според договорените услуги за конкретната сграда.
            </p>
          </section>

          <section className="terms-section">
            <h2>5. Задължения на потребителя</h2>
            <ul>
              <li>Да предоставя верни и актуални данни.</li>
              <li>Да не злоупотребява с функционалностите (спам, опити за неоторизиран достъп и др.).</li>
              <li>Да пази конфиденциалността на данните за вход.</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2>6. Ограничаване на отговорността</h2>
            <p>
              DomUnity полага усилия за коректна работа и сигурност, но не гарантира
              непрекъсната наличност. DomUnity не носи отговорност за прекъсвания,
              причинени от форсмажорни обстоятелства, интернет доставчици или външни услуги.
            </p>
          </section>

          <section className="terms-section">
            <h2>7. Лични данни</h2>
            <p>
              Обработката на лични данни се извършва съгласно Политиката за поверителност.
              Препоръчваме да се запознаете с нея.
            </p>
            <p>
              <Link to="/privacy" className="terms-link">Виж Политика за поверителност</Link>
            </p>
          </section>

          <section className="terms-section">
            <h2>8. Промени в условията</h2>
            <p>
              DomUnity може да актуализира настоящите Общи условия при промени във
              функционалността, законодателството или услугите. Актуалната версия
              се публикува на тази страница.
            </p>
          </section>

          <section className="terms-section">
            <h2>9. Контакти</h2>
            <p>
              При въпроси относно Общите условия, свържете се с нас:
              {" "}
              <Link to="/contacts" className="terms-link">Контакти</Link>
            </p>
          </section>
        </div>

        <div className="terms-actions">
          <Link to="/" className="terms-btn terms-btn--secondary">
            Начало
          </Link>
          <Link to="/contacts" className="terms-btn terms-btn--primary">
            Свържи се с нас
          </Link>
        </div>

        <p className="terms-smallprint">
          * Този текст е примерен и не е юридически съвет. За реални общи условия се консултирайте с юрист.
        </p>
      </div>
    </main>
  );
}