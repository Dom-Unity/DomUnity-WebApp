import React from "react";
import { Link } from "react-router-dom";
import "./Home.css";

function Home() {
    return (
        <main className="main home-main">
            <section className="hero">
                <div className="hero-inner">
                    <div className="hero-text">
                        <img
                            src="/images/logo_image.png"
                            alt="DomUnity Logo"
                            className="hero-logo"
                        />
                        <h1>
                            Професионално управление на<br />
                            сгради и етажна собственост
                        </h1>
                        <p>
                            DomUnity поема грижата за вашия вход – административно,
                            финансово и техническо управление с пълна прозрачност за
                            всеки живущ.
                        </p>

                        <div className="hero-buttons">
                            <Link to="/offer" className="btn secondary">
                                Вземи оферта
                            </Link>
                            <Link to="/login" className="btn primary">
                                Вход за клиенти
                            </Link>
                        </div>

                        <div className="hero-highlights">
                            <div className="hero-highlight">
                                <span className="value">24/7</span>
                                <span className="label">комуникация и сигнали</span>
                            </div>
                            <div className="hero-highlight">
                                <span className="value">100%</span>
                                <span className="label">прозрачност на разходите</span>
                            </div>
                            <div className="hero-highlight">
                                <span className="value">1 платформа</span>
                                <span className="label">за домоуправител и живущи</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="section about" id="about">
                <div className="section-header">
                    <h2>За кого е DomUnity?</h2>
                    <p>
                        Подходящо решение както за вече организирани етажни
                        собствености, така и за нови сгради, които тепърва
                        избират професионален домоуправител.
                    </p>
                </div>

                <div className="about-grid">
                    <div className="about-card">
                        <h3>За собственици и живущи</h3>
                        <p>
                            Достъп до актуален баланс, история на плащанията и
                            всички разходи по сградата на едно място – без
                            хартиени бележки и спорове.
                        </p>
                        <ul>
                            <li>Личен профил за всеки апартамент</li>
                            <li>Преглед на начисления и плащания</li>
                            <li>Известия при просрочия и нови такси</li>
                        </ul>
                    </div>

                    <div className="about-card">
                        <h3>За управители на сгради</h3>
                        <p>
                            Професионална система за управление на няколко входа,
                            сгради и комплекси – с автоматизирани отчети и
                            централизирана комуникация.
                        </p>
                        <ul>
                            <li>Финансови отчети по вход и сграда</li>
                            <li>История на ремонти и поддръжка</li>
                            <li>Преглед на задължения по апартамент</li>
                        </ul>
                    </div>
                </div>
            </section>

            <section className="section services" id="services">
                <div className="section-header">
                    <h2>Какво поемаме вместо вас</h2>
                    <p>
                        Пълно обслужване на етажната собственост – от документацията
                        до ежедневната поддръжка и комуникацията с живущите.
                    </p>
                </div>

                <div className="services-grid">
                    <div className="service-card">
                        <img
                            src="/images/service_admin.png"
                            alt="Административно управление"
                        />
                        <h3>Административно управление</h3>
                        <p>
                            Организация на общи събрания, протоколи, регистри,
                            договори и кореспонденция с институции.
                        </p>
                    </div>

                    <div className="service-card">
                        <img
                            src="/images/service_finance.png"
                            alt="Финансово обслужване"
                        />
                        <h3>Финансово обслужване</h3>
                        <p>
                            Събиране на такси, разпределяне на разходи, месечни
                            и годишни отчети с пълна видимост за собствениците.
                        </p>
                    </div>

                    <div className="service-card">
                        <img
                            src="/images/service_maintenance.png"
                            alt="Техническа поддръжка"
                        />
                        <h3>Техническа поддръжка</h3>
                        <p>
                            Организация на ремонти, профилактика на асансьори,
                            осветление и общи части, поддръжка на инсталации.
                        </p>
                    </div>

                    <div className="service-card">
                        <img
                            src="/images/service_cleaning.png"
                            alt="Почистване и хигиена"
                        />
                        <h3>Почистване и хигиена</h3>
                        <p>
                            Професионално почистване на входове, стълбища и
                            прилежащи площи по фиксиран график.
                        </p>
                    </div>
                </div>
            </section>

            <section className="section how-it-works">
                <div className="section-header">
                    <h2>Как работи DomUnity</h2>
                    <p>Три ясни стъпки към подредена и спокойна сграда.</p>
                </div>

                <div className="steps-grid">
                    <div className="step-card">
                        <span className="step-number">1</span>
                        <h3>Заявка за оферта</h3>
                        <p>
                            Изпращате ни информация за сградата – брой входове,
                            апартаменти и специфики. Получавате персонално
                            предложение.
                        </p>
                    </div>
                    <div className="step-card">
                        <span className="step-number">2</span>
                        <h3>Подписване на договор</h3>
                        <p>
                            Уточняваме услугите, графиците и начините на
                            комуникация. Всеки собственик получава профил в
                            DomUnity.
                        </p>
                    </div>
                    <div className="step-card">
                        <span className="step-number">3</span>
                        <h3>Ежедневно управление</h3>
                        <p>
                            Ние поемаме административните, финансовите и
                            техническите задачи, а вие следите всичко онлайн.
                        </p>
                    </div>
                </div>
            </section>

            <section className="section advantages">
                <div className="advantages-inner">
                    <div className="advantages-text">
                        <h2>Защо да изберете DomUnity?</h2>
                        <p>
                            Комбинираме професионален домоуправител с модерен
                            софтуер, така че всяка такса, ремонт и решение да
                            бъдат проследими и ясни за всички.
                        </p>

                        <ul className="advantages-list">
                            <li>Прозрачни отчети за всяка сграда и вход</li>
                            <li>Онлайн достъп до информация 24/7</li>
                            <li>Ясни правила и регламентирани процеси</li>
                            <li>Отговорен партньор за дългосрочно управление</li>
                        </ul>
                    </div>

                    <div className="advantages-side">
                        <div className="advantages-box">
                            <h3>Готови ли сте за подредена етажна собственост?</h3>
                            <p>
                                Свържете се с нас за среща или изпратете запитване
                                за конкретна оферта за вашата сграда.
                            </p>
                            <div className="adv-buttons">
                                <Link to="/offer" className="btn primary">
                                    Заяви оферта
                                </Link>
                                <Link to="/contacts" className="btn secondary">
                                    Контакти
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default Home;