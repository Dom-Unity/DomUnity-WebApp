import React from "react";
import { Link } from "react-router-dom";
import "./Profile.css";

const Profile = () => {

    const user = {
        name: "Иван Иванов",
        email: "ivan.ivanov@example.com",
        building: "Младост 3, бл. 325",
        entrance: "Б",
        apartment: "25",
        clientNumber: "12356787",
        residents: 3,
        balance: 0,
        lastPayment: "12.03.2025",
        lastPaymentAmount: "30.00 лв.",
    };

    const financialSummary = {
        currentMonthDebt: "30.00 лв.",
        overdueAmount: "40.00 лв.",
        yearlyTotal: "100.00 лв.",
    };

    const events = [
        {
            date: "05.11.2025",
            text: "Планирана профилактика на асансьора от 10:00 до 13:00 ч.",
        },
        {
            date: "02.11.2025",
            text: "Общо събрание на вход Б – от 19:00 ч. във входното фоайе.",
        },
        {
            date: "28.10.2025",
            text: "Изпратено напомняне за месечна такса за поддръжка.",
        },
    ];

    const quickLinks = [
        { to: "/entrance", label: "Моят вход", desc: "Статус на всички апартаменти" },
        { to: "/apartment", label: "Моят апартамент", desc: "Такси, плащания и история" },
        { to: "/balance", label: "Финансов отчет", desc: "Подробни финансови детайли" },
        { to: "/offer", label: "Нова оферта", desc: "Заяви управление на друга сграда" },
    ];

    return (
        <main className="profile-layout">
            <section className="profile-hero">
                <div className="profile-hero-left">
                <img
                    src="/images/profile.png"
                    alt="Профил"
                    className="profile-avatar"
                />
                <div className="profile-hero-text">
                    <h1>Здравей, {user.name}</h1>
                    <p>Тук можеш да следиш всичко, свързано с твоя дом и етажна собственост.</p>
                    <div className="profile-tags">
                    <span className="tag">Сграда: {user.building}</span>
                    <span className="tag">Вход {user.entrance}</span>
                    <span className="tag">Ап. {user.apartment}</span>
                    <span className="tag">Клиент № {user.clientNumber}</span>
                    </div>
                </div>
                </div>

                <div className="profile-hero-right">
                <Link to="/EditProfile" className="btn-profile-edit">
                    Редактирай профил
                </Link>
                <p className="profile-email">{user.email}</p>
                </div>
            </section>

            <section className="profile-main-grid">
                <div className="profile-main-left">
                    <div className="card card-stats">
                        <h2>Обобщена информация</h2>
                        <div className="stats-grid">
                        <div className="stat-item">
                            <span className="stat-label">Баланс</span>
                            <span className="stat-value">{user.balance} лв.</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Живущи</span>
                            <span className="stat-value">{user.residents}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Текущо задължение</span>
                            <span className="stat-value">
                            {financialSummary.currentMonthDebt}
                            </span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Просрочени суми</span>
                            <span className="stat-value warning">
                            {financialSummary.overdueAmount}
                            </span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Общо за годината</span>
                            <span className="stat-value">
                            {financialSummary.yearlyTotal}
                            </span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Последно плащане</span>
                            <span className="stat-value">
                            {user.lastPayment} ({user.lastPaymentAmount})
                            </span>
                        </div>
                        </div>
                    </div>

                    <div className="card card-property">
                        <h2>Моят имот</h2>
                        <div className="property-grid">
                            <Link to="/building" className="property-card">
                                <div>
                                    <h4>Сграда</h4>
                                    <p>{user.building}</p>
                                </div>
                            </Link>

                            <Link to="/entrance" className="property-card">
                                <div>
                                    <h4>Вход</h4>
                                    <p>Вход {user.entrance}</p>
                                </div>
                            </Link>

                            <Link to="/apartment" className="property-card">
                                <div>
                                    <h4>Апартамент</h4>
                                    <p>{user.apartment}</p>
                                </div>
                            </Link>
                        </div>
                    </div>


                    <div className="card card-finance">
                        <div className="card-header-row">
                            <h2>Финансов преглед</h2>
                            <Link to="/apartment" className="link-text">
                                Виж детайлен отчет →
                            </Link>
                        </div>

                        <div className="finance-table-sm">
                            <div className="finance-row header">
                                <span>Период</span>
                                <span>Сума</span>
                                <span>Статус</span>
                            </div>
                            <div className="finance-row">
                                <span>Ноември 2025</span>
                                <span>30.00 лв.</span>
                                <span className="status pending">Очаква плащане</span>
                            </div>
                            <div className="finance-row">
                                <span>Октомври 2025</span>
                                <span>40.00 лв.</span>
                                <span className="status paid">Платено</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="profile-main-right">
                    <div className="card card-actions">
                        <h2>Бързи действия</h2>
                        <ul className="quick-actions-list">
                        {quickLinks.map((item) => (
                            <li key={item.to}>
                            <Link to={item.to}>
                                <span className="qa-title">{item.label}</span>
                                <span className="qa-desc">{item.desc}</span>
                            </Link>
                            </li>
                        ))}
                        </ul>
                    </div>

                    <div className="card card-events">
                        <h2>Събития и известия</h2>
                        <ul className="events-list">
                        {events.map((e, i) => (
                            <li key={i}>
                            <span className="event-date">{e.date}</span>
                            <p>{e.text}</p>
                            </li>
                        ))}
                        </ul>
                    </div>
                </div>
            </section>
        </main>
    );
};

export default Profile;