import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./Events.css";
import {
  getMeetings,
  createMeeting,
  deleteMeeting,
  getUser,
  isAuthenticated,
} from "../services/apiService";

const PROVIDERS = [
  { value: "jitsi", bg: "Вградена видеостая (Jitsi)", en: "Built-in video room (Jitsi)" },
  { value: "zoom", bg: "Zoom", en: "Zoom" },
  { value: "meet", bg: "Google Meet", en: "Google Meet" },
  { value: "teams", bg: "Microsoft Teams", en: "Microsoft Teams" },
  { value: "other", bg: "Друг линк", en: "Other link" },
];

const Events = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.resolvedLanguage === "bg" ? "bg" : "en";

  const user = getUser();
  const isStaff = !!user && (user.role === "admin" || user.role === "manager");

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState(null); // meeting currently joined (embedded)
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    title: "",
    description: "",
    agenda: "",
    date: "",
    time: "",
    location: "",
    online_provider: "jitsi",
    online_url: "",
  };
  const [form, setForm] = useState(emptyForm);

  const providerLabel = (v) => {
    const p = PROVIDERS.find((x) => x.value === v);
    return p ? p[lang] : v;
  };
  const fmt = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(lang === "bg" ? "bg-BG" : "en-US");
  };

  const load = useCallback(async () => {
    try {
      const data = await getMeetings();
      if (data && data.error) {
        setError(data.error);
        return;
      }
      if (data && Array.isArray(data.meetings)) setMeetings(data.meetings);
    } catch (err) {
      console.error("Failed to load meetings:", err);
      setError(t("events.loadError", { defaultValue: "Грешка при зареждане на събитията." }));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }
    load();
  }, [navigate, load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (form.online_provider !== "jitsi" && !form.online_url.trim()) {
      alert(t("events.linkRequired", { defaultValue: "Моля, въведете линк за онлайн срещата." }));
      return;
    }
    setSaving(true);
    try {
      let dateIso = "";
      if (form.date) {
        const d = new Date(`${form.date}T${form.time || "00:00"}`);
        if (!Number.isNaN(d.getTime())) dateIso = d.toISOString();
      }
      const res = await createMeeting({
        title: form.title.trim(),
        description: form.description.trim(),
        agenda: form.agenda.trim(),
        date: dateIso,
        location: form.location.trim(),
        online_provider: form.online_provider,
        online_url: form.online_url.trim(),
      });
      if (res && res.success) {
        setForm(emptyForm);
        setShowForm(false);
        await load();
      } else {
        alert(res?.message || t("events.saveError", { defaultValue: "Грешка при създаване." }));
      }
    } catch (err) {
      console.error("Create meeting error:", err);
      alert(t("events.saveError", { defaultValue: "Грешка при създаване." }));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t("events.confirmDelete", { defaultValue: "Да изтрия ли тази среща?" }))) return;
    try {
      const res = await deleteMeeting(id);
      if (res && res.success) await load();
    } catch (err) {
      console.error("Delete meeting error:", err);
    }
  };

  const join = (m) => {
    if (m.online_provider === "jitsi") {
      setActive(m); // embed in-page
    } else if (m.online_url) {
      window.open(m.online_url, "_blank", "noopener,noreferrer");
    }
  };

  const now = Date.now();
  const upcoming = meetings.filter((m) => m.date && new Date(m.date).getTime() >= now);
  const past = meetings.filter((m) => !m.date || new Date(m.date).getTime() < now);

  const renderCard = (m) => (
    <div className="meeting-card" key={m.id}>
      <div className="meeting-card__head">
        <h3>{m.title}</h3>
        {m.date && <span className="meeting-date">{fmt(m.date)}</span>}
      </div>
      {m.description && <p className="meeting-desc">{m.description}</p>}
      {m.location && (
        <p className="meeting-meta">
          📍 {m.location}
        </p>
      )}
      {m.agenda && (
        <div className="meeting-agenda">
          <strong>{t("events.agenda", { defaultValue: "Дневен ред" })}:</strong>
          <pre>{m.agenda}</pre>
        </div>
      )}
      <div className="meeting-card__actions">
        {m.online_url && (
          <button type="button" className="meeting-join-btn" onClick={() => join(m)}>
            {m.online_provider === "jitsi"
              ? t("events.joinHere", { defaultValue: "Включи се онлайн (тук)" })
              : t("events.joinExternal", { defaultValue: "Включи се онлайн" })}
          </button>
        )}
        <span className="meeting-provider">{providerLabel(m.online_provider)}</span>
        {isStaff && (
          <button type="button" className="meeting-delete-btn" onClick={() => handleDelete(m.id)}>
            {t("events.delete", { defaultValue: "Изтрий" })}
          </button>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <main className="events-page">
        <p className="events-state">{t("events.loading", { defaultValue: "Зареждане..." })}</p>
      </main>
    );
  }

  return (
    <main className="events-page">
      <header className="events-header">
        <div>
          <h1>{t("events.title", { defaultValue: "Събития и срещи" })}</h1>
          <p>
            {t("events.subtitle", {
              defaultValue:
                "Общи събрания и срещи. Ако не можете да присъствате на място, включете се онлайн.",
            })}
          </p>
        </div>
        {isStaff && (
          <button type="button" className="events-new-btn" onClick={() => setShowForm((v) => !v)}>
            {showForm
              ? t("events.cancel", { defaultValue: "Отказ" })
              : t("events.newMeeting", { defaultValue: "+ Нова среща" })}
          </button>
        )}
      </header>

      {error && <div className="events-alert">{error}</div>}

      {isStaff && showForm && (
        <section className="events-card">
          <h2>{t("events.newMeeting", { defaultValue: "Нова среща" })}</h2>
          <form className="events-form" onSubmit={handleCreate}>
            <label>
              {t("events.fieldTitle", { defaultValue: "Заглавие" })}
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </label>
            <label>
              {t("events.fieldDescription", { defaultValue: "Описание" })}
              <textarea
                rows="2"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </label>
            <div className="events-form-row">
              <label>
                {t("events.fieldDate", { defaultValue: "Дата" })}
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </label>
              <label>
                {t("events.fieldTime", { defaultValue: "Час" })}
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                />
              </label>
              <label>
                {t("events.fieldLocation", { defaultValue: "Място" })}
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                />
              </label>
            </div>
            <label>
              {t("events.fieldAgenda", { defaultValue: "Дневен ред" })}
              <textarea
                rows="3"
                value={form.agenda}
                onChange={(e) => setForm((f) => ({ ...f, agenda: e.target.value }))}
              />
            </label>
            <div className="events-form-row">
              <label>
                {t("events.fieldProvider", { defaultValue: "Онлайн платформа" })}
                <select
                  value={form.online_provider}
                  onChange={(e) => setForm((f) => ({ ...f, online_provider: e.target.value }))}
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p[lang]}
                    </option>
                  ))}
                </select>
              </label>
              {form.online_provider !== "jitsi" && (
                <label className="events-form-grow">
                  {t("events.fieldLink", { defaultValue: "Линк за срещата" })}
                  <input
                    type="url"
                    placeholder="https://..."
                    value={form.online_url}
                    onChange={(e) => setForm((f) => ({ ...f, online_url: e.target.value }))}
                  />
                </label>
              )}
            </div>
            {form.online_provider === "jitsi" && (
              <p className="events-hint">
                {t("events.jitsiHint", {
                  defaultValue:
                    "Ще се създаде автоматично вградена видеостая — живущите се включват директно от платформата.",
                })}
              </p>
            )}
            <button type="submit" className="events-new-btn" disabled={saving}>
              {saving
                ? t("events.saving", { defaultValue: "Запазване..." })
                : t("events.create", { defaultValue: "Създай среща" })}
            </button>
          </form>
        </section>
      )}

      <section className="events-section">
        <h2>{t("events.upcoming", { defaultValue: "Предстоящи" })}</h2>
        {upcoming.length === 0 ? (
          <p className="events-state">{t("events.noUpcoming", { defaultValue: "Няма предстоящи срещи." })}</p>
        ) : (
          <div className="meetings-grid">{upcoming.map(renderCard)}</div>
        )}
      </section>

      {past.length > 0 && (
        <section className="events-section">
          <h2>{t("events.past", { defaultValue: "Минали" })}</h2>
          <div className="meetings-grid">{past.map(renderCard)}</div>
        </section>
      )}

      {active && (
        <div className="meeting-modal" onClick={() => setActive(null)}>
          <div className="meeting-modal__content" onClick={(e) => e.stopPropagation()}>
            <div className="meeting-modal__bar">
              <span>{active.title}</span>
              <button type="button" onClick={() => setActive(null)}>
                ✕ {t("events.leave", { defaultValue: "Напусни" })}
              </button>
            </div>
            <iframe
              title={active.title}
              src={active.online_url}
              allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
              className="meeting-iframe"
            />
          </div>
        </div>
      )}
    </main>
  );
};

export default Events;
