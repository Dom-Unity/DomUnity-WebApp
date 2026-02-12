import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Profile.css";
import { getProfile, isAuthenticated, logout } from '../services/apiService';

const Profile = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Dynamic user data from API
    const [user, setUser] = useState(null);
    const [financialSummary, setFinancialSummary] = useState(null);
    const [events, setEvents] = useState([]);
    const [payments, setPayments] = useState([]);

    // Check authentication on mount
    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }

        const fetchProfileData = async () => {
            try {
                const data = await getProfile();
                if (data.error) {
                    if (data.error === 'Unauthorized') {
                        logout();
                        navigate('/login');
                        return;
                    }
                    setError(data.error);
                    return;
                }

                // Build user object from API response
                const userData = {
                    name: data.user?.full_name || 'Потребител',
                    email: data.user?.email || '',
                    building: data.building?.address || '',
                    entrance: data.building?.entrance || '',
                    apartment: data.apartment?.number?.toString() || '',
                    clientNumber: data.client_number || '',
                    residents: data.apartment?.residents || 0,
                    balance: data.balance || 0,
                    lastPayment: data.last_payment?.date || '',
                    lastPaymentAmount: data.last_payment?.amount || '',
                };
                setUser(userData);

                // Set financial summary
                if (data.financial_summary) {
                    setFinancialSummary({
                        currentMonthDebt: data.financial_summary.current_month_debt || '0.00 лв.',
                        overdueAmount: data.financial_summary.overdue_amount || '0.00 лв.',
                        yearlyTotal: data.financial_summary.yearly_total || '0.00 лв.',
                    });
                }

                // Set events
                if (data.events && Array.isArray(data.events)) {
                    setEvents(data.events);
                }

                // Set payments for the finance table
                if (data.payments && Array.isArray(data.payments)) {
                    setPayments(data.payments);
                }

            } catch (err) {
                console.error('Profile fetch failed:', err);
                setError('Грешка при зареждане на профила');
            } finally {
                setLoading(false);
            }
        };

        fetchProfileData();
    }, [navigate]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const quickLinks = [
        { to: "/entrance", label: "Моят вход", desc: "Статус на всички апартаменти" },
        { to: "/apartment", label: "Моят апартамент", desc: "Такси, плащания и история" },
        { to: "/balance", label: "Финансов отчет", desc: "Подробни финансови детайли" },
        { to: "/offer", label: "Нова оферта", desc: "Заяви управление на друга сграда" },
    ];

    if (loading) {
        return <main className="profile-layout"><p style={{ textAlign: 'center', padding: '2rem' }}>Зареждане...</p></main>;
    }

    if (error) {
        return (
            <main className="profile-layout">
                <p style={{ color: 'red', textAlign: 'center', padding: '2rem' }}>{error}</p>
            </main>
        );
    }

    // Show loading if user data not yet available
    if (!user) {
        return <main className="profile-layout"><p style={{ textAlign: 'center', padding: '2rem' }}>Зареждане на данни...</p></main>;
    }

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
                    <button onClick={handleLogout} className="btn-profile-edit" style={{ marginLeft: '10px', background: '#dc3545', borderColor: '#dc3545' }}>
                        Изход
                    </button>
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
                                    {financialSummary?.currentMonthDebt || '0.00 лв.'}
                                </span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Просрочени суми</span>
                                <span className="stat-value warning">
                                    {financialSummary?.overdueAmount || '0.00 лв.'}
                                </span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Общо за годината</span>
                                <span className="stat-value">
                                    {financialSummary?.yearlyTotal || '0.00 лв.'}
                                </span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Последно плащане</span>
                                <span className="stat-value">
                                    {user.lastPayment ? `${user.lastPayment} (${user.lastPaymentAmount})` : 'Няма данни'}
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
                            {payments.length > 0 ? (
                                payments.slice(0, 3).map((payment, index) => (
                                    <div className="finance-row" key={index}>
                                        <span>{payment.period}</span>
                                        <span>{payment.amount}</span>
                                        <span className={`status ${payment.status}`}>
                                            {payment.status === 'paid' ? 'Платено' : payment.status === 'pending' ? 'Очаква плащане' : 'Просрочено'}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="finance-row">
                                    <span colSpan="3" style={{ textAlign: 'center' }}>Няма налични плащания</span>
                                </div>
                            )}
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