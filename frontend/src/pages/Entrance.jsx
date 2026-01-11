import React, { useState } from "react";
import "./Entrance.css";

const Entrance = () => {
    const floors = [
        {
        floor: 1,
        apartments: [
            { number: 25, family: "Иванови", amount: 0, status: "paid" },
            { number: 26, family: "Георгиеви", amount: 15, status: "pending" },
            { number: 27, family: "Петрови", amount: 45, status: "overdue" },
        ],
        },
        {
        floor: 2,
        apartments: [
            { number: 22, family: "Ангелови", amount: 0, status: "paid" },
            { number: 23, family: "Симеонови", amount: 25, status: "pending" },
            { number: 24, family: "Тодорови", amount: 60, status: "overdue" },
        ],
        },
    ];

    const [selected, setSelected] = useState(null);

    // търсачка + филтри
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState("all");

    const openPopup = (apt) => setSelected(apt);
    const closePopup = () => setSelected(null);

    // ▶ обработка на филтрите
    const matchSearch = (apt) => {
        const text =
        `${apt.number} ${apt.family} ${apt.amount} ${apt.status}`.toLowerCase();
        return text.includes(query.toLowerCase());
    };

    const matchFilter = (apt) => {
        if (filter === "all") return true;
        return apt.status === filter;
    };

    return (
        <main className="entrance-container">
        <h1>Вход Б – Младост 3, бл. 325</h1>
        <p className="subtitle">Проверете статуса на всеки апартамент</p>

        {/* SEARCH + FILTERS */}
        <div className="search-filter-bar">
            <input
            type="text"
            placeholder="Търси по номер или фамилия..."
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            />

            <div className="filters">
            <button
                className={filter === "all" ? "active" : ""}
                onClick={() => setFilter("all")}
            >
                Всички
            </button>

            <button
                className={filter === "paid" ? "active" : ""}
                onClick={() => setFilter("paid")}
            >
                ✔ Платено
            </button>

            <button
                className={filter === "pending" ? "active" : ""}
                onClick={() => setFilter("pending")}
            >
                ⏳ Задължение
            </button>

            <button
                className={filter === "overdue" ? "active" : ""}
                onClick={() => setFilter("overdue")}
            >
                ⚠ Просрочено
            </button>
            </div>
        </div>

        {/* LEGEND */}
        <div className="legend">
            <span><span className="legend-item paid"></span> Платено</span>
            <span><span className="legend-item pending"></span> Задължение</span>
            <span><span className="legend-item overdue"></span> Просрочено</span>
        </div>

        {/* FLOORS */}
        <section className="building">
            {floors.map((floor) => {
            const visibleApartments = floor.apartments.filter(
                (apt) => matchSearch(apt) && matchFilter(apt)
            );

            if (visibleApartments.length === 0) return null;

            return (
                <div key={floor.floor} className="floor">
                <h2>Етаж {floor.floor}</h2>

                <div className="apartments">
                    {visibleApartments.map((ap) => (
                    <div
                        key={ap.number}
                        className={`apartment ${ap.status}`}
                        onClick={() => openPopup(ap)}
                    >
                        <span>Ап. {ap.number}</span>
                        <p>{ap.amount} лв</p>
                        <small>{ap.family}</small>
                    </div>
                    ))}
                </div>
                </div>
            );
            })}
        </section>

        {/* POPUP */}
        {selected && (
            <div className="popup active" onClick={closePopup}>
            <div className="popup-content" onClick={(e) => e.stopPropagation()}>
                <span className="close-btn" onClick={closePopup}>
                ×
                </span>

                <h3>Ап. {selected.number}</h3>
                <p><strong>Фамилия:</strong> {selected.family}</p>
                <p><strong>Баланс:</strong> {selected.amount} лв.</p>

                <p className={`status-label ${selected.status}`}>
                {selected.status === "paid" && "Платено"}
                {selected.status === "pending" && "Задължение"}
                {selected.status === "overdue" && "Просрочено"}
                </p>

                <div className="popup-actions">
                <button onClick={() => alert("История на плащанията...")}>
                    История
                </button>
                <button onClick={() => alert("Изпращане на съобщение...")}>
                    Съобщение
                </button>
                </div>
            </div>
            </div>
        )}
        </main>
    );
};

export default Entrance;
