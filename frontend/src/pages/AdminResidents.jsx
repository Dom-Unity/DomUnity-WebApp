import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./AdminResidents.css";
import { getAdminResidents, isAuthenticated } from '../services/apiService';

const AdminResidents = () => {
    const { t } = useTranslation();
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
                setError(t('adminResidents.fetchError'));
            } finally {
                setLoading(false);
            }
        };

        fetchResidents();
    }, [navigate, t]);

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
        alert(t('adminResidents.alertProfileUpdated'));
    };

    const addNewResident = () => {
        const newId = residents.length
            ? Math.max(...residents.map((r) => r.id)) + 1
            : 1;

        const newResident = {
            id: newId,
            name: t('adminResidents.newResidentName'),
            email: "",
            building: "",
            entrance: "",
            apartment: "",
            clientNumber: "",
            residentsCount: 1,
            balance: 0,
            totalDebt: 0,
            role: t('adminResidents.roleUser'),
            isActive: true,
        };

        setResidents((prev) => [newResident, ...prev]);
        openEdit(newResident);
    };

    const resetPassword = (resident) => {
        alert(
            t('adminResidents.alertResetPassword') + resident.email
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
        return <main className="admin-page"><p style={{ textAlign: 'center', padding: '2rem' }}>{t('adminResidents.loading')}</p></main>;
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
                    <h1>{t('adminResidents.title')}</h1>
                    <p className="admin-subtitle">
                        {t('adminResidents.subtitle')}
                    </p>
                </div>
                <button className="admin-add-btn" onClick={addNewResident}>
                    {t('adminResidents.btnAddResident')}
                </button>
            </header>

            {/* Обобщение */}
            <section className="admin-section admin-stats">
                <div className="admin-stat-card">
                    <span className="label">{t('adminResidents.statTotalProfiles')}</span>
                    <span className="value">{totalUsers}</span>
                </div>
                <div className="admin-stat-card">
                    <span className="label">{t('adminResidents.statActiveProfiles')}</span>
                    <span className="value">{activeUsers}</span>
                </div>
                <div className="admin-stat-card">
                    <span className="label">{t('adminResidents.statTotalDebt')}</span>
                    <span className="value">
                        {totalDebtSum.toFixed(2)} лв.
                    </span>
                </div>
            </section>

            {/* Филтри */}
            <section className="admin-section">
                <div className="admin-filters">
                    <div className="filter-group">
                        <label>{t('adminResidents.filterSearchLabel')}</label>
                        <input
                            type="text"
                            placeholder={t('adminResidents.filterSearchPlaceholder')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="filter-group">
                        <label>{t('adminResidents.filterBuildingLabel')}</label>
                        <select
                            value={buildingFilter}
                            onChange={(e) => setBuildingFilter(e.target.value)}
                        >
                            <option value="all">{t('adminResidents.filterAll')}</option>
                            <option value="Младост 3, бл. 325">
                                Младост 3, бл. 325
                            </option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>{t('adminResidents.filterEntranceLabel')}</label>
                        <select
                            value={entranceFilter}
                            onChange={(e) => setEntranceFilter(e.target.value)}
                        >
                            <option value="all">{t('adminResidents.filterAll')}</option>
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
                            {t('adminResidents.filterOnlyDebtors')}
                        </label>
                    </div>
                </div>
            </section>

            <section className="admin-section">
                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>{t('adminResidents.thName')}</th>
                                <th>{t('adminResidents.thEmail')}</th>
                                <th>{t('adminResidents.thBuilding')}</th>
                                <th>{t('adminResidents.thEntrance')}</th>
                                <th>{t('adminResidents.thAp')}</th>
                                <th>{t('adminResidents.thClientNum')}</th>
                                <th>{t('adminResidents.thResidents')}</th>
                                <th>{t('adminResidents.thBalance')}</th>
                                <th>{t('adminResidents.thDebt')}</th>
                                <th>{t('adminResidents.thStatus')}</th>
                                <th>{t('adminResidents.thActions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredResidents.length === 0 ? (
                                <tr>
                                    <td colSpan="11" className="no-data">
                                        {t('adminResidents.noData')}
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
                                                {r.isActive ? t('adminResidents.statusActive') : t('adminResidents.statusBlocked')}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="table-actions">
                                                <button
                                                    className="small-btn"
                                                    onClick={() => openEdit(r)}
                                                >
                                                    {t('adminResidents.btnEdit')}
                                                </button>
                                                <button
                                                    className="small-btn secondary"
                                                    onClick={() => resetPassword(r)}
                                                >
                                                    {t('adminResidents.btnResetPassword')}
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
                        <h2>{t('adminResidents.modalTitle')}</h2>
                        <form onSubmit={saveResident} className="admin-edit-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>{t('adminResidents.labelName')}</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={editForm.name}
                                        onChange={handleEditChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>{t('adminResidents.labelEmail')}</label>
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
                                    <label>{t('adminResidents.labelBuilding')}</label>
                                    <input
                                        type="text"
                                        name="building"
                                        value={editForm.building}
                                        onChange={handleEditChange}
                                    />
                                </div>
                                <div className="form-group small">
                                    <label>{t('adminResidents.labelEntrance')}</label>
                                    <input
                                        type="text"
                                        name="entrance"
                                        value={editForm.entrance}
                                        onChange={handleEditChange}
                                    />
                                </div>
                                <div className="form-group small">
                                    <label>{t('adminResidents.labelApartment')}</label>
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
                                    <label>{t('adminResidents.labelResidentsCount')}</label>
                                    <input
                                        type="number"
                                        name="residentsCount"
                                        min="1"
                                        value={editForm.residentsCount}
                                        onChange={handleEditChange}
                                    />
                                </div>
                                <div className="form-group small">
                                    <label>{t('adminResidents.labelBalance')}</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="balance"
                                        value={editForm.balance}
                                        onChange={handleEditChange}
                                    />
                                </div>
                                <div className="form-group small">
                                    <label>{t('adminResidents.labelTotalDebt')}</label>
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
                                    <label>{t('adminResidents.labelClientNum')}</label>
                                    <input
                                        type="text"
                                        name="clientNumber"
                                        value={editForm.clientNumber}
                                        onChange={handleEditChange}
                                    />
                                </div>
                                <div className="form-group small">
                                    <label>{t('adminResidents.labelRole')}</label>
                                    <select
                                        name="role"
                                        value={editForm.role}
                                        onChange={handleEditChange}
                                    >
                                        <option value="Потребител">{t('adminResidents.roleUser')}</option>
                                        <option value="Домоуправител">
                                            {t('adminResidents.roleManager')}
                                        </option>
                                        <option value="Админ">{t('adminResidents.roleAdmin')}</option>
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
                                        {t('adminResidents.labelActiveProfile')}
                                    </label>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="cancel-btn"
                                    onClick={closeEdit}
                                >
                                    {t('adminResidents.btnCancel')}
                                </button>
                                <button type="submit" className="save-btn">
                                    {t('adminResidents.btnSaveChanges')}
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
