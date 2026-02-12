import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminResidents.css";
import { getAdminResidents, isAuthenticated } from '../services/apiService';

const AdminResidents = () => {
    const navigate = useNavigate();
    const [residents, setResidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [search, setSearch] = useState("");
    const [buildingFilter, setBuildingFilter] = useState("all");
    const [entranceFilter, setEntranceFilter] = useState("all");
    const [onlyDebtors, setOnlyDebtors] = useState(false);

    // eslint-disable-next-line no-unused-vars
    const [selectedResident, setSelectedResident] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    // Fetch residents on mount
    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }

        const fetchResidents = async () => {
            try {
                const data = await getAdminResidents();
                if (data.error) {
                    setError(data.error);
                    return;
                }
                if (data.residents) {
                    setResidents(data.residents);
                }
            } catch (err) {
                console.error('Failed to fetch residents:', err);
                setError('Грешка при зареждане на данните');
            } finally {
                setLoading(false);
            }
        };

        fetchResidents();
    }, [navigate]);

    // Get unique buildings for filter dropdown
    // eslint-disable-next-line no-unused-vars
    const buildings = useMemo(() => {
        const unique = [...new Set(residents.map(r => r.building).filter(b => b))];
        return unique;
    }, [residents]);

    // отваряне на форма за редакция
    const openEdit = (resident) => {
        setSelectedResident(resident);
        setEditForm({ ...resident });
        setIsEditing(true);
    };

    const closeEdit = () => {
        setSelectedResident(null);
        setEditForm(null);
        setIsEditing(false);
    };

    const handleEditChange = (e) => {
        const { name, value, type, checked } = e.target;
        setEditForm((prev) => ({
            ...prev,
            [name]:
                type === "checkbox"
                    ? checked
                    : name === "residentsCount" ||
                        name === "balance" ||
                        name === "totalDebt"
                        ? Number(value)
                        : value,
        }));
    };

    const saveResident = (e) => {
        e.preventDefault();
        if (!editForm) return;

        setResidents((prev) =>
            prev.map((r) => (r.id === editForm.id ? editForm : r))
        );
        closeEdit();
        alert("Профилът е обновен успешно.");
    };

    const addNewResident = () => {
        const newId = residents.length
            ? Math.max(...residents.map((r) => r.id)) + 1
            : 1;

        const newResident = {
            id: newId,
            name: "Нов живущ",
            email: "",
            building: "",
            entrance: "",
            apartment: "",
            clientNumber: "",
            residentsCount: 1,
            balance: 0,
            totalDebt: 0,
            role: "Потребител",
            isActive: true,
        };

        setResidents((prev) => [newResident, ...prev]);
        openEdit(newResident);
    };

    const resetPassword = (resident) => {
        alert(
            `Тук можеш да извикаш бекенд за ресет на паролата за: ${resident.email}`
        );
    };

    const filteredResidents = useMemo(() => {
        return residents.filter((r) => {
            if (onlyDebtors && r.totalDebt <= 0) return false;

            if (
                buildingFilter !== "all" &&
                r.building.toLowerCase() !== buildingFilter.toLowerCase()
            ) {
                return false;
            }

            if (
                entranceFilter !== "all" &&
                r.entrance.toLowerCase() !== entranceFilter.toLowerCase()
            ) {
                return false;
            }

            if (search) {
                const text = (
                    r.name +
                    " " +
                    r.email +
                    " " +
                    r.apartment +
                    " " +
                    r.clientNumber
                ).toLowerCase();
                if (!text.includes(search.toLowerCase())) return false;
            }

            return true;
        });
    }, [residents, search, buildingFilter, entranceFilter, onlyDebtors]);

    const totalUsers = residents.length;
    const activeUsers = residents.filter((r) => r.isActive).length;
    const totalDebtSum = residents.reduce((sum, r) => sum + (r.totalDebt || 0), 0);

    if (loading) {
        return <main className="admin-page"><p style={{ textAlign: 'center', padding: '2rem' }}>Зареждане...</p></main>;
    }

    if (error) {
        return (
            <main className="admin-page">
                <p style={{ color: 'red', textAlign: 'center', padding: '2rem' }}>{error}</p>
            </main>
        );
    }

    return (
        <main className="admin-page">
            <header className="admin-header">
                <div>
                    <h1>Админ панел — Профили на живущите</h1>
                    <p className="admin-subtitle">
                        Управлявайте профилите, данните и достъпа на всички живущи.
                    </p>
                </div>
                <button className="admin-add-btn" onClick={addNewResident}>
                    + Нов профил
                </button>
            </header>

            {/* Обобщение */}
            <section className="admin-section admin-stats">
                <div className="admin-stat-card">
                    <span className="label">Общ брой профили</span>
                    <span className="value">{totalUsers}</span>
                </div>
                <div className="admin-stat-card">
                    <span className="label">Активни профили</span>
                    <span className="value">{activeUsers}</span>
                </div>
                <div className="admin-stat-card">
                    <span className="label">Общ размер на задълженията</span>
                    <span className="value">
                        {totalDebtSum.toFixed(2)} лв.
                    </span>
                </div>
            </section>

            {/* Филтри */}
            <section className="admin-section">
                <div className="admin-filters">
                    <div className="filter-group">
                        <label>Търсене</label>
                        <input
                            type="text"
                            placeholder="Име, имейл, апартамент, клиентски №..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="filter-group">
                        <label>Сграда</label>
                        <select
                            value={buildingFilter}
                            onChange={(e) => setBuildingFilter(e.target.value)}
                        >
                            <option value="all">Всички</option>
                            <option value="Младост 3, бл. 325">
                                Младост 3, бл. 325
                            </option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Вход</label>
                        <select
                            value={entranceFilter}
                            onChange={(e) => setEntranceFilter(e.target.value)}
                        >
                            <option value="all">Всички</option>
                            <option value="А">А</option>
                            <option value="Б">Б</option>
                            <option value="В">В</option>
                        </select>
                    </div>

                    <div className="filter-group checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={onlyDebtors}
                                onChange={(e) => setOnlyDebtors(e.target.checked)}
                            />
                            Само със задължения
                        </label>
                    </div>
                </div>
            </section>

            <section className="admin-section">
                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Име</th>
                                <th>Имейл</th>
                                <th>Сграда</th>
                                <th>Вход</th>
                                <th>Ап.</th>
                                <th>Кл. №</th>
                                <th>Живущи</th>
                                <th>Баланс</th>
                                <th>Задължение</th>
                                <th>Статус</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredResidents.length === 0 ? (
                                <tr>
                                    <td colSpan="11" className="no-data">
                                        Няма намерени профили по зададените критерии.
                                    </td>
                                </tr>
                            ) : (
                                filteredResidents.map((r) => (
                                    <tr key={r.id}>
                                        <td>{r.name}</td>
                                        <td>{r.email || "—"}</td>
                                        <td>{r.building || "—"}</td>
                                        <td>{r.entrance || "—"}</td>
                                        <td>{r.apartment || "—"}</td>
                                        <td>{r.clientNumber || "—"}</td>
                                        <td>{r.residentsCount}</td>
                                        <td>{r.balance.toFixed(2)} лв.</td>
                                        <td>{r.totalDebt.toFixed(2)} лв.</td>
                                        <td>
                                            <span
                                                className={
                                                    "status-pill " +
                                                    (r.isActive ? "active" : "inactive")
                                                }
                                            >
                                                {r.isActive ? "Активен" : "Блокиран"}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="table-actions">
                                                <button
                                                    className="small-btn"
                                                    onClick={() => openEdit(r)}
                                                >
                                                    Редактирай
                                                </button>
                                                <button
                                                    className="small-btn secondary"
                                                    onClick={() => resetPassword(r)}
                                                >
                                                    Ресет парола
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {isEditing && editForm && (
                <div className="admin-modal" onClick={closeEdit}>
                    <div
                        className="admin-modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button className="admin-close-btn" onClick={closeEdit}>
                            ×
                        </button>
                        <h2>Редакция на профил</h2>
                        <form onSubmit={saveResident} className="admin-edit-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Име</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={editForm.name}
                                        onChange={handleEditChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Имейл</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={editForm.email}
                                        onChange={handleEditChange}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Сграда</label>
                                    <input
                                        type="text"
                                        name="building"
                                        value={editForm.building}
                                        onChange={handleEditChange}
                                    />
                                </div>
                                <div className="form-group small">
                                    <label>Вход</label>
                                    <input
                                        type="text"
                                        name="entrance"
                                        value={editForm.entrance}
                                        onChange={handleEditChange}
                                    />
                                </div>
                                <div className="form-group small">
                                    <label>Апартамент</label>
                                    <input
                                        type="text"
                                        name="apartment"
                                        value={editForm.apartment}
                                        onChange={handleEditChange}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group small">
                                    <label>Живущи</label>
                                    <input
                                        type="number"
                                        name="residentsCount"
                                        min="1"
                                        value={editForm.residentsCount}
                                        onChange={handleEditChange}
                                    />
                                </div>
                                <div className="form-group small">
                                    <label>Баланс (лв.)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="balance"
                                        value={editForm.balance}
                                        onChange={handleEditChange}
                                    />
                                </div>
                                <div className="form-group small">
                                    <label>Задължение (лв.)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="totalDebt"
                                        value={editForm.totalDebt}
                                        onChange={handleEditChange}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Клиентски номер</label>
                                    <input
                                        type="text"
                                        name="clientNumber"
                                        value={editForm.clientNumber}
                                        onChange={handleEditChange}
                                    />
                                </div>
                                <div className="form-group small">
                                    <label>Роля</label>
                                    <select
                                        name="role"
                                        value={editForm.role}
                                        onChange={handleEditChange}
                                    >
                                        <option value="Потребител">Потребител</option>
                                        <option value="Домоуправител">
                                            Домоуправител
                                        </option>
                                        <option value="Админ">Админ</option>
                                    </select>
                                </div>
                                <div className="form-group checkbox-group">
                                    <label>
                                        <input
                                            type="checkbox"
                                            name="isActive"
                                            checked={editForm.isActive}
                                            onChange={handleEditChange}
                                        />
                                        Активен профил
                                    </label>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="cancel-btn"
                                    onClick={closeEdit}
                                >
                                    Отказ
                                </button>
                                <button type="submit" className="save-btn">
                                    Запази промените
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
};

export default AdminResidents;
