import React, { useMemo, useState } from "react";
import "./Apartment.css";

const Apartment = () => {
    const apartmentInfo = {
        building: "Младост 3, бл. 325",
        entrance: "Б",
        number: "25",
        residents: 3,
        balance: 0.0,
        clientNumber: "12356787",
    };

    const [payments, setPayments] = useState([
        {
            month: "Януари",
            year: 2025,
            fee: 25.0,
            repair: 10.0,
            fund: 5.0,
            extra: 0.0,
            status: "overdue",
        },
        {
            month: "Февруари",
            year: 2025,
            fee: 25.0,
            repair: 0.0,
            fund: 5.0,
            extra: 0.0,
            status: "pending",
        },
        {
            month: "Март",
            year: 2025,
            fee: 25.0,
            repair: 0.0,
            fund: 5.0,
            extra: 0.0,
            status: "paid",
            paidAt: "12.03.2025",
        },
    ]);

    const [history, setHistory] = useState([
        "Март 2025 — Платено на 12.03.2025 г.",
    ]);

    const [maintenance] = useState([
        {
            date: "05.02.2025",
            description: "Почистване и дезинфекция на входа",
            cost: "20.00 лв.",
            status: "completed",
        },
        {
            date: "18.03.2025",
            description: "Профилактика на асансьора",
            cost: "60.00 лв.",
            status: "planned",
        },
    ]);

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
            `${selectedPayment.month} ${selectedPayment.year} — Платено на ${new Date().toLocaleDateString("bg-BG")}`,
            ...prev,
        ]);

        closePaymentModal();
        alert("Плащането беше успешно!");
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
            alert("Моля, попълнете всички полета за картата.");
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

        const lastPaid = history[0] || "Няма регистрирани плащания";

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

    return (
        <main className="apartment-page">
            <section className="ap-header">
                <h1>
                    Апартамент {apartmentInfo.number} – Вход {apartmentInfo.entrance}, {apartmentInfo.building}
                </h1>
                <p className="ap-header-subtitle">
                    Информация относно вашия имот
                </p>
            </section>

            <section className="ap-section ap-dashboard">
                <h2>Обобщение</h2>
                <div className="ap-dashboard-grid">
                    <div className="ap-dashboard-card">
                        <span className="label">Неплатени месеци</span>
                        <span className="value">{stats.unpaidCount}</span>
                    </div>
                    <div className="ap-dashboard-card">
                        <span className="label">Просрочени месеци</span>
                        <span className="value">{stats.overdueCount}</span>
                    </div>
                    <div className="ap-dashboard-card">
                        <span className="label">Общо дължимо</span>
                        <span className="value">
                            {stats.totalUnpaid.toFixed(2)} лв.
                        </span>
                    </div>
                    <div className="ap-dashboard-card">
                        <span className="label">Годишен разход</span>
                        <span className="value">
                            {stats.totalYear.toFixed(2)} лв.
                        </span>
                    </div>
                    <div className="ap-dashboard-card wide">
                        <span className="label">Последно плащане</span>
                        <span className="value small">{stats.lastPaid}</span>
                    </div>
                </div>
            </section>

            <section className="ap-section">
                <h2>Моят апартамент</h2>
                <div className="ap-info-grid">
                    <div className="ap-info-card">
                        <h4>{apartmentInfo.building}</h4>
                        <p>Сграда</p>
                    </div>
                    <div className="ap-info-card">
                        <h4>Вход {apartmentInfo.entrance}</h4>
                        <p>Вход</p>
                    </div>
                    <div className="ap-info-card">
                        <h4>Ап. {apartmentInfo.number}</h4>
                        <p>Номер</p>
                    </div>
                    <div className="ap-info-card">
                        <h4>{apartmentInfo.residents}</h4>
                        <p>Живущи</p>
                    </div>
                    <div className="ap-info-card">
                        <h4>{apartmentInfo.balance.toFixed(2)} лв.</h4>
                        <p>Баланс</p>
                    </div>
                    <div className="ap-info-card">
                        <h4>{apartmentInfo.clientNumber}</h4>
                        <p>Клиентски номер</p>
                    </div>
                </div>
            </section>

            <section className="ap-section">
                <div className="ap-section-header">
                    <h2>Финансов отчет — 2025 г.</h2>
                    <div className="ap-filters">
                        <input
                            type="text"
                            placeholder="Търси по месец..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">Всички</option>
                            <option value="pending">Очаква плащане</option>
                            <option value="overdue">Просрочено</option>
                            <option value="paid">Платено</option>
                        </select>
                    </div>
                </div>

                <div className="ap-table-wrapper">
                    <table className="ap-table">
                        <thead>
                            <tr>
                                <th>Месец</th>
                                <th>Такса поддръжка</th>
                                <th>Ремонт</th>
                                <th>Фонд „Ремонт“</th>
                                <th>Допълнителни разходи</th>
                                <th>Общо</th>
                                <th>Статус</th>
                                <th>Действие</th>
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
                                                {p.status === "paid" && "Платено"}
                                                {p.status === "pending" && "Очаква плащане"}
                                                {p.status === "overdue" && "Просрочено"}
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
                                                    Плати
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
                <h2>История на плащанията</h2>
                <ul className="ap-history">
                    {history.map((item, idx) => (
                        <li key={idx}>{item}</li>
                    ))}
                </ul>
            </section>

            <section className="ap-section">
                <h2>Ремонти и поддръжка</h2>
                <div className="ap-maintenance-list">
                    {maintenance.map((m, idx) => (
                        <div className="ap-maint-card" key={idx}>
                            <div className="row">
                                <span className="label">Дата</span>
                                <span className="value">{m.date}</span>
                            </div>
                            <div className="row">
                                <span className="label">Описание</span>
                                <span className="value">{m.description}</span>
                            </div>
                            <div className="row">
                                <span className="label">Сума</span>
                                <span className="value">{m.cost}</span>
                            </div>
                            <div className="row">
                                <span className="label">Статус</span>
                                <span className={`tag ${m.status}`}>
                                    {m.status === "completed" ? "Приключен" : "Планиран"}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="ap-section">
                <h2>Контакт с домоуправителя</h2>
                <form
                    className="ap-contact-form"
                    onSubmit={(e) => {
                        e.preventDefault();
                        alert("Съобщението е изпратено към домоуправителя.");
                        e.target.reset();
                    }}
                >
                    <div className="form-group">
                        <label>Тема</label>
                        <input type="text" name="subject" required />
                    </div>
                    <div className="form-group">
                        <label>Съобщение</label>
                        <textarea name="message" rows="4" required></textarea>
                    </div>
                    <button type="submit" className="contact-btn">
                        Изпрати съобщение
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
                        <h3>Потвърди плащането</h3>
                        {selectedPayment && (
                            <>
                                <p>
                                    Период: {selectedPayment.month} {selectedPayment.year}
                                </p>
                                <p>
                                    Сума за плащане:{" "}
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
                                    Банкова карта
                                </button>
                                <button
                                    type="button"
                                    className={
                                        "payment-tab" +
                                        (paymentMethod === "bank" ? " active" : "")
                                    }
                                    onClick={() => setPaymentMethod("bank")}
                                >
                                    Банков превод
                                </button>
                                <button
                                    type="button"
                                    className={
                                        "payment-tab" +
                                        (paymentMethod === "cash" ? " active" : "")
                                    }
                                    onClick={() => setPaymentMethod("cash")}
                                >
                                    В брой
                                </button>
                            </div>

                            <div className="payment-content">
                                {paymentMethod === "card" && (
                                    <form className="card-form" onSubmit={handleCardPay}>
                                        <div className="card-form-row">
                                            <label>Име на картодържателя</label>
                                            <input
                                                type="text"
                                                name="holder"
                                                value={cardData.holder}
                                                onChange={handleCardInputChange}
                                                placeholder="Напр. Иван Иванов"
                                            />
                                        </div>
                                        <div className="card-form-row">
                                            <label>Номер на карта</label>
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
                                                <label>Валидна до</label>
                                                <input
                                                    type="text"
                                                    name="expiry"
                                                    value={cardData.expiry}
                                                    onChange={handleCardInputChange}
                                                    placeholder="MM/ГГ"
                                                />
                                            </div>
                                            <div>
                                                <label>CVV</label>
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
                                            Плати с карта
                                        </button>

                                        <div className="wallet-buttons">
                                            <button
                                                type="button"
                                                className="wallet-btn google"
                                                onClick={() => handleWalletPay("Google Pay")}
                                            >
                                                Плати с Google Pay
                                            </button>
                                            <button
                                                type="button"
                                                className="wallet-btn apple"
                                                onClick={() => handleWalletPay("Apple Pay")}
                                            >
                                                Плати с Apple Pay
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {paymentMethod === "bank" && (
                                    <div className="bank-info">
                                        <p>
                                            Можете да платите по банков път, като използвате
                                            следните данни:
                                        </p>
                                        <p><strong>IBAN:</strong> BG00XXXX000000000000</p>
                                        <p><strong>Титуляр:</strong> Етажна собственост Младост 3, бл. 325</p>
                                        <p>
                                            <strong>Основание:</strong> Такса поддръжка – Ап. {apartmentInfo.number}
                                        </p>
                                        <button
                                            type="button"
                                            className="confirm-btn"
                                            onClick={confirmPayment}
                                        >
                                            Отбележи като платено
                                        </button>
                                    </div>
                                )}

                                {paymentMethod === "cash" && (
                                    <div className="cash-info">
                                        <p>
                                            Плащането ще бъде извършено в брой при домоуправителя.
                                        </p>
                                        <p>
                                            Моля, носете точната сума:{" "}
                                            <strong>
                                                {selectedPayment?.total.toFixed(2)} лв.
                                            </strong>
                                        </p>
                                        <button
                                            type="button"
                                            className="confirm-btn"
                                            onClick={confirmPayment}
                                        >
                                            Отбележи като платено
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
