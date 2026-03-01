import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./Entrance.css";
import { getBuildingApartments, isAuthenticated } from '../services/apiService';

const Entrance = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [building, setBuilding] = useState({ address: '', entrance: '' });
    const [floors, setFloors] = useState([]);

    // Fetch building apartments on mount
    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }

        const fetchBuilding = async () => {
            try {
                const data = await getBuildingApartments(1);
                if (data.error) {
                    setError(data.error);
                    return;
                }
                if (data.building) {
                    setBuilding(data.building);
                }
                if (data.floors) {
                    setFloors(data.floors);
                }
            } catch (err) {
                console.error('Failed to fetch building:', err);
                setError(t('entrance.fetchError'));
            } finally {
                setLoading(false);
            }
        };

        fetchBuilding();
    }, [navigate, t]);

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

    if (loading) {
        return <main className="entrance-container"><p style={{ textAlign: 'center', padding: '2rem' }}>{t('entrance.loading')}</p></main>;
    }

    if (error) {
        return (
            <main className="entrance-container">
                <p style={{ color: 'red', textAlign: 'center', padding: '2rem' }}>{error}</p>
            </main>
        );
    }

    return (
        <main className="entrance-container">
            <h1>{t('entrance.title', { entrance: building.entrance, address: building.address })}</h1>
            <p className="subtitle">{t('entrance.subtitle')}</p>

            {/* SEARCH + FILTERS */}
            <div className="search-filter-bar">
                <input
                    type="text"
                    placeholder={t('entrance.searchPlaceholder')}
                    className="search-input"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />

                <div className="filters">
                    <button
                        className={filter === "all" ? "active" : ""}
                        onClick={() => setFilter("all")}
                    >
                        {t('entrance.filterAll')}
                    </button>

                    <button
                        className={filter === "paid" ? "active" : ""}
                        onClick={() => setFilter("paid")}
                    >
                        {t('entrance.filterPaid')}
                    </button>

                    <button
                        className={filter === "pending" ? "active" : ""}
                        onClick={() => setFilter("pending")}
                    >
                        {t('entrance.filterPending')}
                    </button>

                    <button
                        className={filter === "overdue" ? "active" : ""}
                        onClick={() => setFilter("overdue")}
                    >
                        {t('entrance.filterOverdue')}
                    </button>
                </div>
            </div>

            {/* LEGEND */}
            <div className="legend">
                <span><span className="legend-item paid"></span> {t('entrance.legendPaid')}</span>
                <span><span className="legend-item pending"></span> {t('entrance.legendPending')}</span>
                <span><span className="legend-item overdue"></span> {t('entrance.legendOverdue')}</span>
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
                            <h2>{t('entrance.floorTitle', { floor: floor.floor })}</h2>

                            <div className="apartments">
                                {visibleApartments.map((ap) => (
                                    <div
                                        key={ap.number}
                                        className={`apartment ${ap.status}`}
                                        onClick={() => openPopup(ap)}
                                    >
                                        <span>{t('entrance.aptNumber', { number: ap.number })}</span>
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

                        <h3>{t('entrance.aptNumber', { number: selected.number })}</h3>
                        <p><strong>{t('entrance.popupFamily')}</strong> {selected.family}</p>
                        <p><strong>{t('entrance.popupBalance')}</strong> {selected.amount} лв.</p>

                        <p className={`status-label ${selected.status}`}>
                            {selected.status === "paid" && t('entrance.statusPaid')}
                            {selected.status === "pending" && t('entrance.statusPending')}
                            {selected.status === "overdue" && t('entrance.statusOverdue')}
                        </p>

                        <div className="popup-actions">
                            <button onClick={() => alert(t('entrance.historyAlert'))}>
                                {t('entrance.btnHistory')}
                            </button>
                            <button onClick={() => alert(t('entrance.messageAlert'))}>
                                {t('entrance.btnMessage')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default Entrance;
