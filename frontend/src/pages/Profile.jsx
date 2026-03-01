import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./Profile.css";
import { getProfile, isAuthenticated, logout } from '../services/apiService';

const Profile = () => {
    const { t } = useTranslation();
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
                    name: data.user?.full_name || t('profile.userDataDefault'),
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
                setError(t('profile.profileError'));
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
        { to: "/entrance", label: t('profile.quickLinks.entranceLabel'), desc: t('profile.quickLinks.entranceDesc') },
        { to: "/apartment", label: t('profile.quickLinks.apartmentLabel'), desc: t('profile.quickLinks.apartmentDesc') },
        { to: "/balance", label: t('profile.quickLinks.balanceLabel'), desc: t('profile.quickLinks.balanceDesc') },
        { to: "/offer", label: t('profile.quickLinks.offerLabel'), desc: t('profile.quickLinks.offerDesc') },
    ];

    if (loading) {
        return <main className="profile-layout"><p style={{ textAlign: 'center', padding: '2rem' }}>{t('profile.loading')}</p></main>;
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
        return <main className="profile-layout"><p style={{ textAlign: 'center', padding: '2rem' }}>{t('profile.loadingData')}</p></main>;
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
                        <h1>{t('profile.greeting', { name: user.name })}</h1>
                        <p>{t('profile.heroSubtitle')}</p>
                        <div className="profile-tags">
                            <span className="tag">{t('profile.tagBuilding')}{user.building}</span>
                            <span className="tag">{t('profile.tagEntrance')}{user.entrance}</span>
                            <span className="tag">{t('profile.tagApartment')}{user.apartment}</span>
                            <span className="tag">{t('profile.tagClientNumber')}{user.clientNumber}</span>
                        </div>
                    </div>
                </div>

                <div className="profile-hero-right">
                    <Link to="/EditProfile" className="btn-profile-edit">
                        {t('profile.btnEditProfile')}
                    </Link>
                    <button onClick={handleLogout} className="btn-logout">
                        {t('profile.btnLogout')}
                    </button>
                    <p className="profile-email">{user.email}</p>
                </div>
            </section>

            <section className="profile-main-grid">
                <div className="profile-main-left">
                    <div className="card card-stats">
                        <h2>{t('profile.sectionSummary')}</h2>
                        <div className="stats-grid">
                            <div className="stat-item">
                                <span className="stat-label">{t('profile.statBalance')}</span>
                                <span className="stat-value">{user.balance} лв.</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">{t('profile.statResidents')}</span>
                                <span className="stat-value">{user.residents}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">{t('profile.statCurrentDebt')}</span>
                                <span className="stat-value">
                                    {financialSummary?.currentMonthDebt || '0.00 лв.'}
                                </span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">{t('profile.statOverdue')}</span>
                                <span className="stat-value warning">
                                    {financialSummary?.overdueAmount || '0.00 лв.'}
                                </span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">{t('profile.statYearlyTotal')}</span>
                                <span className="stat-value">
                                    {financialSummary?.yearlyTotal || '0.00 лв.'}
                                </span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">{t('profile.statLastPayment')}</span>
                                <span className="stat-value">
                                    {user.lastPayment ? `${user.lastPayment} (${user.lastPaymentAmount})` : t('profile.noData')}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="card card-property">
                        <h2>{t('profile.sectionMyProperty')}</h2>
                        <div className="property-grid">
                            <Link to="/building" className="property-card">
                                <div>
                                    <h4>{t('profile.propBuilding')}</h4>
                                    <p>{user.building}</p>
                                </div>
                            </Link>

                            <Link to="/entrance" className="property-card">
                                <div>
                                    <h4>{t('profile.propEntrance')}</h4>
                                    <p>{t('profile.tagEntrance')}{user.entrance}</p>
                                </div>
                            </Link>

                            <Link to="/apartment" className="property-card">
                                <div>
                                    <h4>{t('profile.propApartment')}</h4>
                                    <p>{user.apartment}</p>
                                </div>
                            </Link>
                        </div>
                    </div>


                    <div className="card card-finance">
                        <div className="card-header-row">
                            <h2>{t('profile.sectionFinance')}</h2>
                            <Link to="/apartment" className="link-text">
                                {t('profile.linkDetailReport')}
                            </Link>
                        </div>

                        <div className="finance-table-sm">
                            <div className="finance-row header">
                                <span>{t('profile.thPeriod')}</span>
                                <span>{t('profile.thAmount')}</span>
                                <span>{t('profile.thStatus')}</span>
                            </div>
                            {payments.length > 0 ? (
                                payments.slice(0, 3).map((payment, index) => (
                                    <div className="finance-row" key={index}>
                                        <span>{payment.period}</span>
                                        <span>{payment.amount}</span>
                                        <span className={`status ${payment.status}`}>
                                            {payment.status === 'paid' ? t('profile.statusPaid') : payment.status === 'pending' ? t('profile.statusPending') : t('profile.statusOverdue')}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="finance-row">
                                    <span colSpan="3" style={{ textAlign: 'center' }}>{t('profile.noPayments')}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="profile-main-right">
                    <div className="card card-actions">
                        <h2>{t('profile.sectionQuickActions')}</h2>
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
                        <h2>{t('profile.sectionEvents')}</h2>
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