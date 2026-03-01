import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./Apartment.css";
import { getApartmentDetails, isAuthenticated } from '../services/apiService';

const Apartment = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [apartmentInfo, setApartmentInfo] = useState({
        building: "",
        entrance: "",
        number: "",
        residents: 0,
        balance: 0.0,
        clientNumber: "",
    });

    const [payments, setPayments] = useState([]);
    const [history, setHistory] = useState([]);
    const [maintenance, setMaintenance] = useState([]);

    // Fetch apartment data on mount
    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }

        const fetchApartment = async () => {
            try {
                const data = await getApartmentDetails();
                if (data.error) {
                    if (data.error === 'No apartment found for user') {
                        setError(t('apartment.noApartment'));
                    } else {
                        setError(data.error);
                    }
                    return;
                }

                if (data.apartmentInfo) {
                    setApartmentInfo(data.apartmentInfo);
                }
                if (data.payments) {
                    setPayments(data.payments);
                    // Build history from paid payments
                    const paidHistory = data.payments
                        .filter(p => p.status === 'paid' && p.paidAt)
                        .map(p => t('apartment.paidAtFormat', { month: p.month, year: p.year, date: p.paidAt }));
                    setHistory(paidHistory.length > 0 ? paidHistory : [t('apartment.noPaymentsHistory')]);
                }
                if (data.maintenance) {
                    setMaintenance(data.maintenance);
                }
            } catch (err) {
                console.error('Failed to fetch apartment:', err);
                setError(t('apartment.fetchError'));
            } finally {
                setLoading(false);
            }
        };

        fetchApartment();
    }, [navigate]);

    const [statusFilter, setStatusFilter] = useState("all");
    const [search, setSearch] = useState("");

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);

    const [paymentMethod, setPaymentMethod] = useState("card");
    const [cardData, setCardData] = useState({
        holder: "",
        number: "",
        expiry: "",
        cvv: "",
    });

    const openPaymentModal = (payment) => {
        setSelectedPayment(payment);
        setPaymentMethod("card");
        setCardData({
            holder: "",
            number: "",
            expiry: "",
            cvv: "",
        });
        setModalOpen(true);
    };

    const closePaymentModal = () => {
        setModalOpen(false);
        setSelectedPayment(null);
    };

    const confirmPayment = () => {
        if (!selectedPayment) return;

        const updated = payments.map((p) => {
            if (p.month === selectedPayment.month && p.year === selectedPayment.year) {
                return {
                    ...p,
                    status: "paid",
                    paidAt: new Date().toLocaleDateString("bg-BG"),
                };
            }
            return p;
        });

        setPayments(updated);
        setHistory((prev) => [
            t('apartment.paidAtFormat', { month: selectedPayment.month, year: selectedPayment.year, date: new Date().toLocaleDateString("bg-BG") }),
            ...prev,
        ]);

        closePaymentModal();
        alert(t('apartment.paymentSuccessAlert'));
    };

    const handleCardInputChange = (e) => {
        const { name, value } = e.target;
        setCardData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleCardPay = (e) => {
        e.preventDefault();

        if (!cardData.holder || !cardData.number || !cardData.expiry || !cardData.cvv) {
            alert(t('apartment.fillCardFieldsAlert'));
            return;
        }

        // Тук реално бихте викнали бекенд / платежен провайдър
        console.log("Симулация на плащане с карта:", cardData);

        confirmPayment();
    };

    const handleWalletPay = (provider) => {
        // Placeholder за Google/Apple Pay интеграция
        alert(`Симулация: плащане чрез ${provider}.`);
        confirmPayment();
    };

    const stats = useMemo(() => {
        const totalYear = payments.reduce(
            (sum, p) => sum + p.fee + p.repair + p.fund + p.extra,
            0
        );
        const unpaid = payments.filter((p) => p.status !== "paid");
        const overdue = payments.filter((p) => p.status === "overdue");

        const lastPaid = history[0] || t('apartment.noPaymentsHistory');

        const totalUnpaid = unpaid.reduce(
            (sum, p) => sum + p.fee + p.repair + p.fund + p.extra,
            0
        );

        return {
            totalYear,
            unpaidCount: unpaid.length,
            overdueCount: overdue.length,
            totalUnpaid,
            lastPaid,
        };
    }, [payments, history]);

    const filteredPayments = useMemo(() => {
        return payments.filter((p) => {
            if (statusFilter !== "all" && p.status !== statusFilter) return false;

            if (
                search &&
                !`${p.month} ${p.year}`
                    .toLowerCase()
                    .includes(search.toLowerCase())
            ) {
                return false;
            }

            return true;
        });
    }, [payments, statusFilter, search]);

    if (loading) {
        return <main className="apartment-page"><p style={{ textAlign: 'center', padding: '2rem' }}>{t('apartment.loading')}</p></main>;
    }

    if (error) {
        return (
            <main className="apartment-page">
                <p style={{ color: 'red', textAlign: 'center', padding: '2rem' }}>{error}</p>
            </main>
        );
    }

    return (
        <main className="apartment-page">
            <section className="ap-header">
                <h1>
                    {t('apartment.title', { number: apartmentInfo.number, entrance: apartmentInfo.entrance, building: apartmentInfo.building })}
                </h1>
                <p className="ap-header-subtitle">
                    {t('apartment.subtitle')}
                </p>
            </section>

            <section className="ap-section ap-dashboard">
                <h2>{t('apartment.summaryTitle')}</h2>
                <div className="ap-dashboard-grid">
                    <div className="ap-dashboard-card">
                        <span className="label">{t('apartment.unpaidMonths')}</span>
                        <span className="value">{stats.unpaidCount}</span>
                    </div>
                    <div className="ap-dashboard-card">
                        <span className="label">{t('apartment.overdueMonths')}</span>
                        <span className="value">{stats.overdueCount}</span>
                    </div>
                    <div className="ap-dashboard-card">
                        <span className="label">{t('apartment.totalDue')}</span>
                        <span className="value">
                            {stats.totalUnpaid.toFixed(2)} лв.
                        </span>
                    </div>
                    <div className="ap-dashboard-card">
                        <span className="label">{t('apartment.yearlyExpense')}</span>
                        <span className="value">
                            {stats.totalYear.toFixed(2)} лв.
                        </span>
                    </div>
                    <div className="ap-dashboard-card wide">
                        <span className="label">{t('apartment.lastPayment')}</span>
                        <span className="value small">{stats.lastPaid}</span>
                    </div>
                </div>
            </section>

            <section className="ap-section">
                <h2>{t('apartment.myApartmentTitle')}</h2>
                <div className="ap-info-grid">
                    <div className="ap-info-card">
                        <h4>{apartmentInfo.building}</h4>
                        <p>{t('apartment.propBuilding')}</p>
                    </div>
                    <div className="ap-info-card">
                        <h4>{t('apartment.propEntrance')} {apartmentInfo.entrance}</h4>
                        <p>{t('apartment.propEntrance')}</p>
                    </div>
                    <div className="ap-info-card">
                        <h4>{t('apartment.propNumber')} {apartmentInfo.number}</h4>
                        <p>{t('apartment.propNumber')}</p>
                    </div>
                    <div className="ap-info-card">
                        <h4>{apartmentInfo.residents}</h4>
                        <p>{t('apartment.propResidents')}</p>
                    </div>
                    <div className="ap-info-card">
                        <h4>{apartmentInfo.balance.toFixed(2)} лв.</h4>
                        <p>{t('apartment.propBalance')}</p>
                    </div>
                    <div className="ap-info-card">
                        <h4>{apartmentInfo.clientNumber}</h4>
                        <p>{t('apartment.propClientNum')}</p>
                    </div>
                </div>
            </section>

            <section className="ap-section">
                <div className="ap-section-header">
                    <h2>{t('apartment.financeReportTitle')}</h2>
                    <div className="ap-filters">
                        <input
                            type="text"
                            placeholder={t('apartment.searchPlaceholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">{t('apartment.filterAll')}</option>
                            <option value="pending">{t('apartment.filterPending')}</option>
                            <option value="overdue">{t('apartment.filterOverdue')}</option>
                            <option value="paid">{t('apartment.filterPaid')}</option>
                        </select>
                    </div>
                </div>

                <div className="ap-table-wrapper">
                    <table className="ap-table">
                        <thead>
                            <tr>
                                <th>{t('apartment.thMonth')}</th>
                                <th>{t('apartment.thMaintenanceFee')}</th>
                                <th>{t('apartment.thRepair')}</th>
                                <th>{t('apartment.thFundRepair')}</th>
                                <th>{t('apartment.thExtra')}</th>
                                <th>{t('apartment.thTotal')}</th>
                                <th>{t('apartment.thStatus')}</th>
                                <th>{t('apartment.thAction')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPayments.map((p, idx) => {
                                const total = p.fee + p.repair + p.fund + p.extra;
                                return (
                                    <tr
                                        key={idx}
                                        className={p.status === "paid" ? "paid-row" : ""}
                                    >
                                        <td>
                                            {p.month} {p.year}
                                        </td>
                                        <td>{p.fee.toFixed(2)} лв.</td>
                                        <td>{p.repair.toFixed(2)} лв.</td>
                                        <td>{p.fund.toFixed(2)} лв.</td>
                                        <td>{p.extra.toFixed(2)} лв.</td>
                                        <td>
                                            <strong>{total.toFixed(2)} лв.</strong>
                                        </td>
                                        <td>
                                            <span className={`status ${p.status}`}>
                                                {p.status === "paid" && t('apartment.statusPaid')}
                                                {p.status === "pending" && t('apartment.statusPending')}
                                                {p.status === "overdue" && t('apartment.statusOverdue')}
                                            </span>
                                        </td>
                                        <td>
                                            {p.status === "paid" ? (
                                                <button className="pay-btn disabled" disabled>
                                                    ✔
                                                </button>
                                            ) : (
                                                <button
                                                    className="pay-btn"
                                                    onClick={() =>
                                                        openPaymentModal({
                                                            month: p.month,
                                                            year: p.year,
                                                            total,
                                                        })
                                                    }
                                                >
                                                    {t('apartment.btnPay')}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="ap-section">
                <h2>{t('apartment.historyTitle')}</h2>
                <ul className="ap-history">
                    {history.map((item, idx) => (
                        <li key={idx}>{item}</li>
                    ))}
                </ul>
            </section>

            <section className="ap-section">
                <h2>{t('apartment.maintenanceTitle')}</h2>
                <div className="ap-maintenance-list">
                    {maintenance.map((m, idx) => (
                        <div className="ap-maint-card" key={idx}>
                            <div className="row">
                                <span className="label">{t('apartment.maintDate')}</span>
                                <span className="value">{m.date}</span>
                            </div>
                            <div className="row">
                                <span className="label">{t('apartment.maintDesc')}</span>
                                <span className="value">{m.description}</span>
                            </div>
                            <div className="row">
                                <span className="label">{t('apartment.maintCost')}</span>
                                <span className="value">{m.cost}</span>
                            </div>
                            <div className="row">
                                <span className="label">{t('apartment.maintStatus')}</span>
                                <span className={`tag ${m.status}`}>
                                    {m.status === "completed" ? t('apartment.maintCompleted') : t('apartment.maintPlanned')}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="ap-section">
                <h2>{t('apartment.contactTitle')}</h2>
                <form
                    className="ap-contact-form"
                    onSubmit={(e) => {
                        e.preventDefault();
                        alert(t('apartment.contactSuccessAlert'));
                        e.target.reset();
                    }}
                >
                    <div className="form-group">
                        <label>{t('apartment.contactSubject')}</label>
                        <input type="text" name="subject" required />
                    </div>
                    <div className="form-group">
                        <label>{t('apartment.contactMessage')}</label>
                        <textarea name="message" rows="4" required></textarea>
                    </div>
                    <button type="submit" className="contact-btn">
                        {t('apartment.btnSend')}
                    </button>
                </form>
            </section>

            {modalOpen && (
                <div className="ap-modal" onClick={closePaymentModal}>
                    <div
                        className="ap-modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button className="close-btn" onClick={closePaymentModal}>
                            ×
                        </button>
                        <h3>{t('apartment.modalConfirmPayment')}</h3>
                        {selectedPayment && (
                            <>
                                <p>
                                    {t('apartment.modalPeriod')} {selectedPayment.month} {selectedPayment.year}
                                </p>
                                <p>
                                    {t('apartment.modalAmountDue')}{" "}
                                    <strong>
                                        {selectedPayment.total.toFixed(2)} лв.
                                    </strong>
                                </p>
                            </>
                        )}

                        <div className="payment-methods">
                            <div className="payment-tabs">
                                <button
                                    type="button"
                                    className={
                                        "payment-tab" +
                                        (paymentMethod === "card" ? " active" : "")
                                    }
                                    onClick={() => setPaymentMethod("card")}
                                >
                                    {t('apartment.tabCard')}
                                </button>
                                <button
                                    type="button"
                                    className={
                                        "payment-tab" +
                                        (paymentMethod === "bank" ? " active" : "")
                                    }
                                    onClick={() => setPaymentMethod("bank")}
                                >
                                    {t('apartment.tabBank')}
                                </button>
                                <button
                                    type="button"
                                    className={
                                        "payment-tab" +
                                        (paymentMethod === "cash" ? " active" : "")
                                    }
                                    onClick={() => setPaymentMethod("cash")}
                                >
                                    {t('apartment.tabCash')}
                                </button>
                            </div>

                            <div className="payment-content">
                                {paymentMethod === "card" && (
                                    <form className="card-form" onSubmit={handleCardPay}>
                                        <div className="card-form-row">
                                            <label>{t('apartment.cardHolder')}</label>
                                            <input
                                                type="text"
                                                name="holder"
                                                value={cardData.holder}
                                                onChange={handleCardInputChange}
                                                placeholder="Напр. Иван Иванов"
                                            />
                                        </div>
                                        <div className="card-form-row">
                                            <label>{t('apartment.cardNumber')}</label>
                                            <input
                                                type="text"
                                                name="number"
                                                value={cardData.number}
                                                onChange={handleCardInputChange}
                                                placeholder="1234 5678 9012 3456"
                                            />
                                        </div>
                                        <div className="card-form-row card-form-row-inline">
                                            <div>
                                                <label>{t('apartment.cardExpiry')}</label>
                                                <input
                                                    type="text"
                                                    name="expiry"
                                                    value={cardData.expiry}
                                                    onChange={handleCardInputChange}
                                                    placeholder="MM/ГГ"
                                                />
                                            </div>
                                            <div>
                                                <label>{t('apartment.cardCvv')}</label>
                                                <input
                                                    type="password"
                                                    name="cvv"
                                                    maxLength={4}
                                                    value={cardData.cvv}
                                                    onChange={handleCardInputChange}
                                                    placeholder="***"
                                                />
                                            </div>
                                        </div>

                                        <button type="submit" className="confirm-btn main">
                                            {t('apartment.btnPayCard')}
                                        </button>

                                        <div className="wallet-buttons">
                                            <button
                                                type="button"
                                                className="wallet-btn google"
                                                onClick={() => handleWalletPay("Google Pay")}
                                            >
                                                {t('apartment.btnGooglePay')}
                                            </button>
                                            <button
                                                type="button"
                                                className="wallet-btn apple"
                                                onClick={() => handleWalletPay("Apple Pay")}
                                            >
                                                {t('apartment.btnApplePay')}
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {paymentMethod === "bank" && (
                                    <div className="bank-info">
                                        <p>
                                            {t('apartment.bankInfoText')}
                                        </p>
                                        <p><strong>{t('apartment.bankIban')}</strong> BG00XXXX000000000000</p>
                                        <p><strong>{t('apartment.bankHolder')}</strong> {t('apartment.bankHolderValue')}</p>
                                        <p>
                                            <strong>{t('apartment.bankReason')}{apartmentInfo.number}</strong>
                                        </p>
                                        <button
                                            type="button"
                                            className="confirm-btn"
                                            onClick={confirmPayment}
                                        >
                                            {t('apartment.btnMarkAsPaid')}
                                        </button>
                                    </div>
                                )}

                                {paymentMethod === "cash" && (
                                    <div className="cash-info">
                                        <p>
                                            {t('apartment.cashInfoText')}
                                        </p>
                                        <p>
                                            {t('apartment.cashExactAmount')}
                                            <strong>
                                                {selectedPayment?.total.toFixed(2)} лв.
                                            </strong>
                                        </p>
                                        <button
                                            type="button"
                                            className="confirm-btn"
                                            onClick={confirmPayment}
                                        >
                                            {t('apartment.btnMarkAsPaid')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default Apartment;
