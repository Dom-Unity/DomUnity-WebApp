import React from 'react';
import './Home.css';

function Home() {
    return (
        <main className="main">
            {/* Hero Section */}
            <section className="hero-image-section">
                <div className="hero-text">
                    <img src="images/logo_image.png" alt="DomUnity Logo" className="hero-logo" />
                    <h1>Спокойствие за вашия дом,<br /> грижа от DomUnity</h1>
                    <p>Професионално управление на сгради и етажна собственост — прозрачност, ред и комфорт за всички живущи.</p>
                    <div className="hero-buttons">
                        <a href="#services" className="btn primary">Вижте нашите услуги</a>
                        <a href="#contact" className="btn secondary">Научете повече</a>
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section className="about">
                <div className="about-container">
                    <div className="about-content">
                        <h2>За нас</h2>
                        <p>
                            <strong>DomUnity</strong> е екип от професионални домоуправители,
                            които вярват, че поддържането на вашия дом трябва да бъде спокойно и прозрачно.
                            Ние се грижим за административните, финансовите и техническите аспекти на всяка сграда,
                            така че вие да се наслаждавате на уюта си без грижи.
                        </p>
                        <a href="#services" className="btn primary">Вижте нашите услуги</a>
                    </div>
                    <div className="about-image">
                        <img src="images/about_building.png" alt="DomUnity управление на сгради" />
                    </div>
                </div>
            </section>

            {/* Services Section */}
            <section className="services" id="services">
                <h2>Нашите услуги</h2>
                <div className="services-grid">
                    <div className="service-card">
                        <img src="images/service_admin.png" alt="Административно управление" />
                        <h3>Административно управление</h3>
                        <p>Водене на документация, организиране на общи събрания и комуникация с институции.</p>
                    </div>

                    <div className="service-card">
                        <img src="images/service_finance.png" alt="Финансово обслужване" />
                        <h3>Финансово обслужване</h3>
                        <p>Събиране на месечни такси, изготвяне на отчети и прозрачност в бюджета на сградата.</p>
                    </div>

                    <div className="service-card">
                        <img src="images/service_maintenance.png" alt="Поддръжка" />
                        <h3>Техническа поддръжка</h3>
                        <p>Редовни проверки, организация на ремонти и поддръжка на общите части.</p>
                    </div>

                    <div className="service-card">
                        <img src="images/service_cleaning.png" alt="Почистване" />
                        <h3>Почистване и хигиена</h3>
                        <p>Професионално почистване на стълбища, входове и прилежащи площи.</p>
                    </div>
                </div>
            </section>

            {/* Advantages Section */}
            <section className="advantages">
                <div className="advantages-container">
                    <div className="advantages-left">
                        <img src="images/advantages_building.png" alt="DomUnity Building" />
                        <div className="advantages-overlay">
                            <h2>Защо да изберете DomUnity?</h2>
                            <p>Нашата мисия е да направим управлението на вашата етажна собственост лесно, прозрачно и ефективно.</p>
                        </div>
                    </div>

                    <div className="advantages-right">
                        <ul className="advantages-list">
                            <li><span className="icon">✔</span> Професионализъм и опит в управлението</li>
                            <li><span className="icon">✔</span> Прозрачност във всеки финансов отчет</li>
                            <li><span className="icon">✔</span> 24/7 комуникация и поддръжка</li>
                            <li><span className="icon">✔</span> Индивидуален подход към всяка сграда</li>
                            <li><span className="icon">✔</span> Надеждни партньори за ремонти и поддръжка</li>
                        </ul>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default Home;
