import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./AdminResidents.css";
import { getAdminResidents, isAuthenticated } from "../services/apiService";

const AdminResidents = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const tr = useCallback(
    (key, defaultValue, options = {}) => t(key, { defaultValue, ...options }),
    [t]
  );

  const [residents, setResidents] = useState([]);
  const [entrances, setEntrances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("all");
  const [entranceFilter, setEntranceFilter] = useState("all");
  const [onlyDebtors, setOnlyDebtors] = useState(false);

  const [editForm, setEditForm] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreatingResident, setIsCreatingResident] = useState(false);

  const [entranceModalOpen, setEntranceModalOpen] = useState(false);
  const [entranceEditMode, setEntranceEditMode] = useState(false);
  const [selectedEntranceId, setSelectedEntranceId] = useState(null);
  const [entranceForm, setEntranceForm] = useState({
    building: "",
    address: "",
    entrance: "",
    floorsCount: 1,
    apartmentsPerFloor: 2,
    apartmentLayout: "1,2",
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
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
        console.error("Failed to fetch residents:", err);
        setError(tr("adminResidents.fetchError", "Грешка при зареждане на данните"));
      } finally {
        setLoading(false);
      }
    };

    fetchResidents();
  }, [navigate, tr]);

  useEffect(() => {
    const grouped = {};

    residents.forEach((r) => {
      const building = r.building || "";
      const entrance = r.entrance || "";

      if (!building || !entrance) return;

      const key = `${building}__${entrance}`;

      if (!grouped[key]) {
        grouped[key] = {
          id: key,
          building,
          address: building,
          entrance,
          apartmentsMap: new Map(),
        };
      }

      const apartmentNumber = String(r.apartment || "").trim();

      if (apartmentNumber) {
        grouped[key].apartmentsMap.set(apartmentNumber, {
          number: apartmentNumber,
          family: r.name || tr("adminResidents.roleUser", "Потребител"),
          amount: Number(r.totalDebt || 0),
          status:
            Number(r.totalDebt || 0) > 0
              ? Number(r.balance || 0) > 0
                ? "pending"
                : "overdue"
              : "paid",
        });
      }
    });

    const generatedEntrances = Object.values(grouped).map((group) => {
      const apartmentNumbers = [...group.apartmentsMap.keys()]
        .map((n) => Number(n))
        .filter((n) => !Number.isNaN(n))
        .sort((a, b) => a - b);

      const apartmentLayout =
        apartmentNumbers.length > 0
          ? apartmentNumbers.slice(0, Math.min(4, apartmentNumbers.length)).join(",")
          : "1,2";

      const apartmentsPerFloor = apartmentLayout
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean).length || 2;

      const floorsMap = new Map();

      apartmentNumbers.forEach((num) => {
        const floor = Math.ceil(num / apartmentsPerFloor);
        if (!floorsMap.has(floor)) floorsMap.set(floor, []);
        floorsMap.get(floor).push(
          group.apartmentsMap.get(String(num)) || group.apartmentsMap.get(num)
        );
      });

      const floors = [...floorsMap.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([floor, apartments]) => ({
          floor,
          apartments,
        }));

      return {
        id: group.id,
        building: group.building,
        address: group.address,
        entrance: group.entrance,
        floorsCount: floors.length || 1,
        apartmentsPerFloor,
        apartmentLayout,
        floors:
          floors.length > 0
            ? floors
            : [
                {
                  floor: 1,
                  apartments: [],
                },
              ],
      };
    });

    setEntrances((prev) => {
      if (prev.length === 0) return generatedEntrances;

      const manualOnly = prev.filter(
        (item) => !generatedEntrances.some((g) => g.id === item.id)
      );

      const merged = generatedEntrances.map((generated) => {
        const existing = prev.find((p) => p.id === generated.id);
        return existing || generated;
      });

      return [...merged, ...manualOnly];
    });
  }, [residents, tr]);

  const buildings = useMemo(() => {
    const fromResidents = residents.map((r) => r.building).filter(Boolean);
    const fromEntrances = entrances.map((e) => e.building).filter(Boolean);
    return [...new Set([...fromResidents, ...fromEntrances])];
  }, [residents, entrances]);

  const entrancesForFilter = useMemo(() => {
    return [...new Set(residents.map((r) => r.entrance).filter(Boolean))];
  }, [residents]);

  const availableBuildingsForResidents = useMemo(() => {
    return [...new Set(entrances.map((e) => e.building).filter(Boolean))];
  }, [entrances]);

  const availableEntrancesForSelectedBuilding = useMemo(() => {
    if (!editForm?.building) return [];
    return entrances.filter((e) => e.building === editForm.building);
  }, [entrances, editForm?.building]);

  const availableApartmentsForSelectedEntrance = useMemo(() => {
    if (!editForm?.building || !editForm?.entrance) return [];

    const matchedEntrance = entrances.find(
      (e) => e.building === editForm.building && e.entrance === editForm.entrance
    );

    if (!matchedEntrance) return [];

    return matchedEntrance.floors
      .flatMap((floor) => floor.apartments)
      .map((ap) => String(ap.number))
      .sort((a, b) => Number(a) - Number(b));
  }, [entrances, editForm?.building, editForm?.entrance]);

  const openEdit = (resident) => {
    setEditForm({ ...resident });
    setIsEditing(true);
    setIsCreatingResident(false);
  };

  const closeEdit = () => {
    setEditForm(null);
    setIsEditing(false);
    setIsCreatingResident(false);
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;

    setEditForm((prev) => {
      const nextValue =
        type === "checkbox"
          ? checked
          : name === "residentsCount" || name === "balance" || name === "totalDebt"
          ? Number(value)
          : value;

      const next = {
        ...prev,
        [name]: nextValue,
      };

      if (name === "building") {
        next.entrance = "";
        next.apartment = "";
      }

      if (name === "entrance") {
        next.apartment = "";
      }

      return next;
    });
  };

  const saveResident = (e) => {
    e.preventDefault();
    if (!editForm) return;

    if (!editForm.building || !editForm.entrance || !editForm.apartment) {
      alert(
        tr(
          "adminResidents.alertResidentRequiresEntrance",
          "Първо избери съществуващи сграда, вход и апартамент."
        )
      );
      return;
    }

    const selectedEntrance = entrances.find(
      (entry) =>
        entry.building === editForm.building && entry.entrance === editForm.entrance
    );

    if (!selectedEntrance) {
      alert(
        tr(
          "adminResidents.alertEntranceMissing",
          "Избраният вход не съществува. Първо създай вход."
        )
      );
      return;
    }

    const apartmentExists = selectedEntrance.floors.some((floor) =>
      floor.apartments.some((ap) => String(ap.number) === String(editForm.apartment))
    );

    if (!apartmentExists) {
      alert(
        tr(
          "adminResidents.alertApartmentMissing",
          "Избраният апартамент не съществува в този вход."
        )
      );
      return;
    }

    setResidents((prev) => prev.map((r) => (r.id === editForm.id ? editForm : r)));
    closeEdit();
    alert(tr("adminResidents.alertProfileUpdated", "Профилът е обновен успешно."));
  };

  const addNewResident = () => {
    if (entrances.length === 0) {
      alert(
        tr(
          "adminResidents.alertCreateEntranceFirst",
          "Първо трябва да създадеш вход, преди да добавиш нов профил."
        )
      );
      return;
    }

    const firstEntrance = entrances[0];
    const firstApartment =
      firstEntrance?.floors?.flatMap((floor) => floor.apartments)?.[0]?.number || "";

    const newId = residents.length ? Math.max(...residents.map((r) => r.id)) + 1 : 1;

    const newResident = {
      id: newId,
      name: tr("adminResidents.newResidentName", "Нов живущ"),
      email: "",
      building: firstEntrance?.building || "",
      entrance: firstEntrance?.entrance || "",
      apartment: firstApartment ? String(firstApartment) : "",
      clientNumber: "",
      residentsCount: 1,
      balance: 0,
      totalDebt: 0,
      role: tr("adminResidents.roleUser", "Потребител"),
      isActive: true,
    };

    setResidents((prev) => [newResident, ...prev]);
    setEditForm(newResident);
    setIsEditing(true);
    setIsCreatingResident(true);
  };

  const resetPassword = (resident) => {
    alert(
      tr(
        "adminResidents.alertResetPassword",
        "Тук можеш да извикаш бекенд за ресет на паролата за: "
      ) + resident.email
    );
  };

  const parseApartmentLayout = (layoutString) => {
    const layout = layoutString
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (layout.length === 0) return ["1", "2"];
    return layout;
  };

  const buildFloorsFromForm = (form) => {
    const floorsCount = Number(form.floorsCount) || 1;
    const layout = parseApartmentLayout(form.apartmentLayout);

    const floors = [];

    for (let floor = floorsCount; floor >= 1; floor -= 1) {
      const apartments = layout.map((suffix, index) => {
        const apartmentNumber = `${floor}${suffix}`;

        return {
          number: apartmentNumber,
          family: tr("adminResidents.newResidentName", "Нов живущ"),
          amount: 0,
          status: "paid",
          sortOrder: index,
        };
      });

      floors.push({
        floor,
        apartments,
      });
    }

    return floors;
  };

  const openNewEntranceModal = () => {
    setEntranceEditMode(false);
    setSelectedEntranceId(null);
    setEntranceForm({
      building: "",
      address: "",
      entrance: "",
      floorsCount: 1,
      apartmentsPerFloor: 2,
      apartmentLayout: "1,2",
    });
    setEntranceModalOpen(true);
  };

  const openEditEntranceModal = (entrance) => {
    setEntranceEditMode(true);
    setSelectedEntranceId(entrance.id);
    setEntranceForm({
      building: entrance.building || "",
      address: entrance.address || entrance.building || "",
      entrance: entrance.entrance || "",
      floorsCount: entrance.floorsCount || entrance.floors?.length || 1,
      apartmentsPerFloor:
        entrance.apartmentsPerFloor ||
        parseApartmentLayout(entrance.apartmentLayout || "1,2").length,
      apartmentLayout: entrance.apartmentLayout || "1,2",
    });
    setEntranceModalOpen(true);
  };

  const closeEntranceModal = () => {
    setEntranceModalOpen(false);
    setEntranceEditMode(false);
    setSelectedEntranceId(null);
  };

  const handleEntranceFormChange = (e) => {
    const { name, value } = e.target;

    setEntranceForm((prev) => {
      const next = {
        ...prev,
        [name]:
          name === "floorsCount" || name === "apartmentsPerFloor" ? Number(value) : value,
      };

      if (name === "apartmentsPerFloor") {
        const count = Math.max(1, Number(value) || 1);
        next.apartmentLayout = Array.from({ length: count }, (_, i) => String(i + 1)).join(",");
      }

      return next;
    });
  };

  const saveEntrance = (e) => {
    e.preventDefault();

    const id =
      selectedEntranceId ||
      `${entranceForm.building || entranceForm.address}__${entranceForm.entrance}`;

    const newEntrance = {
      id,
      building: entranceForm.building.trim(),
      address: entranceForm.address.trim() || entranceForm.building.trim(),
      entrance: entranceForm.entrance.trim(),
      floorsCount: Number(entranceForm.floorsCount) || 1,
      apartmentsPerFloor:
        parseApartmentLayout(entranceForm.apartmentLayout).length ||
        Number(entranceForm.apartmentsPerFloor) ||
        2,
      apartmentLayout: entranceForm.apartmentLayout,
      floors: buildFloorsFromForm(entranceForm),
    };

    if (entranceEditMode) {
      setEntrances((prev) =>
        prev.map((item) => (item.id === selectedEntranceId ? newEntrance : item))
      );
    } else {
      setEntrances((prev) => [newEntrance, ...prev]);
    }

    closeEntranceModal();
    alert(
      entranceEditMode
        ? tr("adminResidents.alertEntranceUpdated", "Входът е обновен успешно.")
        : tr("adminResidents.alertEntranceCreated", "Входът е създаден успешно.")
    );
  };

  const filteredResidents = useMemo(() => {
    return residents.filter((r) => {
      if (onlyDebtors && r.totalDebt <= 0) return false;

      if (
        buildingFilter !== "all" &&
        (r.building || "").toLowerCase() !== buildingFilter.toLowerCase()
      ) {
        return false;
      }

      if (
        entranceFilter !== "all" &&
        (r.entrance || "").toLowerCase() !== entranceFilter.toLowerCase()
      ) {
        return false;
      }

      if (search) {
        const text = `${r.name} ${r.email} ${r.apartment} ${r.clientNumber}`.toLowerCase();
        if (!text.includes(search.toLowerCase())) return false;
      }

      return true;
    });
  }, [residents, search, buildingFilter, entranceFilter, onlyDebtors]);

  const totalUsers = residents.length;
  const activeUsers = residents.filter((r) => r.isActive).length;
  const totalDebtSum = residents.reduce((sum, r) => sum + (r.totalDebt || 0), 0);
  const totalEntrances = entrances.length;

  if (loading) {
    return (
      <main className="admin-page">
        <p style={{ textAlign: "center", padding: "2rem" }}>
          {tr("adminResidents.loading", "Зареждане...")}
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="admin-page">
        <p style={{ color: "red", textAlign: "center", padding: "2rem" }}>{error}</p>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <h1>{tr("adminResidents.title", "Админ панел — Профили на живущите")}</h1>
          <p className="admin-subtitle">
            {tr(
              "adminResidents.subtitle",
              "Управлявайте профилите, данните и достъпа на всички живущи."
            )}
          </p>
        </div>

        <div className="admin-header-actions">
          <button className="admin-add-btn admin-add-btn--secondary" onClick={openNewEntranceModal}>
            {tr("adminResidents.btnAddEntrance", "+ Нов вход")}
          </button>
          <button className="admin-add-btn" onClick={addNewResident}>
            {tr("adminResidents.btnAddResident", "+ Нов профил")}
          </button>
        </div>
      </header>

      <section className="admin-section admin-stats">
        <div className="admin-stat-card">
          <span className="label">
            {tr("adminResidents.statTotalProfiles", "Общ брой профили")}
          </span>
          <span className="value">{totalUsers}</span>
        </div>

        <div className="admin-stat-card">
          <span className="label">
            {tr("adminResidents.statActiveProfiles", "Активни профили")}
          </span>
          <span className="value">{activeUsers}</span>
        </div>

        <div className="admin-stat-card">
          <span className="label">
            {tr("adminResidents.statTotalDebt", "Общ размер на задълженията")}
          </span>
          <span className="value">{totalDebtSum.toFixed(2)} лв.</span>
        </div>

        <div className="admin-stat-card">
          <span className="label">
            {tr("adminResidents.statEntrances", "Общ брой входове")}
          </span>
          <span className="value">{totalEntrances}</span>
        </div>
      </section>

      <section className="admin-section">
        <div className="section-title-row">
          <div>
            <h2>{tr("adminResidents.entrancesTitle", "Входове и структура")}</h2>
            <p className="section-subtitle">
              {tr(
                "adminResidents.entrancesSubtitle",
                "Всеки вход принадлежи към сграда и има собствена конфигурация от етажи и апартаменти."
              )}
            </p>
          </div>
        </div>

        {entrances.length === 0 ? (
          <div className="empty-state">
            {tr("adminResidents.noEntrances", "Все още няма създадени входове.")}
          </div>
        ) : (
          <div className="entrances-grid">
            {entrances.map((entrance) => {
              const totalApartments = entrance.floors.reduce(
                (sum, floor) => sum + floor.apartments.length,
                0
              );

              return (
                <div key={entrance.id} className="entrance-card">
                  <div className="entrance-card__top">
                    <div>
                      <h3>
                        {tr("adminResidents.entranceLabel", "Вход")} {entrance.entrance}
                      </h3>
                      <p>{entrance.address || entrance.building}</p>
                    </div>

                    <button
                      className="small-btn"
                      onClick={() => openEditEntranceModal(entrance)}
                    >
                      {tr("adminResidents.btnEditEntrance", "Редактирай")}
                    </button>
                  </div>

                  <div className="entrance-card__meta">
                    <span>
                      {tr("adminResidents.labelBuilding", "Сграда")}:{" "}
                      <strong>{entrance.building || "—"}</strong>
                    </span>
                    <span>
                      {tr("adminResidents.labelFloors", "Етажи")}:{" "}
                      <strong>{entrance.floorsCount}</strong>
                    </span>
                    <span>
                      {tr("adminResidents.labelTotalApartments", "Апартаменти")}:{" "}
                      <strong>{totalApartments}</strong>
                    </span>
                    <span>
                      {tr("adminResidents.labelLayout", "Разположение")}:{" "}
                      <strong>{entrance.apartmentLayout}</strong>
                    </span>
                  </div>

                  <div className="entrance-structure">
                    {entrance.floors.map((floor) => (
                      <div key={`${entrance.id}-${floor.floor}`} className="entrance-floor-row">
                        <div className="entrance-floor-label">
                          {tr("entrance.floorTitle", "Етаж {{floor}}", {
                            floor: floor.floor,
                          })}
                        </div>

                        <div className="entrance-floor-apts">
                          {floor.apartments.map((apt) => (
                            <span key={`${entrance.id}-${floor.floor}-${apt.number}`} className="apt-pill">
                              {tr("entrance.aptNumber", "Ап. {{number}}", {
                                number: apt.number,
                              })}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="admin-section">
        <div className="section-title-row">
          <div>
            <h2>{tr("adminResidents.profilesTitle", "Профили на живущите")}</h2>
            <p className="section-subtitle">
              {tr(
                "adminResidents.profilesSubtitle",
                "Управлявайте профилите, достъпа и основните данни на живущите."
              )}
            </p>
          </div>
        </div>

        <div className="admin-filters">
          <div className="filter-group">
            <label>{tr("adminResidents.filterSearchLabel", "Търсене")}</label>
            <input
              type="text"
              placeholder={tr(
                "adminResidents.filterSearchPlaceholder",
                "Име, имейл, апартамент, клиентски №..."
              )}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>{tr("adminResidents.filterBuildingLabel", "Сграда")}</label>
            <select value={buildingFilter} onChange={(e) => setBuildingFilter(e.target.value)}>
              <option value="all">{tr("adminResidents.filterAll", "Всички")}</option>
              {buildings.map((building) => (
                <option key={building} value={building}>
                  {building}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>{tr("adminResidents.filterEntranceLabel", "Вход")}</label>
            <select value={entranceFilter} onChange={(e) => setEntranceFilter(e.target.value)}>
              <option value="all">{tr("adminResidents.filterAll", "Всички")}</option>
              {entrancesForFilter.map((entrance) => (
                <option key={entrance} value={entrance}>
                  {entrance}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={onlyDebtors}
                onChange={(e) => setOnlyDebtors(e.target.checked)}
              />
              {tr("adminResidents.filterOnlyDebtors", "Само със задължения")}
            </label>
          </div>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{tr("adminResidents.thName", "Име")}</th>
                <th>{tr("adminResidents.thEmail", "Имейл")}</th>
                <th>{tr("adminResidents.thBuilding", "Сграда")}</th>
                <th>{tr("adminResidents.thEntrance", "Вход")}</th>
                <th>{tr("adminResidents.thAp", "Ап.")}</th>
                <th>{tr("adminResidents.thClientNum", "Кл. №")}</th>
                <th>{tr("adminResidents.thResidents", "Живущи")}</th>
                <th>{tr("adminResidents.thBalance", "Баланс")}</th>
                <th>{tr("adminResidents.thDebt", "Задължение")}</th>
                <th>{tr("adminResidents.thStatus", "Статус")}</th>
                <th>{tr("adminResidents.thActions", "Действия")}</th>
              </tr>
            </thead>

            <tbody>
              {filteredResidents.length === 0 ? (
                <tr>
                  <td colSpan="11" className="no-data">
                    {tr(
                      "adminResidents.noData",
                      "Няма намерени профили по зададените критерии."
                    )}
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
                    <td>{Number(r.balance || 0).toFixed(2)} лв.</td>
                    <td>{Number(r.totalDebt || 0).toFixed(2)} лв.</td>
                    <td>
                      <span className={`status-pill ${r.isActive ? "active" : "inactive"}`}>
                        {r.isActive
                          ? tr("adminResidents.statusActive", "Активен")
                          : tr("adminResidents.statusBlocked", "Блокиран")}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="small-btn" onClick={() => openEdit(r)}>
                          {tr("adminResidents.btnEdit", "Редактирай")}
                        </button>
                        <button
                          className="small-btn secondary"
                          onClick={() => resetPassword(r)}
                        >
                          {tr("adminResidents.btnResetPassword", "Ресет парола")}
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
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="admin-close-btn" onClick={closeEdit}>
              ×
            </button>

            <h2>
              {isCreatingResident
                ? tr("adminResidents.modalNewResidentTitle", "Нов профил")
                : tr("adminResidents.modalTitle", "Редакция на профил")}
            </h2>

            <form onSubmit={saveResident} className="admin-edit-form">
              <div className="form-row">
                <div className="form-group">
                  <label>{tr("adminResidents.labelName", "Име")}</label>
                  <input
                    type="text"
                    name="name"
                    value={editForm.name}
                    onChange={handleEditChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>{tr("adminResidents.labelEmail", "Имейл")}</label>
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
                  <label>{tr("adminResidents.labelBuilding", "Сграда")}</label>
                  <select
                    name="building"
                    value={editForm.building}
                    onChange={handleEditChange}
                    required
                  >
                    <option value="">
                      {tr("adminResidents.selectBuilding", "Избери сграда")}
                    </option>
                    {availableBuildingsForResidents.map((building) => (
                      <option key={building} value={building}>
                        {building}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group small">
                  <label>{tr("adminResidents.labelEntrance", "Вход")}</label>
                  <select
                    name="entrance"
                    value={editForm.entrance}
                    onChange={handleEditChange}
                    required
                    disabled={!editForm.building}
                  >
                    <option value="">
                      {tr("adminResidents.selectEntrance", "Избери вход")}
                    </option>
                    {availableEntrancesForSelectedBuilding.map((entrance) => (
                      <option key={entrance.id} value={entrance.entrance}>
                        {entrance.entrance}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group small">
                  <label>{tr("adminResidents.labelApartment", "Апартамент")}</label>
                  <select
                    name="apartment"
                    value={editForm.apartment}
                    onChange={handleEditChange}
                    required
                    disabled={!editForm.entrance}
                  >
                    <option value="">
                      {tr("adminResidents.selectApartment", "Избери апартамент")}
                    </option>
                    {availableApartmentsForSelectedEntrance.map((apartment) => (
                      <option key={apartment} value={apartment}>
                        {apartment}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group small">
                  <label>{tr("adminResidents.labelResidentsCount", "Живущи")}</label>
                  <input
                    type="number"
                    name="residentsCount"
                    min="1"
                    value={editForm.residentsCount}
                    onChange={handleEditChange}
                  />
                </div>

                <div className="form-group small">
                  <label>{tr("adminResidents.labelBalance", "Баланс (лв.)")}</label>
                  <input
                    type="number"
                    step="0.01"
                    name="balance"
                    value={editForm.balance}
                    onChange={handleEditChange}
                  />
                </div>

                <div className="form-group small">
                  <label>{tr("adminResidents.labelTotalDebt", "Задължение (лв.)")}</label>
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
                  <label>{tr("adminResidents.labelClientNum", "Клиентски номер")}</label>
                  <input
                    type="text"
                    name="clientNumber"
                    value={editForm.clientNumber}
                    onChange={handleEditChange}
                  />
                </div>

                <div className="form-group small">
                  <label>{tr("adminResidents.labelRole", "Роля")}</label>
                  <select name="role" value={editForm.role} onChange={handleEditChange}>
                    <option value="Потребител">
                      {tr("adminResidents.roleUser", "Потребител")}
                    </option>
                    <option value="Домоуправител">
                      {tr("adminResidents.roleManager", "Домоуправител")}
                    </option>
                    <option value="Админ">{tr("adminResidents.roleAdmin", "Админ")}</option>
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
                    {tr("adminResidents.labelActiveProfile", "Активен профил")}
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={closeEdit}>
                  {tr("adminResidents.btnCancel", "Отказ")}
                </button>
                <button type="submit" className="save-btn">
                  {tr("adminResidents.btnSaveChanges", "Запази промените")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {entranceModalOpen && (
        <div className="admin-modal" onClick={closeEntranceModal}>
          <div
            className="admin-modal-content admin-modal-content--wide"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="admin-close-btn" onClick={closeEntranceModal}>
              ×
            </button>

            <h2>
              {entranceEditMode
                ? tr("adminResidents.modalEditEntranceTitle", "Редакция на вход")
                : tr("adminResidents.modalNewEntranceTitle", "Нов вход")}
            </h2>

            <form onSubmit={saveEntrance} className="admin-edit-form">
              <div className="form-row">
                <div className="form-group">
                  <label>{tr("adminResidents.labelBuilding", "Сграда")}</label>
                  <input
                    type="text"
                    name="building"
                    value={entranceForm.building}
                    onChange={handleEntranceFormChange}
                    placeholder={tr("adminResidents.placeholderBuilding", "Напр. Младост 3, бл. 325")}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>{tr("adminResidents.labelAddress", "Адрес")}</label>
                  <input
                    type="text"
                    name="address"
                    value={entranceForm.address}
                    onChange={handleEntranceFormChange}
                    placeholder={tr("adminResidents.placeholderAddress", "Пълен адрес на входа")}
                    required
                  />
                </div>

                <div className="form-group small">
                  <label>{tr("adminResidents.labelEntrance", "Вход")}</label>
                  <input
                    type="text"
                    name="entrance"
                    value={entranceForm.entrance}
                    onChange={handleEntranceFormChange}
                    placeholder={tr("adminResidents.placeholderEntrance", "А")}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group small">
                  <label>{tr("adminResidents.labelFloors", "Брой етажи")}</label>
                  <input
                    type="number"
                    min="1"
                    name="floorsCount"
                    value={entranceForm.floorsCount}
                    onChange={handleEntranceFormChange}
                    required
                  />
                </div>

                <div className="form-group small">
                  <label>{tr("adminResidents.labelApartmentsPerFloor", "Апартаменти на етаж")}</label>
                  <input
                    type="number"
                    min="1"
                    name="apartmentsPerFloor"
                    value={entranceForm.apartmentsPerFloor}
                    onChange={handleEntranceFormChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    {tr(
                      "adminResidents.labelLayout",
                      "Разположение на апартаментите по етаж"
                    )}
                  </label>
                  <input
                    type="text"
                    name="apartmentLayout"
                    value={entranceForm.apartmentLayout}
                    onChange={handleEntranceFormChange}
                    placeholder={tr("adminResidents.placeholderLayout", "Пример: 1,2,3,4")}
                    required
                  />
                </div>
              </div>

              <div className="entrance-preview">
                <h3>{tr("adminResidents.previewTitle", "Преглед на структурата")}</h3>
                <div className="entrance-preview-box">
                  {buildFloorsFromForm(entranceForm).map((floor) => (
                    <div key={`preview-${floor.floor}`} className="entrance-floor-row">
                      <div className="entrance-floor-label">
                        {tr("entrance.floorTitle", "Етаж {{floor}}", {
                          floor: floor.floor,
                        })}
                      </div>
                      <div className="entrance-floor-apts">
                        {floor.apartments.map((apt) => (
                          <span key={`preview-${floor.floor}-${apt.number}`} className="apt-pill">
                            {tr("entrance.aptNumber", "Ап. {{number}}", {
                              number: apt.number,
                            })}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={closeEntranceModal}>
                  {tr("adminResidents.btnCancel", "Отказ")}
                </button>
                <button type="submit" className="save-btn">
                  {entranceEditMode
                    ? tr("adminResidents.btnSaveEntrance", "Запази входа")
                    : tr("adminResidents.btnCreateEntrance", "Създай вход")}
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